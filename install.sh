#!/usr/bin/env bash
# Install the Quick AI GNOME Shell extension from this repository (development, or installing
# without extensions.gnome.org). Safe to re-run; needs no sudo.
set -euo pipefail

UUID="quick-ai@mikeluigijean.github.io"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$REPO_DIR/gnome-extension/$UUID"
EXT_DIR="$HOME/.local/share/gnome-shell/extensions"

# The chat app (app/) loads this compiled schema itself, outside gnome-shell.
glib-compile-schemas "$SRC/schemas"

if ! gjs -c "imports.gi.versions.WebKit = '6.0'; imports.gi.WebKit;" >/dev/null 2>&1; then
    echo "Warning: WebKitGTK 6 is missing. Install it with: sudo apt install gir1.2-webkit-6.0" >&2
fi

mkdir -p "$EXT_DIR"
if [[ -L "$EXT_DIR/$UUID" || ! -e "$EXT_DIR/$UUID" ]]; then
    ln -sfn "$SRC" "$EXT_DIR/$UUID"
    echo "Linked $EXT_DIR/$UUID -> $SRC"
else
    echo "Not linking: $EXT_DIR/$UUID exists and is not a symlink (installed from extensions.gnome.org?)" >&2
    exit 1
fi

# Enable it. A newly installed extension is only discovered at login on Wayland, so if the
# running shell doesn't know it yet, add it to the enabled list for the next login.
if gnome-extensions info "$UUID" 2>/dev/null | grep -q 'State: ACTIVE'; then
    echo "Extension is active. Log out and back in to load code changes."
elif gnome-extensions enable "$UUID" 2>/dev/null; then
    echo "Extension enabled."
else
    current="$(gsettings get org.gnome.shell enabled-extensions)"
    if [[ "$current" != *"'$UUID'"* ]]; then
        if [[ "$current" == "@as []" || "$current" == "[]" ]]; then
            gsettings set org.gnome.shell enabled-extensions "['$UUID']"
        else
            gsettings set org.gnome.shell enabled-extensions "${current%]}, '$UUID']"
        fi
    fi
    echo "Log out and back in once: the extension will then be active."
fi
echo "Settings: gnome-extensions prefs $UUID"
