// Finds the chat window and places it each time it appears. On GTK4/Wayland every show creates
// a new MetaWindow, so placement happens on each window's first `shown`. Sign-in popups
// (transient windows of the app) are left alone.
import {APP_ID, Keys} from '../lib/constants.js';
import {computePosition} from '../lib/placement.js';

function isChatWindow(win) {
    return (win.get_gtk_application_id() === APP_ID || win.get_wm_class() === APP_ID) &&
        !win.get_transient_for();
}

export class WindowTracker {
    constructor(settings) {
        this._settings = settings;
        this._window = null;
        this._unmanagedId = 0;
        this._shownIds = new Map(); // MetaWindow -> `shown` handler, until it fires
        this._createdId = global.display.connect('window-created', (_display, win) => this._onCreated(win));
    }

    /** If the chat window is open but unfocused or on another workspace, bring it here. */
    bringHereIfAway() {
        const win = this._window;
        if (!win)
            return false;
        const workspace = global.workspace_manager.get_active_workspace();
        const elsewhere = !win.is_on_all_workspaces() && win.get_workspace() !== workspace;
        if (win.has_focus() && !elsewhere)
            return false;
        if (elsewhere)
            win.change_workspace(workspace);
        win.activate(global.get_current_time());
        return true;
    }

    destroy() {
        global.display.disconnect(this._createdId);
        for (const [win, id] of this._shownIds)
            win.disconnect(id);
        this._shownIds.clear();
        this._untrack();
    }

    _onCreated(win) {
        // App id and parent may not be known yet at creation time, so check once it's shown.
        const id = win.connect('shown', () => {
            win.disconnect(id);
            this._shownIds.delete(win);
            if (isChatWindow(win))
                this._track(win);
        });
        this._shownIds.set(win, id);
    }

    _track(win) {
        this._untrack();
        this._window = win;
        this._unmanagedId = win.connect('unmanaged', () => this._untrack());
        this._place(win);
    }

    _untrack() {
        if (this._window && this._unmanagedId)
            this._window.disconnect(this._unmanagedId);
        this._window = null;
        this._unmanagedId = 0;
    }

    _place(win) {
        const workspace = global.workspace_manager.get_active_workspace();
        if (win.get_workspace() !== workspace)
            win.change_workspace(workspace);
        const [px, py] = global.get_pointer();
        const [x, y] = computePosition({
            pointer: {x: px, y: py},
            frame: win.get_frame_rect(),
            workarea: workspace.get_work_area_for_monitor(global.display.get_current_monitor()),
            mode: this._settings.get_string(Keys.WINDOW_POSITION),
        });
        win.move_frame(true, x, y);
        win.activate(global.get_current_time());
    }
}
