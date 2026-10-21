#!/usr/bin/env python3
"""
Verify that the build output publishes the images the sources point at.

Checks, for the `dist` directory:

  1. every image reference in the published HTML, CSS, JS and JSON resolves
     to a file that exists in the build output;
  2. the published file is byte-identical to its source in `images/`;
  3. every published reference carries the version token of the file it
     points at, so a replaced photo is always fetched again;
  4. no image in the build output is unreferenced.

Usage: verify-images.py [dist-dir]
Exit code 0 = all checks passed.
"""

import hashlib
import json
import os
import re
import sys

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico", ".avif")
TEXT_EXTENSIONS = (".html", ".css", ".js", ".json", ".yml", ".yaml", ".xml", ".svg")
REFERENCE = re.compile(
    r"images/(?P<name>[A-Za-z0-9._-]+\.(?:jpg|jpeg|png|gif|webp|svg|ico|avif))"
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


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dist = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(root, "dist")
    source_images = os.path.join(root, "images")
    dist_images = os.path.join(dist, "images")

    if not os.path.isdir(dist_images):
        print("FAIL: no images directory in the build output:", dist_images)
        return 1

    published = {}
    for name in sorted(os.listdir(dist_images)):
        path = os.path.join(dist_images, name)
        if os.path.isfile(path):
            published[name] = sha256(path)

    problems = []
    referenced = set()
    checked = 0

    for path in walk_text_files(dist):
        with open(path, encoding="utf-8", errors="replace") as handle:
            text = handle.read()
        for match in REFERENCE.finditer(text):
            name = match.group("name")
            if not name.lower().endswith(IMAGE_EXTENSIONS):
                continue
            checked += 1
            referenced.add(name)
            rel = os.path.relpath(path, dist)

            if name not in published:
                problems.append("{}: reference to missing image images/{}".format(rel, name))
                continue

            token = match.group("query")
            if not token:
                problems.append("{}: images/{} has no version token".format(rel, name))
                continue

            expected = "?v=" + published[name][:10]
            if token != expected:
                problems.append(
                    "{}: images/{} token {} does not match content {}".format(
                        rel, name, token, expected
                    )
                )
                continue

            source = os.path.join(source_images, name)
            if os.path.isfile(source):
                if sha256(source) != published[name]:
                    problems.append(
                        "{}: images/{} differs from the source file".format(rel, name)
                    )
            else:
                problems.append("{}: images/{} has no source in images/".format(rel, name))

    for name in sorted(published):
        if name not in referenced:
            problems.append("images/{} is published but never referenced".format(name))

    print("Checked {} image reference(s) across the build output.".format(checked))
    print("Published images: {}".format(len(published)))
    for name in sorted(published):
        marker = "referenced" if name in referenced else "UNREFERENCED"
        print("  images/{:22} sha256={}  {}".format(name, published[name][:10], marker))

    if problems:
        print("\nFAIL: {} problem(s):".format(len(problems)))
        for problem in problems:
            print("  -", problem)
        return 1

    print("\nPASS: every published image matches its source and carries a correct version token.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
