#!/usr/bin/env python3
"""
Append a content-derived version to every published asset URL.

Why this exists
---------------
Photos in `images/` are replaced in place, keeping the same file name, so
the URL of a photo never changes when the photo changes. Browsers cache
`/images/*` for a week, so a visitor keeps seeing the previous photo long
after the new one has been deployed. Nothing in the deployment is wrong:
the origin and the Netlify edge already serve the new bytes.

The fix is to publish asset URLs with a version token derived from the
content of the file itself (`<file>?v=<sha256 prefix>`):

  * the token changes exactly when the file changes, so a replaced photo
    or script is a new URL and every browser fetches it;
  * an unchanged file keeps its URL, so it stays cached and fast;
  * it is deterministic, not random, and it is applied to every reference
    at build time, so no file in the repository has to be edited.

The same treatment is given to the stylesheets and scripts in `assets/`
and `js/`, because a replaced script that a browser keeps for a week
breaks the page just as badly as a replaced photo.

Only the build output is rewritten. The sources (and therefore the CMS)
keep clean, name-based paths such as `/images/director.jpg`.

The versioned files themselves are not rewritten: their token has to be the
hash of their own bytes, so nothing may be written into them. References
that live inside a script are comments and fallbacks; photos are always
revalidated (see netlify.toml), so a fallback can never be stale.

Usage: version-assets.py <dist-dir>
"""

import hashlib
import os
import re
import sys

TEXT_EXTENSIONS = {
    ".html", ".css", ".js", ".mjs", ".json", ".yml", ".yaml",
    ".xml", ".svg", ".txt", ".md",
}
HASH_LENGTH = 10

# Directories whose files are published under a stable URL and may be
# replaced in place, so they need a version token.
VERSIONED_DIRS = ("images", "assets", "js")


def file_hash(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()[:HASH_LENGTH]


def collect_files(dist):
    """Map every published file that needs a token to that token.

    The key is the path the file is published under, without a leading
    slash: `images/director.jpg`, `assets/js/pages.js`, `js/main.js`.
    """
    versions = {}
    for folder in VERSIONED_DIRS:
        base = os.path.join(dist, folder)
        if not os.path.isdir(base):
            continue
        for root, dirs, files in os.walk(base):
            dirs[:] = [d for d in dirs if not d.startswith(".")]
            for name in sorted(files):
                if name.startswith("."):
                    continue
                path = os.path.join(root, name)
                if not os.path.isfile(path):
                    continue
                rel = os.path.relpath(path, dist).replace(os.sep, "/")
                versions[rel] = file_hash(path)
    return versions


def build_pattern(versions):
    """Match any reference to a published file, with or without a host."""
    names = sorted(versions, key=len, reverse=True)
    if not names:
        return None
    alternation = "|".join(re.escape(name) for name in names)
    # [host][/]<path>  -- the name must not be followed by a query string, a
    # fragment or a further name character, so we never touch an already
    # versioned reference and never cut a longer file name short.
    return re.compile(
        r"(?P<prefix>(?:https?://[^\s\"'()]+?)?/?)"
        r"(?P<path>" + alternation + r")"
        r"(?![A-Za-z0-9_?\-])"
    )


def is_versioned_file(dist, path):
    """True for a file that carries a token of its own."""
    rel = os.path.relpath(path, dist).replace(os.sep, "/")
    return any(rel.startswith(folder + "/") for folder in VERSIONED_DIRS)


def version_file(path, pattern, versions):
    with open(path, "r", encoding="utf-8", errors="surrogateescape") as handle:
        original = handle.read()
    if not any(name in original for name in ("images/", "assets/", "js/")):
        return 0

    def replace(match):
        target = match.group("path")
        token = versions[target]
        return "{prefix}{path}?v={token}".format(
            prefix=match.group("prefix"), path=target, token=token
        )

    updated = pattern.sub(replace, original)
    if updated != original:
        with open(path, "w", encoding="utf-8", errors="surrogateescape") as handle:
            handle.write(updated)
        return 1
    return 0


def main():
    dist = sys.argv[1] if len(sys.argv) > 1 else "dist"
    versions = collect_files(dist)
    if not versions:
        print("version-assets: nothing published, nothing to version")
        return 0

    pattern = build_pattern(versions)
    changed = 0
    for root, dirs, files in os.walk(dist):
        dirs[:] = [d for d in dirs if d not in {".git", "uploads"}]
        for name in files:
            if os.path.splitext(name)[1].lower() not in TEXT_EXTENSIONS:
                continue
            path = os.path.join(root, name)
            if is_versioned_file(dist, path):
                # The file carries a token of its own, so it must keep its
                # own bytes; writing a token into it would change them.
                continue
            changed += version_file(path, pattern, versions)

    print(
        "version-assets: {} file(s) published, {} text file(s) updated with "
        "version tokens".format(len(versions), changed)
    )
    for name in sorted(versions):
        print("  {}?v={}".format(name, versions[name]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
