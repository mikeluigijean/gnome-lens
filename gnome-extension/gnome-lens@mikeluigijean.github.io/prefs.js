// Preferences: shortcut, site, window position, panel icon, and whether WebKit 6 is installed.
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {Keys, Position, WEBKIT_INSTALL_CMD} from './lib/constants.js';
import {LANGUAGES, targetLanguage} from './lib/prompts.js';
import {SITES, siteIndex} from './lib/sites.js';

const DICT_URL = 'https://github.com/sunwxg/gnome-shell-extension-dict';

const POSITIONS = [
    {id: Position.POINTER, name: 'Next to the pointer'},
    {id: Position.CENTER, name: 'Centered'},
];

function isValidAccelerator(text) {
    const [ok, keyval] = Gtk.accelerator_parse(text);
    return ok && keyval !== 0;
}

/** Entry row editing a shortcut key (`as`); invalid input turns red and isn't saved. */
function shortcutRow(settings, key, title) {
    const row = new Adw.EntryRow({
        title: `${title} (e.g. <Control><Alt>a)`,
        use_markup: false, // the example would be parsed as markup tags
        text: settings.get_strv(key)[0] ?? '',
        show_apply_button: true,
    });
    row.connect('apply', () => {
        const text = row.text.trim();
        if (isValidAccelerator(text)) {
            row.remove_css_class('error');
            settings.set_strv(key, [text]);
        } else {
            row.add_css_class('error');
        }
    });
    return row;
}

/** Dropdown for the translation language; the first entry ('' in settings) follows the system. */
function languageRow(settings) {
    const current = settings.get_string(Keys.TRANSLATE_LANGUAGE);
    // A value set outside prefs (e.g. with gsettings) is kept as an extra entry.
    const values = ['', ...LANGUAGES];
    if (current && !values.includes(current))
        values.push(current);
    const names = [`System language (${targetLanguage(GLib.get_language_names())})`, ...values.slice(1)];
    const row = new Adw.ComboRow({
        title: 'Translate into',
        model: Gtk.StringList.new(names),
        expression: new Gtk.PropertyExpression(Gtk.StringObject, null, 'string'),
        enable_search: true,
        selected: Math.max(0, values.indexOf(current)),
    });
    row.connect('notify::selected', () => settings.set_string(Keys.TRANSLATE_LANGUAGE, values[row.selected] ?? ''));
    return row;
}

export default class GnomeLensPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._settings = settings;

        const page = new Adw.PreferencesPage({title: 'Gnome Lens', icon_name: 'preferences-system-symbolic'});
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

        chatGroup.add(shortcutRow(settings, Keys.TOGGLE_CHAT, 'Shortcut'));

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

        // ---- lens ----
        const lensGroup = new Adw.PreferencesGroup({
            title: 'Lens',
            description: 'Send part of the screen or the selected text to the chat. Nothing is sent until you press Enter.',
        });
        page.add(lensGroup);
        lensGroup.add(shortcutRow(settings, Keys.LENS, 'Capture an area'));
        lensGroup.add(shortcutRow(settings, Keys.ASK_SELECTION, 'Ask about the selection'));
        const cardRow = new Adw.SwitchRow({
            title: 'Offer “Ask Gnome Lens” after screenshots',
            subtitle: 'A card in the top-right corner after each screenshot',
        });
        settings.bind(Keys.SCREENSHOT_CARD, cardRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        lensGroup.add(cardRow);
        lensGroup.add(languageRow(settings));

        // ---- top bar ----
        const panelGroup = new Adw.PreferencesGroup({title: 'Top bar'});
        page.add(panelGroup);
        const iconRow = new Adw.SwitchRow({title: 'Show icon in the top bar'});
        settings.bind(Keys.SHOW_PANEL_ICON, iconRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        panelGroup.add(iconRow);

        // ---- about ----
        const aboutGroup = new Adw.PreferencesGroup({title: 'About'});
        page.add(aboutGroup);
        const creditRow = new Adw.ActionRow({
            title: 'Inspired by Screen word translate',
            subtitle: 'by Xiaoguang Wang (MIT)',
        });
        const creditLink = new Gtk.LinkButton({uri: DICT_URL, label: 'Source', valign: Gtk.Align.CENTER});
        creditRow.add_suffix(creditLink);
        creditRow.activatable_widget = creditLink;
        aboutGroup.add(creditRow);
    }
}
