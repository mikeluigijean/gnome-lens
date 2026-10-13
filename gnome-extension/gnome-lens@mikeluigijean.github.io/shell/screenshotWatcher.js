// Reacts to screenshots taken with GNOME's own screenshot UI (public 'screenshot-taken' signal,
// no patching). openLens() opens that UI and marks the next screenshot as a Lens request.
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// The UI closes before it captures and emits; a cancelled Lens must not hijack a later screenshot.
const LENS_EXPIRY_S = 3;

export class ScreenshotWatcher {
    /** @param {(file: Gio.File, isLens: boolean) => void} onScreenshot */
    constructor(onScreenshot) {
        this._ui = Main.screenshotUI;
        this._lensPending = false;
        this._expiryId = 0;
        this._takenId = this._ui.connect('screenshot-taken', (_ui, file) => {
            const isLens = this._lensPending;
            this._clearLens();
            onScreenshot(file, isLens);
        });
        this._visibleId = this._ui.connect('notify::visible', () => {
            if (!this._ui.visible && this._lensPending && !this._expiryId) {
                this._expiryId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, LENS_EXPIRY_S, () => {
                    this._expiryId = 0;
                    this._lensPending = false;
                    return GLib.SOURCE_REMOVE;
                });
            }
        });
    }

    openLens() {
        this._clearLens();
        this._lensPending = true;
        this._ui.open().catch(e => {
            this._clearLens();
            logError(e, 'Gnome Lens: cannot open the screenshot UI');
        });
    }

    destroy() {
        this._clearLens();
        this._ui.disconnect(this._takenId);
        this._ui.disconnect(this._visibleId);
    }

    _clearLens() {
        this._lensPending = false;
        if (this._expiryId) {
            GLib.source_remove(this._expiryId);
            this._expiryId = 0;
        }
    }
}
