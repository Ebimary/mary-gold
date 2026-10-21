#!/usr/bin/env bash
#
# Build the static site into dist/ so that Netlify can publish it.
#
# The site has no compilation step - it is plain HTML + CSS + JS + JSON. This
# script simply assembles the deployable files into dist/ and keeps everything
# else (build scripts, repo metadata, .netlify state) out of the published
# site.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="${ROOT}/dist"

cd "${ROOT}"

rm -rf "${DIST}"
mkdir -p "${DIST}"

# Top-level pages (index.html, about.html, 404.html, ...)
cp ./*.html "${DIST}/"

# Directories that are part of the live site
for dir in admin assets content images js uploads; do
    if [ -d "${dir}" ]; then
        cp -R "${dir}" "${DIST}/"
    fi
done

# Photos are replaced in place under the same file name, so the published
# URLs get a content-derived version token. Without it a browser keeps
# serving the previous photo from its cache for up to a week.
if command -v python3 >/dev/null 2>&1; then
    python3 "${ROOT}/scripts/version-assets.py" "${DIST}"
else
    echo "WARNING: python3 not found - image URLs were published without" \
         "version tokens and browsers may keep showing old photos." >&2
fi

echo "Built static site -> ${DIST}"
