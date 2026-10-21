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

echo "Built static site -> ${DIST}"
