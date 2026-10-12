// The global "toggle chat" shortcut. Mutter re-reads the key itself when prefs change it.
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {Keys} from '../lib/constants.js';

export class Hotkeys {
    constructor(settings, onToggle) {
        Main.wm.addKeybinding(Keys.TOGGLE_CHAT, settings, Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW, onToggle);
    }

    destroy() {
        Main.wm.removeKeybinding(Keys.TOGGLE_CHAT);
    }
}
