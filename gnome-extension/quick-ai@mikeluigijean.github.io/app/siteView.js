// A web view of one AI site. Contract shared with future views (e.g. a native API chat):
// `widget` to put in the window, `load()` which loads at most once.
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk?version=4.0';

export class SiteView {
    constructor(WebKit, site, session, {onFileChooser} = {}) {
        this._WebKit = WebKit;
        this._site = site;
        this._loaded = false;
        this._view = new WebKit.WebView({network_session: session, hexpand: true, vexpand: true});
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
