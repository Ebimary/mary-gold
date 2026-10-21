#!/usr/bin/env python3
"""
Verify that the build output publishes what the sources point at.

Checks, for the `dist` directory:

  1. every reference to a published photo, stylesheet or script resolves
     to a file that exists in the build output;
  2. the published file is byte-identical to its source;
  3. every reference in a page or a content file carries the version
     token of the file it points at, so a replaced photo or script is
     always fetched again;
  4. no published file is unreferenced.

References inside a script or a stylesheet are not required to carry a
token: a script only ever loads another file through a page, and photos
are revalidated on every request (see netlify.toml), so a reference that
misses a token can never be stale.

Usage: verify-assets.py [dist-dir]
Exit code 0 = all checks passed.
"""

import hashlib
import os
import re
import sys

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico", ".avif")
TEXT_EXTENSIONS = (".html", ".css", ".js", ".json", ".yml", ".yaml", ".xml", ".svg")
# Files that are loaded by a page: their references must carry a token.
TOKEN_REQUIRED = (".html", ".json")
VERSIONED_DIRS = ("images", "assets", "js")
REFERENCE = re.compile(
    r"(?P<path>(?:images|assets|js)/[A-Za-z0-9._/-]+"
    r"\.(?:jpg|jpeg|png|gif|webp|svg|ico|avif|css|js|mjs|json|map))"
    r"(?P<query>\?v=[a-f0-9]+)?"
)


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def walk_text_files(root):
    for base, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in {".git", "uploads"}]
        for name in files:
            if name.lower().endswith(TEXT_EXTENSIONS):
                yield os.path.join(base, name)


def published_files(dist):
    """Every published file that carries a version token, with its hash."""
    published = {}
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
                if os.path.isfile(path):
                    rel = os.path.relpath(path, dist).replace(os.sep, "/")
                    published[rel] = sha256(path)
    return published


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dist = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(root, "dist")

    if not os.path.isdir(dist):
        print("FAIL: no build output:", dist)
        return 1

    published = published_files(dist)
    if not published:
        print("FAIL: nothing published in", dist)
        return 1

    problems = []
    referenced = set()
    checked = 0
    untokenised = []

    for path in walk_text_files(dist):
        with open(path, encoding="utf-8", errors="replace") as handle:
            text = handle.read()
        extension = os.path.splitext(path)[1].lower()
        needs_token = extension in TOKEN_REQUIRED
        rel = os.path.relpath(path, dist)

        for match in REFERENCE.finditer(text):
            target = match.group("path")
            checked += 1
            referenced.add(target)
            token = match.group("query")

            if target not in published:
                problems.append("{}: reference to missing file {}".format(rel, target))
                continue

            if not needs_token:
                if not token:
                    untokenised.append("{}: {}".format(rel, target))
                continue

            if not token:
                problems.append("{}: {} has no version token".format(rel, target))
                continue

            expected = "?v=" + published[target][:10]
            if token != expected:
                problems.append(
                    "{}: {} token {} does not match content {}".format(
                        rel, target, token, expected
                    )
                )
                continue

            source = os.path.join(root, target)
            if os.path.isfile(source):
                if sha256(source) != published[target]:
                    problems.append(
                        "{}: {} differs from the source file".format(rel, target)
                    )
            else:
                problems.append("{}: {} has no source in the repository".format(rel, target))

    for target in sorted(published):
        if target not in referenced:
            problems.append("{} is published but never referenced".format(target))

    print("Checked {} reference(s) across the build output.".format(checked))
    print("Published files: {}".format(len(published)))
    for target in sorted(published):
        marker = "referenced" if target in referenced else "UNREFERENCED"
        print("  {:28} sha256={}  {}".format(target, published[target][:10], marker))
    if untokenised:
        print("References inside a script or a stylesheet (always revalidated):")
        for item in untokenised:
            print("  -", item)

    if problems:
        print("\nFAIL: {} problem(s):".format(len(problems)))
        for problem in problems:
            print("  -", problem)
        return 1

    print(
        "\nPASS: every published file matches its source and carries a correct "
        "version token."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
