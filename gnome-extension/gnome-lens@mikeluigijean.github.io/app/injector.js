// Puts an image and/or text into a chat site's prompt box. Never presses send.
// Images go in through a synthetic `paste` event carrying a File, which doesn't touch the user's
// clipboard (verified on ChatGPT and Gemini, WebKitGTK 6). Text is tried with execCommand('insertText'),
// then a synthetic text paste; the caller falls back to the real clipboard if both fail.
import GLib from 'gi://GLib';

const COMPOSER_WAIT_MS = 10000;

// Runs in the page as the body of an async function; arguments come from the a{sv} below.
const PAGE_SCRIPT = `
const sleep = ms => new Promise(r => setTimeout(r, ms));
const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
const area = el => { const r = el.getBoundingClientRect(); return r.width * r.height; };
// The prompt box: the largest visible editable element.
function findComposer() {
    const all = [...document.querySelectorAll('[contenteditable="true"], textarea')].filter(visible);
    all.sort((a, b) => area(b) - area(a));
    return all[0] ?? null;
}
const read = el => el.value ?? el.textContent; // not innerText: it needs layout
function caretAtEnd(el) {
    el.focus();
    if (el.tagName === 'TEXTAREA') {
        el.setSelectionRange(el.value.length, el.value.length);
        return;
    }
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}
function paste(el, dataTransfer) {
    const event = new ClipboardEvent('paste', {clipboardData: dataTransfer, bubbles: true, cancelable: true});
    return !el.dispatchEvent(event); // true when the page handled it
}

let composer = null;
for (let waited = 0; !(composer = findComposer()) && waited < waitMs; waited += 250)
    await sleep(250);
if (!composer)
    return {composer: false};
const report = {composer: true};

// Server-rendered composers exist before the site's paste handler is attached, so an unhandled
// paste (a no-op) is retried until the page takes it.
if (imageBase64) {
    const binary = atob(imageBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++)
        bytes[i] = binary.charCodeAt(i);
    const file = new File([bytes], 'screenshot.png', {type: 'image/png'});
    for (let waited = 0; waited <= waitMs; waited += 500) {
        const data = new DataTransfer();
        data.items.add(file);
        composer = findComposer() ?? composer;
        composer.focus();
        if ((report.image = paste(composer, data)))
            break;
        await sleep(500);
    }
    await sleep(500); // let the site add its attachment before typing
}

// Hydration can also replace the composer and drop typed text: check it's still there, retry if not.
const contains = el => read(el).replace(/\\s+/g, ' ').includes(text.trim().replace(/\\s+/g, ' ').slice(0, 40));
for (let attempt = 0; text && attempt < 3 && !report.text; attempt++) {
    composer = findComposer() ?? composer;
    if (!contains(composer)) {
        caretAtEnd(composer);
        document.execCommand('insertText', false, text);
        await sleep(300);
        if (!contains(composer)) {
            const data = new DataTransfer();
            data.setData('text/plain', text);
            caretAtEnd(composer);
            paste(composer, data);
        }
    }
    await sleep(1000);
    report.text = contains(findComposer() ?? composer);
}

return report;
`;

/**
 * @param {WebKit.WebView} webView a loaded view
 * @param {{png?: Uint8Array, text?: string}} payload
 * @returns {Promise<{composer: boolean, text?: boolean, image?: boolean}>}
 */
export function inject(webView, {png = null, text = ''}) {
    const args = new GLib.Variant('a{sv}', {
        imageBase64: new GLib.Variant('s', png ? GLib.base64_encode(png) : ''),
        text: new GLib.Variant('s', text),
        waitMs: new GLib.Variant('i', COMPOSER_WAIT_MS),
    });
    return new Promise((resolve, reject) => {
        webView.call_async_javascript_function(PAGE_SCRIPT, -1, args, null, null, null, (view, result) => {
            try {
                resolve(JSON.parse(view.call_async_javascript_function_finish(result).to_json(0)));
            } catch (e) {
                reject(e);
            }
        });
    });
}
