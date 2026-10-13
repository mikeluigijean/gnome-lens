// What "ask about the selection" uses: the highlighted text (PRIMARY), else the copied text,
// else a copied image.
import St from 'gi://St';

/** @param {(content: {text: string}|{png: GLib.Bytes}|null) => void} callback */
export function readSelection(callback) {
    const clipboard = St.Clipboard.get_default();
    clipboard.get_text(St.ClipboardType.PRIMARY, (_c, primary) => {
        if (primary?.trim()) {
            callback({text: primary});
            return;
        }
        clipboard.get_text(St.ClipboardType.CLIPBOARD, (_c2, copied) => {
            if (copied?.trim()) {
                callback({text: copied});
                return;
            }
            clipboard.get_content(St.ClipboardType.CLIPBOARD, 'image/png', (_c3, bytes) =>
                callback(bytes?.get_size() ? {png: bytes} : null));
        });
    });
}
