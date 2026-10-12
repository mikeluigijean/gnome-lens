// One persistent WebKit network session shared by all site views, so logins survive restarts.
// WebKit is passed in because main.js imports it dynamically (to report a missing install).
import GLib from 'gi://GLib';

export function createWebSession(WebKit) {
    const dataDir = GLib.build_filenamev([GLib.get_user_data_dir(), 'quick-ai']);
    const cacheDir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'quick-ai']);
    for (const dir of [dataDir, cacheDir])
        GLib.mkdir_with_parents(dir, 0o700);

    const session = WebKit.NetworkSession.new(dataDir, cacheDir);
    const cookies = session.get_cookie_manager();
    cookies.set_accept_policy(WebKit.CookieAcceptPolicy.ALWAYS);
    cookies.set_persistent_storage(
        GLib.build_filenamev([dataDir, 'cookies.sqlite']),
        WebKit.CookiePersistentStorage.SQLITE);
    return session;
}
