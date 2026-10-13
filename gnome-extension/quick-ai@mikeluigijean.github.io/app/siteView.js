// A web view of one AI site. Contract shared with future views (e.g. a native API chat):
// `widget` to put in the window, `load()` which loads at most once, `ask(payload)` (Lens).
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk?version=4.0';

import {inject} from './injector.js';

export class SiteView {
    constructor(WebKit, site, session, {onFileChooser} = {}) {
        this._WebKit = WebKit;
        this._site = site;
        this._loaded = false;
        this._view = new WebKit.WebView({network_session: session, hexpand: true, vexpand: true});
        this._firstLoad = new Promise(resolve => {
            const id = this._view.connect('load-changed', (_view, event) => {
                if (event === WebKit.LoadEvent.FINISHED) {
                    this._view.disconnect(id);
                    resolve();
                }
            });
        });
        // Sign-in flows (OAuth, Google) open popups; without this they silently do nothing.
        this._view.connect('create', () => this._createPopup());
        this._view.connect('run-file-chooser', () => {
            onFileChooser?.();
            return false; // let WebKit show its default chooser
        });
    }

    get widget() {
        return this._view;
    }

    load() {
        if (this._loaded)
            return;
        this._loaded = true;
        this._view.load_uri(this._site.url);
    }

    /**
     * Attach an image and/or text to the prompt box (never sends).
     * @param {{png?: Uint8Array, text?: string}} payload
     */
    async ask(payload) {
        this.load();
        await this._firstLoad;
        this._view.grab_focus();
        return inject(this._view, {...payload, composer: this._site.composer ?? ''});
    }

    _createPopup() {
        const popup = new this._WebKit.WebView({related_view: this._view});
        const parent = this._view.get_root();
        const win = new Gtk.Window({
            // Same application, so the main window's auto-hide sees it as one of ours.
            application: parent?.get_application?.() ?? null,
            transient_for: parent,
            default_width: 500,
            default_height: 650,
            child: popup,
        });
        popup.bind_property('title', win, 'title', GObject.BindingFlags.SYNC_CREATE);
        popup.connect('ready-to-show', () => win.present());
        popup.connect('close', () => win.destroy());
        return popup;
    }
}
