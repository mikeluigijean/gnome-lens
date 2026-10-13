# Gnome Lens — GNOME Shell extension

A hotkey opens and closes a popup window showing a **logged-in AI chat site** (ChatGPT / Claude / Gemini).
The session stays alive between openings. Since v0.2, Lens attaches screenshots / selected text to the prompt box;
the user always presses send. Inspired by "Screen word translate" (`dict@sun.wxg@gmail.com`, MIT).
Named **Quick AI** until 2026-10-13 (v0.1 and the v0.2 commit use that name), then renamed **Gnome Lens**.

Goal: ship a small v0.1 first. Later features (more sites, selection→chat, native API chat, back/reload) must be
**additive**, so keep modules small and pure where possible.

## Environment
- Ubuntu 26.04, GNOME Shell 50.1 Wayland, gjs 1.88. Target `shell-version` 48–51 (only 50 is testable locally).
- WebKit 6 (`gir1.2-webkit-6.0`), GTK4, Adw-1 and Soup-3 are installed (Claude has no sudo).
- `npx eslint@9 .` fails: `@eslint/js` isn't resolvable (no local node_modules). Lint with a
  scratch install instead: `npm i eslint@9 @eslint/js@9` in a scratch dir, copy the config there, run `eslint -c <scratch>/eslint.config.mjs .`.
- Conventions are copied from the author's other extension (buds-notifier): `lib/` modules, `tests-js/run.js` run
  with `gjs -m`, `eslint.config.mjs` (`npx eslint@9 .`), symlinking `install.sh`, Adw `fillPreferencesWindow`.

## Decisions (from the grill-me interview — don't re-ask)
- New repo (not a fork). Name **Gnome Lens**, UUID `gnome-lens@mikeluigijean.github.io`, app/bus id `io.github.mikeluigijean.GnomeLens`.
- Web view of AI sites (no API keys). Same session continues: never reload a view once it's loaded.
- Sites in v0.1: ChatGPT, Claude, Gemini. One WebView per site (lazy), so each keeps its own conversation.
- GTK4 + WebKit 6, in a **separate gjs process** controlled over D-Bus (GNOME Shell can't host WebKit).
- v0.1 features: toggle hotkey; top-bar icon with a menu (Toggle chat / Preferences) whose visibility is a setting;
  window opens next to the pointer or centered; size remembered; pin + auto-hide on focus-out; site switcher in the
  header bar; prefs button; persistent cookies/logins.
- **Dropped:** everything about text selection (watcher, floating button, hover, trigger toggle), history/stars,
  search entry, translate-shell + cache, Mdict, language dropdown, web toggles (mobile UA/JS/media/images),
  custom URL providers. **Later:** back/reload button.

## Roadmap after v0.1 (grilled + approved 2026-10-13)
Target: **extensions.gnome.org, general users.**
- **v0.2 Lens:** screenshot → AI. Every GNOME screenshot (`Main.screenshotUI` `'screenshot-taken'` signal) shows a top-right card
  [Ask] [Translate] [Copy text]. A Lens hotkey opens the native screenshot UI and skips the card. A selection hotkey sends PRIMARY
  text → CLIPBOARD text → clipboard image. Content goes to the **active site**, OCR is done by the AI, translation is into the
  system language. **Attach-only: inject image/text + prompt, never press send** (this replaces v0.1's "no injection" rule).
  Step 1 is a spike: does a synthetic `paste` ClipboardEvent attach images on ChatGPT/Claude/Gemini in WebKitGTK? The fallback is
  the real clipboard + `execute_editing_command(PASTE)`.
- **v0.3 EGO-ready** (reordered 2026-10-13, before the sites/window features): cleanup pass (no unused code, no speculative
  comments: EGO rejects code that looks AI-generated), `shell-version` `["50"]` only (add 48/49/51 once tested), description
  declares clipboard/screenshot/website access, `pack.sh`, `docs/review-notes.md`. User decisions: keep the name "Gnome Lens"
  (no trademark email) and keep the default `ask-selection` shortcut, although EGO guidelines say clipboard shortcuts must
  ship unbound; if a reviewer objects, set its default to `[]`.
- **v0.4:** more preset sites + custom name/URL sites (enable/order); back/reload/open-in-browser; edge sidebar dock; always on top.
  gettext later (not required by EGO).
- Not wanted: keeping the app alive across screen lock.
- **Releases:** each version gets an annotated git tag (`v0.1`, `v0.2`, …), pushed with `git push origin <tag>`. From v0.2 on,
  also set `"version-name"` in metadata.json to match.

## Layout
```
install.sh  pack.sh (EGO zip → dist/)  docs/review-notes.md  README.md  LICENSE  eslint.config.mjs  .gitignore  tests-js/run.js
gnome-extension/gnome-lens@mikeluigijean.github.io/
  metadata.json  extension.js  prefs.js  stylesheet.css  icons/gnome-lens-symbolic.svg
  schemas/org.gnome.shell.extensions.gnome-lens.gschema.xml
  lib/    pure, no Shell/Gtk imports, unit-tested: constants.js dbusIface.js sites.js placement.js prompts.js
  shell/  runs in gnome-shell: appLauncher.js hotkeys.js windowTracker.js panelButton.js
          screenshotWatcher.js lensCard.js selection.js
  app/    separate process (gjs -m app/main.js): main.js dbusService.js window.js siteView.js injector.js webSession.js settings.js
```

## Progress
- [x] Repo scaffold, LICENSE (credits Dict), .gitignore, eslint config, metadata.json
- [x] gschema keys: `toggle-chat` as `['<Control><Alt>a']`, `active-site` 'chatgpt', `window-position` enum
      pointer|center, `window-width` 480, `window-height` 720, `pinned` true (since v0.2), `show-panel-icon` true. `--strict --dry-run` passes.
- [x] `lib/constants.js` (ids + `Keys`, `Position`), `lib/dbusIface.js` (`…GnomeLens1`: Toggle/Quit/AskImage/AskText),
      `lib/sites.js` (`SITES`, `findSite`, `siteIndex`), `lib/placement.js` (`computePosition`)
- [x] `tests-js/run.js`: 10/10 pass
- [x] `icons/gnome-lens-symbolic.svg` (Adwaita has no chat icon; load it with `Gio.FileIcon`)
- [x] `app/`: verified standalone via gdbus (Toggle/Show/Hide/Quit, Visible/Pinned signals, site switch from
      gsettings, pinned stays open, cookies.sqlite created, clean exit). Window size is saved with `get_default_size()`
      (GTK4 tracks resizes there), not `get_width/get_height`. Not yet seen by eye: page rendering, sign-in popups, file-chooser hold.
- [x] `shell/` + `extension.js`, `prefs.js`, `install.sh`, README. Lint-clean; Shell/Mutter APIs checked against the
      Shell 50 gresource JS and Meta-18 typelib. **Not run inside gnome-shell yet** (needs `./install.sh` + re-login by the user).
      `EXIT_NO_WEBKIT` / `WEBKIT_INSTALL_CMD` live in `lib/constants.js`. The tracker matches the chat window on its
      first `shown` (app id may not be set at `window-created`).
- [x] Verification: the user ran the full manual checklist in gnome-shell on 2026-10-13; everything works.
      (Focus-dependent tests are done by the user: they work on the same desktop, so clicks elsewhere steal focus.)
- [x] v0.1 committed and pushed to github.com/mikeluigijean/gnome-lens (public), tagged `v0.1`.
- [x] v0.2 Lens code: `lib/prompts.js` (+tests, 14/14), D-Bus `AskImage(ay,s)` / `AskText(s,s)` (bytes, not a temp path),
      `app/injector.js`, `SiteView.ask`, `ChatWindow.ask` (+ toasts), `shell/screenshotWatcher.js`, `shell/lensCard.js` + `stylesheet.css`,
      `shell/selection.js`, multi-key `shell/hotkeys.js`, prefs Lens group, metadata `version-name` 0.2.
      **Injection findings** (headless SiteView+injector on a copy of the login data):
      - A synthetic `paste` ClipboardEvent with a File attaches images on ChatGPT and Gemini (the clipboard is never touched).
      - ChatGPT's composer is server-rendered before its paste handler exists, so the image paste is retried until handled.
      - Text: `execCommand('insertText')`, falling back to a synthetic text paste; re-checked after hydration. Read with
        `textContent` (`innerText` needs layout). Both verified on ChatGPT and Gemini. Claude untested (the app's session was logged out).
      - Last resort if the text doesn't stick: `Gdk.ContentProvider` on the real clipboard + toast. (`Gdk.Clipboard.set_text` isn't introspectable.)
- [x] v0.2 committed (`07633b2`, with the searchable language dropdown and pinned-by-default).
- [x] Renamed Quick AI → Gnome Lens (`33a8b55`): GitHub repo renamed too. The user's logins were moved to `~/.local/share/gnome-lens`.
      The local checkout is still `~/scripts/quick-ai` (renaming it is left to the user; re-run install.sh after).
- [x] v0.3 EGO-ready: cleanup removed the unused D-Bus `Show`/`Hide` and `Visible`/`Pinned`, sites' `kind`, the per-site `composer`
      selector, `DEFAULT_SITE_ID`. Verified: the Shell 50 `extensionDownloader.js` runs `glib-compile-schemas --strict` on the
      extension's `schemas/` after an EGO install, so `app/settings.js` works; a simulated install from the `pack.sh` zip starts the app
      and it quits cleanly.
- [x] User test in gnome-shell on 2026-10-13 (card, Lens hotkey, selection hotkey, prefs language dropdown, DND fallback, Claude,
      clean disable): everything works. Tagged `v0.2` (at `07633b2`) and `v0.3`.
- [ ] User: listing screenshots, `./pack.sh`, upload `dist/*.zip` to extensions.gnome.org with `docs/review-notes.md`.

## Design notes worked out for the remaining code
**app/**
- `settings.js`: GSettings from `../schemas` via `Gio.SettingsSchemaSource.new_from_directory` (the app isn't inside the shell).
  The directory comes from `import.meta.url`. Needs `gschemas.compiled`, which `install.sh` builds.
- `main.js`: check `await import('gi://WebKit?version=6.0')` in try/catch; on failure printerr and exit with **code 2**
  (the shell maps that to "install gir1.2-webkit-6.0"). Subclass `Adw.Application(APP_ID)`. Export the D-Bus service in
  `vfunc_dbus_register(connection, objectPath)` (the GApplication object path equals `OBJECT_PATH`) and unexport in
  `vfunc_dbus_unregister`. `activate` only builds the window, **hidden** (a second launch must not toggle).
  `hold()` keeps the app alive.
- `dbusService.js`: `Gio.DBusExportedObject.wrapJSObject(GNOME_LENS_IFACE_XML, this)`. Methods delegate to the window
  controller. Run `Quit` from an idle callback so the reply is sent first. Call `emit_property_changed('Visible', …)` on show/hide.
- `webSession.js`: one `WebKit.NetworkSession.new(~/.local/share/gnome-lens, ~/.cache/gnome-lens)` (dirs mode 0o700); its cookie manager
  uses policy ALWAYS and `set_persistent_storage(cookies.sqlite, SQLITE)` (port of the user's Dict commit 8ff701f).
- `siteView.js`: `class SiteView {constructor(site, session); get widget(); load()}`, which loads once only.
  Handle the WebView `create` signal: make a related WebView (`related_view`) in a transient Gtk.Window, show it on `ready-to-show`
  and destroy it on `close`. **This is required for OAuth/Google sign-in popups.** Later `NativeChatView` / adapters keep the same contract.
- `window.js`: Adw.ApplicationWindow (title "Gnome Lens") + Adw.ToolbarView + Adw.HeaderBar. The title widget is a Gtk.DropDown
  of site names, bound to `active-site` (also react to `changed::active-site` from prefs).
  - Pin is a ToggleButton (`view-pin-symbolic`) bound to `pinned`. The prefs button calls
    `org.gnome.Shell.Extensions.OpenExtensionPrefs(UUID, '', {})` on `/org/gnome/Shell`.
  - The views live in a Gtk.Stack named by site id, created lazily.
  - `close-request` → hide and return true (keeps the sessions).
  - Save the size (`get_width/get_height`) to settings on hide.
  - **Auto-hide:** on `notify::is-active` false, wait about 100 ms. Then don't hide if pinned, or if any of the app's windows is
    active (sign-in popups are transient windows of ours), or if a file chooser is open. For the chooser, set a hold flag on the
    WebView's `run-file-chooser` signal and clear it the next time the window becomes active.

**shell/**
- `appLauncher.js`: `Gio.bus_watch_name(BUS_NAME)`. `call(method)`:
  - Name present: async `Gio.DBus.session.call`.
  - Otherwise: queue the call, and spawn only once the watch has reported "vanished". This avoids a second instance and a
    double toggle at startup.
  - Spawn with `Gio.Subprocess([gjs, '-m', app/main.js])`; stderr is inherited, so it lands in the journal.
  - Flush the queue on name-appeared.
  - `wait_async`: exit code 2 → `Main.notify` with the apt command; another failure while calls are pending → generic
    notify. Clear the queue in both cases.
  - `quitApp()` sends `Quit`; `destroy()` unwatches.
- `windowTracker.js`: `global.display` `window-created`. Match `get_gtk_application_id() === APP_ID` and skip
  `get_transient_for()` windows (popups). On GTK4/Wayland every show creates a **new MetaWindow**, so place it each time on the
  window's `shown` signal (once): `computePosition` with `global.get_pointer()`, `get_frame_rect()`, and the work area of
  `global.display.get_current_monitor()` on the active workspace, then `move_frame`, `change_workspace(active)`, `activate`.
  Keep a reference until `unmanaged`. `bringHereIfAway()`: if the window exists but isn't focused or is on another workspace,
  move it here and activate it, and return true.
- `hotkeys.js`: `Main.wm.addKeybinding(Keys.TOGGLE_CHAT, settings, Meta.KeyBindingFlags.NONE, Shell.ActionMode.NORMAL | OVERVIEW, cb)`.
  It follows settings changes on its own. Remove the keybinding in `destroy`.
- `panelButton.js`: PanelMenu.Button using the bundled icon; `menu.addAction` for "Show / hide chat" and "Preferences".
  Use a menu, not a click gesture: the click API changed in 50 (Dict commit 12dbca0), and a menu works on 48–51.
  `settings.bind(show-panel-icon, button, 'visible')`.
- `extension.js`: thin wiring. `_toggle()` does `tracker.bringHereIfAway() || launcher.call('Toggle')`. `disable()` works in
  reverse: unbind, destroy the button, hotkeys and tracker, then `launcher.quitApp()` and `destroy()`. Note: disable also runs on
  screen lock, which quits the app; cookies persist, but the open page state is lost. Acceptable for v0.1.

**prefs.js**: Adw page.
- Shortcut: EntryRow with an apply button, validated with `Gtk.accelerator_parse` (ok and keyval ≠ 0, otherwise add the `error` css class).
- Site and window position: ComboRows; use `get_string`/`set_string` on the enum key.
- Panel icon: SwitchRow.
- Status row: WebKit 6 present? (dynamic import try/catch), showing the apt command if it's missing.

## Verification
- `gjs -m tests-js/run.js`; `npx eslint@9 .`; `glib-compile-schemas --strict --dry-run <ext>/schemas`.
- App alone (after installing WebKit 6 and compiling schemas): `gjs -m app/main.js`, then
  `gdbus call --session -d io.github.mikeluigijean.GnomeLens -o /io/github/mikeluigijean/GnomeLens -m io.github.mikeluigijean.GnomeLens1.Toggle`.
- Shell: `./install.sh`, log out and back in (Wayland), then watch `journalctl -f -o cat /usr/bin/gnome-shell`.
- Manual checklist:
  - The hotkey opens the window at the pointer or centered, on the current workspace; pressing it again hides it.
  - Logins and conversations survive hide/show; logins also survive an app restart.
  - Switching sites keeps each conversation.
  - Focus-out hides the window, except when it's pinned, a sign-in popup is open, or a file chooser is open.
  - The size is remembered; the panel menu and prefs work; a hotkey changed in prefs takes effect.
  - Disabling the extension leaves no journal errors.
  - Without WebKit 6, a clear notification appears.
