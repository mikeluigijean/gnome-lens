// GSettings for the chat app. The app isn't inside gnome-shell, so it loads the extension's own
// compiled schema (schemas/gschemas.compiled, built by install.sh) instead of the system one.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {SCHEMA_ID} from '../lib/constants.js';

export function getSettings() {
    const [thisFile] = GLib.filename_from_uri(import.meta.url);
    const extDir = GLib.path_get_dirname(GLib.path_get_dirname(thisFile));
    const schemaDir = GLib.build_filenamev([extDir, 'schemas']);

    let source;
    try {
        source = Gio.SettingsSchemaSource.new_from_directory(
            schemaDir, Gio.SettingsSchemaSource.get_default(), false);
    } catch (e) {
        throw new Error(`Cannot load schemas from ${schemaDir} (${e.message}). ` +
            `Run install.sh or glib-compile-schemas ${schemaDir}`);
    }
    const schema = source.lookup(SCHEMA_ID, false);
    if (!schema)
        throw new Error(`Schema ${SCHEMA_ID} not found in ${schemaDir}`);
    return new Gio.Settings({settings_schema: schema});
}
