// Exports the GnomeLens1 interface (lib/dbusIface.js) that the shell side calls.
// GApplication registers on D-Bus before `startup` builds the window, so the window is attached later.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {Action} from '../lib/constants.js';
import {GNOME_LENS_IFACE_XML} from '../lib/dbusIface.js';

export class GnomeLensService {
    constructor({onQuit}) {
        this._onQuit = onQuit;
        this._window = null;
        this._impl = Gio.DBusExportedObject.wrapJSObject(GNOME_LENS_IFACE_XML, this);
    }

    setWindow(chatWindow) {
        this._window = chatWindow;
    }

    export(connection, objectPath) {
        this._impl.export(connection, objectPath);
    }

    unexport() {
        this._impl.unexport();
    }

    Toggle() {
        this._window?.toggle();
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
        this._window?.ask(request).catch(e => logError(e, 'Gnome Lens: ask failed'));
    }

    Quit() {
        // From an idle callback, so the method reply is sent before the app exits.
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this._onQuit();
            return GLib.SOURCE_REMOVE;
        });
    }
}
