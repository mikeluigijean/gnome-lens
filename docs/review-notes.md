# Notes for extensions.gnome.org reviewers

Paste into the "notes for the reviewer" field when uploading.

**About the automated checker (Shexli) findings**
- *EGO-P-007, files not reachable from extension.js/prefs.js* (`app/*.js`, `lib/dbusIface.js`): these are the bundled chat
  app described below. They aren't imported by the extension because they run in their own process:
  `shell/appLauncher.js` starts `app/main.js` with `gjs -m`. `lib/dbusIface.js` is the D-Bus interface that the app exports.
  Every one of these files is used.
- *EGO-A-005, direct clipboard access* (`shell/selection.js`): read only when the user presses the "ask about the
  selection" shortcut, never in the background. Details under "Clipboard and selection" below.

**Bundled GJS app (`app/`).** GNOME Shell can't display web pages, so the chat window is a small GTK 4 +
WebKitGTK 6 application written in GJS and shipped inside the extension (MIT, like the rest).
- `shell/appLauncher.js` starts it with `Gio.Subprocess(['gjs', '-m', 'app/main.js'])` on first use only.
- The extension talks to it over D-Bus (`io.github.mikeluigijean.GnomeLens`).
- `disable()` calls its `Quit` method, and the app exits cleanly.
- No binaries, no privileged processes, nothing downloaded.

**Network.** The app only loads the AI site the user picks (ChatGPT, Claude or Gemini) in a WebKit view. The
extension itself makes no network requests and has no telemetry.

**Clipboard and selection.** Read only when the user presses the "ask about the selection" shortcut
(`shell/selection.js`): primary selection, else clipboard text, else a clipboard image. The content is attached to the
AI site's prompt box; the user still has to press Enter to send it. This is declared in the description.

**Screenshots.** `shell/screenshotWatcher.js` connects to the public `Main.screenshotUI` `screenshot-taken` signal (no
monkey-patching) and disconnects in `disable()`. A screenshot only goes to the app after the user clicks a button on the
card, or after they started the capture with the Lens shortcut.

**Settings.** The app reads the extension's own schema from `schemas/` (compiled on install) with
`Gio.SettingsSchemaSource.new_from_directory`, because it runs outside gnome-shell.
