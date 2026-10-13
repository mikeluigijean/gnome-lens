// Global shortcuts, keyed by their settings key. Mutter re-reads a key itself when prefs change it.
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class Hotkeys {
    /** @param {Object<string, Function>} bindings settings key -> callback */
    constructor(settings, bindings) {
        this._keys = Object.keys(bindings);
        for (const [key, callback] of Object.entries(bindings)) {
            Main.wm.addKeybinding(key, settings, Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW, callback);
        }
    }

    destroy() {
        for (const key of this._keys)
            Main.wm.removeKeybinding(key);
    }
}
