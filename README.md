# Quick AI

A GNOME Shell extension that opens and closes an **AI chat window** (ChatGPT, Claude or Gemini)
with a keyboard shortcut. You stay logged in, and conversations stay where you left them between
openings: the window is hidden, never reloaded.

- Shortcut: <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>A</kbd> by default (changeable in preferences)
- Opens next to the pointer or centered, on the current workspace; remembers its size
- Hides when it loses focus, unless pinned (pin button in the header bar)
- Site switcher in the header bar; each site keeps its own conversation
- Optional top bar icon with a menu (Show / hide chat, Preferences)

Tested on Ubuntu 26.04 with GNOME Shell 50.1 (Wayland).

## Install

Requires WebKitGTK 6:

```bash
sudo apt install gir1.2-webkit-6.0
```

Then from this repository:

```bash
git clone https://github.com/mikeluigijean/quick-ai.git ~/scripts/quick-ai
~/scripts/quick-ai/install.sh
```

Log out and back in once (Wayland only discovers new extensions at login).

## How it works

GNOME Shell can't embed a web view, so the chat window is a small separate GTK 4 + WebKit 6 app
(`app/`), started on first use and controlled by the extension over D-Bus
(`io.github.mikeluigijean.QuickAI`). Logins are stored in `~/.local/share/quick-ai`.
The app quits when the extension is disabled (also on screen lock); logins survive that,
open pages are reloaded on the next opening.

Troubleshooting: `journalctl -f -o cat /usr/bin/gnome-shell` shows both the extension's and the app's messages.

## Development

```bash
gjs -m tests-js/run.js                       # unit tests (lib/)
gjs -m gnome-extension/quick-ai@mikeluigijean.github.io/app/main.js   # the app alone (after install.sh)
gdbus call --session -d io.github.mikeluigijean.QuickAI -o /io/github/mikeluigijean/QuickAI \
    -m io.github.mikeluigijean.QuickAI1.Toggle
```

## Credits

Inspired by [Screen word translate](https://github.com/sunwxg/gnome-shell-extension-dict)
(MIT); the window placement is ported from it. License: MIT.
