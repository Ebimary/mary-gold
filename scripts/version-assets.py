#!/usr/bin/env python3
"""
Append a content-derived version to every published image URL.

Why this exists
---------------
Photos in `images/` are replaced in place, keeping the same file name, so
the URL of a photo never changes when the photo changes. Browsers cache
`/images/*` for a week, so a visitor keeps seeing the previous photo long
after the new one has been deployed. Nothing in the deployment is wrong:
the origin and the Netlify edge already serve the new bytes.

The fix is to publish image URLs with a version token derived from the
content of the file itself (`<file>?v=<sha256 prefix>`):

  * the token changes exactly when the image changes, so a replaced photo
    is a new URL and every browser fetches it;
  * an unchanged photo keeps its URL, so it stays cached and fast;
  * it is deterministic, not random, and it is applied to every reference
    at build time, so no file in the repository has to be edited.

Only the build output is rewritten. The sources (and therefore the CMS)
keep clean, name-based paths such as `/images/director.jpg`.

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


def file_hash(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()[:HASH_LENGTH]


def collect_images(images_dir):
    """Map published image file name -> version token."""
    versions = {}
    if not os.path.isdir(images_dir):
        return versions
    for name in sorted(os.listdir(images_dir)):
        path = os.path.join(images_dir, name)
        if os.path.isfile(path) and not name.startswith("."):
            versions[name] = file_hash(path)
    return versions


def build_pattern(versions):
    """Match any reference to a published image, with or without a host."""
    names = sorted(versions, key=len, reverse=True)
    if not names:
        return None
    alternation = "|".join(re.escape(name) for name in names)
    # [host][/]images/<name>  -- the name must not be followed by a query
    # string, a fragment or a further name character, so we never touch an
    # already versioned reference and never cut a longer file name short.
    return re.compile(
        r"(?P<prefix>(?:https?://[^\s\"'()]+?)?/?)"
        r"images/(?P<name>" + alternation + r")"
        r"(?![A-Za-z0-9_?\-])"
    )


def version_file(path, pattern, versions):
    with open(path, "r", encoding="utf-8", errors="surrogateescape") as handle:
        original = handle.read()
    if "images/" not in original:
        return 0

    def replace(match):
        token = versions[match.group("name")]
        return "{prefix}images/{name}?v={token}".format(
            prefix=match.group("prefix"), name=match.group("name"), token=token
        )

    updated = pattern.sub(replace, original)
    if updated != original:
        with open(path, "w", encoding="utf-8", errors="surrogateescape") as handle:
            handle.write(updated)
        return 1
    return 0


def main():
    dist = sys.argv[1] if len(sys.argv) > 1 else "dist"
    images_dir = os.path.join(dist, "images")
    versions = collect_images(images_dir)
    if not versions:
        print("version-assets: no images published, nothing to version")
        return 0

    pattern = build_pattern(versions)
    changed = 0
    touched = 0
    for root, dirs, files in os.walk(dist):
        dirs[:] = [d for d in dirs if d not in {".git", "uploads"}]
        for name in files:
            if os.path.splitext(name)[1].lower() not in TEXT_EXTENSIONS:
                continue
            path = os.path.join(root, name)
            touched += 1
            changed += version_file(path, pattern, versions)

    print(
        "version-assets: {} image(s) versioned, {} file(s) updated with version tokens".format(
            len(versions), changed
        )
    )
    for name, token in sorted(versions.items()):
        print("  images/{}?v={}".format(name, token))
    return 0


if __name__ == "__main__":
    sys.exit(main())
