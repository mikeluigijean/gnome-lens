// The chat app: a separate gjs process (gnome-shell can't host WebKit), started and driven by the
// extension over D-Bus.  Run: gjs -m app/main.js
// Exit code 2 = WebKit 6 missing; the shell side turns it into an "install gir1.2-webkit-6.0" notification.
import Adw from 'gi://Adw?version=1';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import System from 'system';

import {APP_ID, EXIT_NO_WEBKIT, WEBKIT_INSTALL_CMD} from '../lib/constants.js';
import {GnomeLensService} from './dbusService.js';
import {getSettings} from './settings.js';
import {createWebSession} from './webSession.js';
import {ChatWindow} from './window.js';

let WebKit;
try {
    WebKit = (await import('gi://WebKit?version=6.0')).default;
} catch (e) {
    printerr(`Gnome Lens: WebKit 6 is not available (${e.message}). ` +
        `Install it with: ${WEBKIT_INSTALL_CMD}`);
    System.exit(EXIT_NO_WEBKIT);
}

const GnomeLensApp = GObject.registerClass(
class GnomeLensApp extends Adw.Application {
    _init(settings) {
        super._init({application_id: APP_ID, flags: Gio.ApplicationFlags.DEFAULT_FLAGS});
        this._settings = settings;
        this._service = null;
        this._chatWindow = null;
    }

    // The GApplication object path is OBJECT_PATH, so the service lives next to org.gtk.Application.
    vfunc_dbus_register(connection, objectPath) {
        if (!super.vfunc_dbus_register(connection, objectPath))
            return false;
        this._service = new GnomeLensService({settings: this._settings, onQuit: () => this.quit()});
        this._service.export(connection, objectPath);
        return true;
    }

    vfunc_dbus_unregister(connection, objectPath) {
        this._service?.unexport();
        this._service = null;
        super.vfunc_dbus_unregister(connection, objectPath);
    }

    vfunc_startup() {
        super.vfunc_startup();
        this.hold(); // stay alive while the window is hidden
        this._chatWindow = new ChatWindow({
            app: this,
            settings: this._settings,
            WebKit,
            session: createWebSession(WebKit),
        });
        this._service?.setWindow(this._chatWindow);
    }

    // The window starts hidden and only D-Bus calls show it, so a second launch doesn't toggle.
    vfunc_activate() {
    }

    vfunc_shutdown() {
        this._chatWindow?.destroy();
        this._chatWindow = null;
        super.vfunc_shutdown();
    }
});

const app = new GnomeLensApp(getSettings());
const status = await app.runAsync([System.programInvocationName, ...ARGV]);
System.exit(status);
