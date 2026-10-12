// Unit tests for the extension's pure-JS modules.  Run:  gjs -m tests-js/run.js
import Gio from 'gi://Gio';

const EXT = '../gnome-extension/quick-ai@mikeluigijean.github.io/lib';
const {computePosition} = await import(`${EXT}/placement.js`);
const {SITES, findSite, siteIndex, DEFAULT_SITE_ID} = await import(`${EXT}/sites.js`);
const {QUICK_AI_IFACE_XML} = await import(`${EXT}/dbusIface.js`);
const {IFACE, Position} = await import(`${EXT}/constants.js`);

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

function eq(actual, expected, msg = '') {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a !== e)
        throw new Error(`${msg}\n  expected ${e}\n  got      ${a}`);
}

// ---------- placement ----------
const WORKAREA = {x: 0, y: 32, width: 1920, height: 1048}; // top bar of 32 px
const FRAME = {width: 480, height: 720};
const at = (x, y, mode = Position.POINTER) =>
    computePosition({pointer: {x, y}, frame: FRAME, workarea: WORKAREA, mode});

test('pointer: right of the pointer, vertically centered', () => {
    eq(at(100, 500), [100, 140]);
});
test('pointer: flips to the left near the right edge', () => {
    eq(at(1800, 500), [1320, 140]);
});
test('pointer: clamped below the top bar', () => {
    eq(at(100, 40), [100, 32]);
});
test('pointer: clamped above the bottom edge', () => {
    eq(at(100, 1070), [100, 360]);
});
test('pointer: second monitor offset is respected', () => {
    const p = computePosition({pointer: {x: 1930, y: 500}, frame: FRAME,
        workarea: {x: 1920, y: 0, width: 1920, height: 1080}, mode: Position.POINTER});
    eq(p, [1930, 140]);
});
test('pointer: window larger than work area sticks to its top-left', () => {
    const p = computePosition({pointer: {x: 10, y: 10}, frame: {width: 3000, height: 3000},
        workarea: WORKAREA, mode: Position.POINTER});
    eq(p, [0, 32]);
});
test('center mode', () => {
    eq(at(0, 0, Position.CENTER), [720, 196]);
});

// ---------- sites ----------
test('site ids are unique and URLs are https', () => {
    eq(new Set(SITES.map(s => s.id)).size, SITES.length);
    for (const s of SITES)
        eq(s.url.startsWith('https://'), true, s.id);
});
test('unknown site id falls back to the default', () => {
    eq(findSite('nope').id, DEFAULT_SITE_ID);
    eq(siteIndex('claude'), 1);
});

// ---------- D-Bus interface ----------
test('interface XML parses and has the expected members', () => {
    const iface = Gio.DBusNodeInfo.new_for_xml(QUICK_AI_IFACE_XML).lookup_interface(IFACE);
    eq(iface.methods.map(m => m.name), ['Toggle', 'Show', 'Hide', 'Quit']);
    eq(iface.properties.map(p => p.name), ['Visible', 'Pinned']);
});

// ---------- run ----------
let failed = 0;
for (const [name, fn] of tests) {
    try {
        await fn();
        print(`ok   ${name}`);
    } catch (e) {
        failed++;
        print(`FAIL ${name}: ${e.message}`);
    }
}
print(`\n${tests.length - failed}/${tests.length} passed`);
if (failed)
    imports.system.exit(1);
