#!/usr/bin/env bash
# Build the zip to upload to extensions.gnome.org (dist/<uuid>.shell-extension.zip).
# Only the extension folder goes in; extensions.gnome.org compiles the schema on install.
set -euo pipefail

UUID="gnome-lens@mikeluigijean.github.io"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$REPO_DIR/gnome-extension/$UUID"

gjs -m "$REPO_DIR/tests-js/run.js"
glib-compile-schemas --strict --dry-run "$SRC/schemas"

mkdir -p "$REPO_DIR/dist"
gnome-extensions pack "$SRC" --force --out-dir="$REPO_DIR/dist" \
    --extra-source=app --extra-source=lib --extra-source=shell --extra-source=icons
echo "Built: $REPO_DIR/dist/$UUID.shell-extension.zip"
