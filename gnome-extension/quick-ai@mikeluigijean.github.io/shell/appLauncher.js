// Talks to the chat app over D-Bus, starting it on first use.
// Calls made while the app isn't on the bus are queued; the app is spawned only after the name
// watch has reported "vanished", so a running instance is never started twice.
import Gio from 'gi://Gio';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {BUS_NAME, EXIT_NO_WEBKIT, IFACE, OBJECT_PATH, WEBKIT_INSTALL_CMD} from '../lib/constants.js';

export class AppLauncher {
    /** @param {Gio.File} extensionDir */
    constructor(extensionDir) {
        this._mainJs = extensionDir.get_child('app').get_child('main.js').get_path();
        this._onBus = false;
        this._watchReported = false;
        this._pending = [];
        this._proc = null;
        this._cancellable = new Gio.Cancellable();
        this._watchId = Gio.bus_watch_name(Gio.BusType.SESSION, BUS_NAME, Gio.BusNameWatcherFlags.NONE,
            () => this._onAppeared(), () => this._onVanished());
    }

    call(method) {
        if (this._onBus) {
            this._send(method);
            return;
        }
        this._pending.push(method);
        if (this._watchReported && !this._proc)
            this._spawn();
    }

    /** Ask a running app to quit (its cookies are already on disk). */
    quitApp() {
        if (this._onBus)
            this._send('Quit');
    }

    destroy() {
        this._cancellable.cancel();
        Gio.bus_unwatch_name(this._watchId);
        this._pending = [];
        this._proc = null;
    }

    _onAppeared() {
        this._onBus = true;
        this._watchReported = true;
        const pending = this._pending;
        this._pending = [];
        pending.forEach(method => this._send(method));
    }

    _onVanished() {
        this._onBus = false;
        this._watchReported = true;
        if (this._pending.length && !this._proc)
            this._spawn();
    }

    _spawn() {
        let proc;
        try {
            // stderr is inherited, so the app's messages land in the journal next to gnome-shell's.
            proc = Gio.Subprocess.new(['gjs', '-m', this._mainJs], Gio.SubprocessFlags.NONE);
        } catch (e) {
            this._fail(`Cannot start the chat app: ${e.message}`);
            return;
        }
        this._proc = proc;
        proc.wait_async(this._cancellable, (p, result) => {
            try {
                p.wait_finish(result);
            } catch {
                return; // cancelled by destroy()
            }
            if (this._proc === p)
                this._proc = null;
            const code = p.get_if_exited() ? p.get_exit_status() : -1;
            if (code === EXIT_NO_WEBKIT)
                this._fail(`WebKitGTK 6 is missing. Install it with: ${WEBKIT_INSTALL_CMD}`);
            else if (code !== 0 && this._pending.length)
                this._fail(`The chat app stopped unexpectedly (code ${code}). See: journalctl -b -o cat /usr/bin/gnome-shell`);
        });
    }

    _send(method) {
        Gio.DBus.session.call(BUS_NAME, OBJECT_PATH, IFACE, method, null, null,
            Gio.DBusCallFlags.NONE, -1, null, (connection, result) => {
                try {
                    connection.call_finish(result);
                } catch (e) {
                    logError(e, `Quick AI: ${method} failed`);
                }
            });
    }

    _fail(message) {
        this._pending = [];
        Main.notify('Quick AI', message);
    }
}
