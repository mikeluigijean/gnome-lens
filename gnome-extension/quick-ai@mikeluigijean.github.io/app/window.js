// The chat window: a header bar (pin, site switcher, prefs) over a stack of lazily created site views.
// Hiding never destroys anything, so every site keeps its page and conversation.
import Adw from 'gi://Adw?version=1';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';

import {Keys, UUID} from '../lib/constants.js';
import {SITES, findSite, siteIndex} from '../lib/sites.js';
import {SiteView} from './siteView.js';

const AUTO_HIDE_DELAY_MS = 100;

export class ChatWindow {
    constructor({app, settings, WebKit, session}) {
        this._app = app;
        this._settings = settings;
        this._WebKit = WebKit;
        this._session = session;
        this._views = new Map();
        this._started = false;
        this._fileChooserHold = false;
        this._autoHideId = 0;
        /** Called with the new visibility; set by the D-Bus service. */
        this.onVisibilityChanged = null;

        this._window = new Adw.ApplicationWindow({
            application: app,
            title: 'Quick AI',
            default_width: settings.get_int(Keys.WINDOW_WIDTH),
            default_height: settings.get_int(Keys.WINDOW_HEIGHT),
        });
        this._window.set_content(this._buildContent());

        this._window.connect('close-request', () => {
            this.hide();
            return true;
        });
        this._window.connect('notify::visible', () => this.onVisibilityChanged?.(this.visible));
        this._window.connect('notify::is-active', () => this._onActiveChanged());
        this._siteChangedId = settings.connect(`changed::${Keys.ACTIVE_SITE}`, () => this._syncSite());
    }

    get visible() {
        return this._window.visible;
    }

    show() {
        if (!this._started) {
            this._started = true;
            this._syncSite();
        }
        this._window.present();
    }

    hide() {
        if (!this._window.visible)
            return;
        this._cancelAutoHide();
        // In GTK4 the default size tracks the user's resizes (unmaximized size).
        const [width, height] = this._window.get_default_size();
        this._settings.set_int(Keys.WINDOW_WIDTH, width);
        this._settings.set_int(Keys.WINDOW_HEIGHT, height);
        this._window.set_visible(false);
    }

    toggle() {
        if (this.visible)
            this.hide();
        else
            this.show();
    }

    destroy() {
        this._cancelAutoHide();
        this._settings.disconnect(this._siteChangedId);
        this._window.destroy();
    }

    _buildContent() {
        const header = new Adw.HeaderBar();

        const pin = new Gtk.ToggleButton({
            icon_name: 'view-pin-symbolic',
            tooltip_text: 'Keep open when unfocused',
        });
        this._settings.bind(Keys.PINNED, pin, 'active', Gio.SettingsBindFlags.DEFAULT);
        header.pack_start(pin);

        this._siteDropDown = Gtk.DropDown.new_from_strings(SITES.map(s => s.name));
        this._siteDropDown.set_selected(siteIndex(this._settings.get_string(Keys.ACTIVE_SITE)));
        this._siteDropDown.connect('notify::selected', () => {
            const site = SITES[this._siteDropDown.get_selected()];
            if (site && this._settings.get_string(Keys.ACTIVE_SITE) !== site.id)
                this._settings.set_string(Keys.ACTIVE_SITE, site.id);
        });
        header.set_title_widget(this._siteDropDown);

        const prefs = new Gtk.Button({icon_name: 'emblem-system-symbolic', tooltip_text: 'Preferences'});
        prefs.connect('clicked', () => this._openPrefs());
        header.pack_end(prefs);

        this._stack = new Gtk.Stack({hexpand: true, vexpand: true});
        const toolbar = new Adw.ToolbarView({content: this._stack});
        toolbar.add_top_bar(header);
        return toolbar;
    }

    /** Make the dropdown and the shown view follow `active-site` (changed here or in prefs). */
    _syncSite() {
        const site = findSite(this._settings.get_string(Keys.ACTIVE_SITE));
        const index = siteIndex(site.id);
        if (this._siteDropDown.get_selected() !== index)
            this._siteDropDown.set_selected(index);
        if (!this._started)
            return; // pages load on first show, not at app start

        let view = this._views.get(site.id);
        if (!view) {
            view = new SiteView(this._WebKit, site, this._session, {
                onFileChooser: () => {
                    this._fileChooserHold = true;
                },
            });
            this._views.set(site.id, view);
            this._stack.add_named(view.widget, site.id);
            view.load();
        }
        this._stack.set_visible_child_name(site.id);
    }

    _openPrefs() {
        Gio.DBus.session.call(
            'org.gnome.Shell', '/org/gnome/Shell', 'org.gnome.Shell.Extensions', 'OpenExtensionPrefs',
            new GLib.Variant('(ssa{sv})', [UUID, '', {}]),
            null, Gio.DBusCallFlags.NONE, -1, null,
            (connection, result) => {
                try {
                    connection.call_finish(result);
                } catch (e) {
                    logError(e, 'Quick AI: cannot open preferences');
                }
            });
        this.hide();
    }

    _onActiveChanged() {
        this._cancelAutoHide();
        if (this._window.is_active) {
            this._fileChooserHold = false;
            return;
        }
        if (!this._window.visible)
            return;
        this._autoHideId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, AUTO_HIDE_DELAY_MS, () => {
            this._autoHideId = 0;
            if (!this._shouldStayOpen())
                this.hide();
            return GLib.SOURCE_REMOVE;
        });
    }

    _shouldStayOpen() {
        return this._settings.get_boolean(Keys.PINNED) ||
            this._fileChooserHold ||
            // Sign-in popups are windows of this app; focusing one must not hide the chat.
            this._app.get_windows().some(w => w.is_active);
    }

    _cancelAutoHide() {
        if (this._autoHideId) {
            GLib.source_remove(this._autoHideId);
            this._autoHideId = 0;
        }
    }
}
