// Quick AI: a hotkey shows/hides a window with a logged-in AI chat site. The window lives in a
// separate GTK/WebKit process (app/); this side only launches it, places its window, and binds keys.
import Gio from 'gi://Gio';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {Keys} from './lib/constants.js';
import {AppLauncher} from './shell/appLauncher.js';
import {Hotkeys} from './shell/hotkeys.js';
import {PanelButton} from './shell/panelButton.js';
import {WindowTracker} from './shell/windowTracker.js';

export default class QuickAIExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._launcher = new AppLauncher(this.dir);
        this._tracker = new WindowTracker(this._settings);
        this._hotkeys = new Hotkeys(this._settings, () => this._toggle());

        const gicon = Gio.FileIcon.new(this.dir.get_child('icons').get_child('quick-ai-symbolic.svg'));
        this._button = new PanelButton({
            gicon,
            onToggle: () => this._toggle(),
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
        this._tracker.destroy();
        this._launcher.quitApp();
        this._launcher.destroy();
        this._button = this._hotkeys = this._tracker = this._launcher = this._settings = null;
    }

    _toggle() {
        if (!this._tracker.bringHereIfAway())
            this._launcher.call('Toggle');
    }
}
