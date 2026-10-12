// Identifiers shared by the shell side, the chat app and prefs. Change them here only.
export const UUID = 'quick-ai@mikeluigijean.github.io';
export const SCHEMA_ID = 'org.gnome.shell.extensions.quick-ai';

// The chat app is a GTK application; its application id is also its D-Bus name and the
// Wayland app id the shell uses to recognise its window.
export const APP_ID = 'io.github.mikeluigijean.QuickAI';
export const BUS_NAME = APP_ID;
export const OBJECT_PATH = '/io/github/mikeluigijean/QuickAI';
export const IFACE = 'io.github.mikeluigijean.QuickAI1';

export const Keys = Object.freeze({
    TOGGLE_CHAT: 'toggle-chat',
    ACTIVE_SITE: 'active-site',
    WINDOW_POSITION: 'window-position',
    WINDOW_WIDTH: 'window-width',
    WINDOW_HEIGHT: 'window-height',
    PINNED: 'pinned',
    SHOW_PANEL_ICON: 'show-panel-icon',
});

export const Position = Object.freeze({POINTER: 'pointer', CENTER: 'center'});

// Exit code of app/main.js when WebKit 6 is missing; the shell turns it into an install hint.
export const EXIT_NO_WEBKIT = 2;
export const WEBKIT_INSTALL_CMD = 'sudo apt install gir1.2-webkit-6.0';
