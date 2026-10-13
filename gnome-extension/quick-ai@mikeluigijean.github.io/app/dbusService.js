// Exports the QuickAI1 interface (lib/dbusIface.js) that the shell side calls.
// GApplication registers on D-Bus before `startup` builds the window, so the window is attached later.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {Action, Keys} from '../lib/constants.js';
import {QUICK_AI_IFACE_XML} from '../lib/dbusIface.js';

export class QuickAIService {
    constructor({settings, onQuit}) {
        this._settings = settings;
        this._onQuit = onQuit;
        this._window = null;
        this._impl = Gio.DBusExportedObject.wrapJSObject(QUICK_AI_IFACE_XML, this);
        this._pinnedId = settings.connect(`changed::${Keys.PINNED}`, () =>
            this._impl.emit_property_changed('Pinned', GLib.Variant.new_boolean(this.Pinned)));
    }

    setWindow(chatWindow) {
        this._window = chatWindow;
        chatWindow.onVisibilityChanged = visible =>
            this._impl.emit_property_changed('Visible', GLib.Variant.new_boolean(visible));
    }

    export(connection, objectPath) {
        this._impl.export(connection, objectPath);
    }

    unexport() {
        if (this._pinnedId) {
            this._settings.disconnect(this._pinnedId);
            this._pinnedId = 0;
        }
        this._impl.unexport();
    }

    Toggle() {
        this._window?.toggle();
    }

    Show() {
        this._window?.show();
    }

    Hide() {
        this._window?.hide();
    }

    AskImage(png, action) {
        this._ask({png, action});
    }

    AskText(text, action) {
        this._ask({text, action});
    }

    // Returns at once: the reply mustn't wait for the page to load.
    _ask(request) {
        if (!Object.values(Action).includes(request.action))
            request.action = Action.ASK;
        this._window?.ask(request).catch(e => logError(e, 'Quick AI: ask failed'));
    }

    Quit() {
        // From an idle callback, so the method reply is sent before the app exits.
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this._onQuit();
            return GLib.SOURCE_REMOVE;
        });
    }

    get Visible() {
        return this._window?.visible ?? false;
    }

    get Pinned() {
        return this._settings.get_boolean(Keys.PINNED);
    }
}
