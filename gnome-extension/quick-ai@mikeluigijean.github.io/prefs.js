// Preferences: shortcut, site, window position, panel icon, and whether WebKit 6 is installed.
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {Keys, Position, WEBKIT_INSTALL_CMD} from './lib/constants.js';
import {SITES, siteIndex} from './lib/sites.js';

const POSITIONS = [
    {id: Position.POINTER, name: 'Next to the pointer'},
    {id: Position.CENTER, name: 'Centered'},
];

function isValidAccelerator(text) {
    const [ok, keyval] = Gtk.accelerator_parse(text);
    return ok && keyval !== 0;
}

export default class QuickAIPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._settings = settings;

        const page = new Adw.PreferencesPage({title: 'Quick AI', icon_name: 'preferences-system-symbolic'});
        window.add(page);

        // ---- status ----
        const statusGroup = new Adw.PreferencesGroup({title: 'Status'});
        page.add(statusGroup);
        const webkitRow = new Adw.ActionRow({title: 'WebKitGTK 6', subtitle: 'Checking…', subtitle_selectable: true});
        const webkitIcon = new Gtk.Image({icon_name: 'dialog-information-symbolic'});
        webkitRow.add_prefix(webkitIcon);
        statusGroup.add(webkitRow);
        import('gi://WebKit?version=6.0').then(() => {
            webkitRow.subtitle = 'Installed';
            webkitIcon.icon_name = 'emblem-ok-symbolic';
        }, () => {
            webkitRow.subtitle = `Missing. Install it with: ${WEBKIT_INSTALL_CMD}`;
            webkitIcon.icon_name = 'dialog-warning-symbolic';
        });

        // ---- chat ----
        const chatGroup = new Adw.PreferencesGroup({title: 'Chat window'});
        page.add(chatGroup);

        const shortcutRow = new Adw.EntryRow({
            title: 'Shortcut (e.g. <Control><Alt>a)',
            text: settings.get_strv(Keys.TOGGLE_CHAT)[0] ?? '',
            show_apply_button: true,
        });
        shortcutRow.connect('apply', () => {
            const text = shortcutRow.text.trim();
            if (isValidAccelerator(text)) {
                shortcutRow.remove_css_class('error');
                settings.set_strv(Keys.TOGGLE_CHAT, [text]);
            } else {
                shortcutRow.add_css_class('error');
            }
        });
        chatGroup.add(shortcutRow);

        const siteRow = new Adw.ComboRow({
            title: 'Site',
            model: Gtk.StringList.new(SITES.map(s => s.name)),
            selected: siteIndex(settings.get_string(Keys.ACTIVE_SITE)),
        });
        siteRow.connect('notify::selected', () => {
            const site = SITES[siteRow.selected];
            if (site && settings.get_string(Keys.ACTIVE_SITE) !== site.id)
                settings.set_string(Keys.ACTIVE_SITE, site.id);
        });
        // The chat window's own switcher changes the same key.
        const siteChangedId = settings.connect(`changed::${Keys.ACTIVE_SITE}`, () => {
            const index = siteIndex(settings.get_string(Keys.ACTIVE_SITE));
            if (siteRow.selected !== index)
                siteRow.selected = index;
        });
        window.connect('close-request', () => {
            settings.disconnect(siteChangedId);
            return false;
        });
        chatGroup.add(siteRow);

        const positionRow = new Adw.ComboRow({
            title: 'Open',
            model: Gtk.StringList.new(POSITIONS.map(p => p.name)),
            selected: Math.max(0, POSITIONS.findIndex(p => p.id === settings.get_string(Keys.WINDOW_POSITION))),
        });
        positionRow.connect('notify::selected', () =>
            settings.set_string(Keys.WINDOW_POSITION, POSITIONS[positionRow.selected].id));
        chatGroup.add(positionRow);

        // ---- top bar ----
        const panelGroup = new Adw.PreferencesGroup({title: 'Top bar'});
        page.add(panelGroup);
        const iconRow = new Adw.SwitchRow({title: 'Show icon in the top bar'});
        settings.bind(Keys.SHOW_PANEL_ICON, iconRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        panelGroup.add(iconRow);
    }
}
