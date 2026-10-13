// Gnome Lens: a hotkey shows/hides a window with a logged-in AI chat site, and Lens sends screenshots or
// selected text to it. The window lives in a separate GTK/WebKit process (app/); this side launches it,
// places its window, binds keys and watches screenshots.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {Action, Keys} from './lib/constants.js';
import {AppLauncher} from './shell/appLauncher.js';
import {Hotkeys} from './shell/hotkeys.js';
import {LensCard} from './shell/lensCard.js';
import {PanelButton} from './shell/panelButton.js';
import {ScreenshotWatcher} from './shell/screenshotWatcher.js';
import {readSelection} from './shell/selection.js';
import {WindowTracker} from './shell/windowTracker.js';

export default class GnomeLensExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._launcher = new AppLauncher(this.dir);
        this._tracker = new WindowTracker(this._settings);
        const gicon = Gio.FileIcon.new(this.dir.get_child('icons').get_child('gnome-lens-symbolic.svg'));
        this._lensCard = new LensCard(gicon);
        this._screenshots = new ScreenshotWatcher((file, isLens) => this._onScreenshot(file, isLens));
        this._hotkeys = new Hotkeys(this._settings, {
            [Keys.TOGGLE_CHAT]: () => this._toggle(),
            [Keys.LENS]: () => this._screenshots.openLens(),
            [Keys.ASK_SELECTION]: () => this._askSelection(),
        });

        this._button = new PanelButton({
            gicon,
            onToggle: () => this._toggle(),
            onLens: () => this._screenshots.openLens(),
            onPreferences: () => this.openPreferences(),
        });
        Main.panel.addToStatusArea(this.uuid, this._button);
        this._settings.bind(Keys.SHOW_PANEL_ICON, this._button, 'visible', Gio.SettingsBindFlags.GET);
    }

    // Also runs on screen lock: the app quits, logins persist (cookies on disk), open pages don't.
    disable() {
        Gio.Settings.unbind(this._button, 'visible');
        this._button.destroy();
        this._hotkeys.destroy();
        this._screenshots.destroy();
        this._lensCard.destroy();
        this._tracker.destroy();
        this._launcher.quitApp();
        this._launcher.destroy();
        this._button = this._hotkeys = this._screenshots = this._lensCard = null;
        this._tracker = this._launcher = this._settings = null;
    }

    _toggle() {
        if (!this._tracker.bringHereIfAway())
            this._launcher.call('Toggle');
    }

    _onScreenshot(file, isLens) {
        if (isLens) {
            this._askImageFile(file, Action.ASK);
            return;
        }
        if (!this._settings.get_boolean(Keys.SCREENSHOT_CARD))
            return;
        this._lensCard.show(file, [
            {label: 'Ask', callback: () => this._askImageFile(file, Action.ASK)},
            {label: 'Translate', callback: () => this._askImageFile(file, Action.TRANSLATE)},
            {label: 'Copy text', callback: () => this._askImageFile(file, Action.OCR)},
        ]);
    }

    _askImageFile(file, action) {
        file.load_bytes_async(null, (f, result) => {
            try {
                const [bytes] = f.load_bytes_finish(result);
                this._askImage(bytes, action);
            } catch (e) {
                logError(e, 'Gnome Lens: cannot read the screenshot');
            }
        });
    }

    /** @param {GLib.Bytes} bytes PNG data */
    _askImage(bytes, action) {
        this._launcher?.call('AskImage', GLib.Variant.new_tuple([
            GLib.Variant.new_from_bytes(new GLib.VariantType('ay'), bytes, true),
            GLib.Variant.new_string(action),
        ]));
    }

    _askSelection() {
        readSelection(content => {
            if (!this._launcher)
                return; // disabled meanwhile
            if (content?.text)
                this._launcher.call('AskText', new GLib.Variant('(ss)', [content.text, Action.ASK]));
            else if (content?.png)
                this._askImage(content.png, Action.ASK);
            else
                Main.notify('Gnome Lens', 'Select some text (or copy an image) first.');
        });
    }
}
