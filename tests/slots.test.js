/**
 * Parity tests for the dashboard data-field options.
 *
 * slots.js is the single source of truth. The same option list is hand-mirrored
 * in the device resources (settings.xml, strings.xml), the on-device renderer
 * (View.mc), and the simulator (app.js, index.html). These tests assert all of
 * them agree with slots.js, so adding/renaming an option in one place but not
 * the others fails CI instead of silently shipping a mismatched face.
 *
 * Run with: npm test   (or: node tests/slots.test.js)
 * Zero dependencies — Node's built-in assert + fs.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { SLOTS, NONE_ID, THEMES } = require('../slots.js');

let passed = 0;
function test(name, fn) {
    try {
        fn();
        passed++;
        console.log('  ok   ' + name);
    } catch (e) {
        console.error('  FAIL ' + name);
        console.error('       ' + e.message);
        process.exitCode = 1;
    }
}

const ROOT = path.join(__dirname, '..');
function read(rel) {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const settingsXml = read('resources/settings/settings.xml');
const stringsXml = read('resources/strings/strings.xml');
const indexHtml = read('index.html');
const appJs = read('app.js');
const viewMc = read('source/View.mc');
const propertiesXml = read('resources/settings/properties.xml');

const REAL_SLOTS = SLOTS.filter(function (s) { return s.id !== NONE_ID; });

// --- Parsers (text-based; no XML/HTML deps) -------------------------------

// listEntries belonging to one settings.xml <setting> by its property key.
function listEntriesFor(propertyKey) {
    const re = new RegExp('propertyKey="@Properties\\.' + propertyKey + '"[\\s\\S]*?</setting>');
    const m = settingsXml.match(re);
    assert(m, 'settings.xml missing setting for @Properties.' + propertyKey);
    const entries = [];
    const er = /<listEntry value="(\d+)">@Strings\.(\w+)<\/listEntry>/g;
    let e;
    while ((e = er.exec(m[0])) !== null) {
        entries.push({ id: Number(e[1]), stringId: e[2] });
    }
    return entries;
}

// id -> text map from strings.xml.
function stringsMap() {
    const map = {};
    const r = /<string id="(\w+)">([^<]*)<\/string>/g;
    let m;
    while ((m = r.exec(stringsXml)) !== null) {
        map[m[1]] = m[2];
    }
    return map;
}

// <option> (value,label) sequence for one index.html <select> by id.
function optionsFor(selectId) {
    const re = new RegExp('<select id="' + selectId + '">([\\s\\S]*?)</select>');
    const m = indexHtml.match(re);
    assert(m, 'index.html missing <select id="' + selectId + '">');
    const opts = [];
    const r = /<option value="([^"]+)"[^>]*>([^<]*)<\/option>/g;
    let o;
    while ((o = r.exec(m[1])) !== null) {
        opts.push({ key: o[1], label: o[2] });
    }
    return opts;
}

// --- Structural integrity of slots.js itself ------------------------------

console.log('slots.js structure');

test('ids form a unique, contiguous set 0..N-1', function () {
    // Array/dropdown order is intentionally NOT id order (the "None" sentinel
    // keeps id 21 but renders last), so check the id SET rather than positions.
    const ids = SLOTS.map(function (s) { return s.id; });
    assert.strictEqual(new Set(ids).size, ids.length, 'duplicate id');
    const sorted = ids.slice().sort(function (a, b) { return a - b; });
    assert.deepStrictEqual(sorted, sorted.map(function (_, i) { return i; }));
});

test('keys and stringIds are unique', function () {
    const keys = SLOTS.map(function (s) { return s.key; });
    const strs = SLOTS.map(function (s) { return s.stringId; });
    assert.strictEqual(new Set(keys).size, keys.length, 'duplicate key');
    assert.strictEqual(new Set(strs).size, strs.length, 'duplicate stringId');
});

test('NONE_ID is the last entry, keyed "none", with no header', function () {
    const last = SLOTS[SLOTS.length - 1];
    assert.strictEqual(NONE_ID, last.id);
    assert.strictEqual(last.key, 'none');
    assert.strictEqual(last.header, null);
});

test('every real slot has a non-empty header', function () {
    REAL_SLOTS.forEach(function (s) {
        assert(typeof s.header === 'string' && s.header.length > 0, 'bad header for ' + s.key);
    });
});

// --- settings.xml: all three slots list every option, in id order ---------

console.log('settings.xml parity');

['DataLeft', 'DataCenter', 'DataRight'].forEach(function (prop) {
    test(prop + ' lists every option in id order', function () {
        const entries = listEntriesFor(prop);
        assert.deepStrictEqual(
            entries,
            SLOTS.map(function (s) { return { id: s.id, stringId: s.stringId }; })
        );
    });
});

// --- strings.xml: every label is defined and matches slots.js -------------

console.log('strings.xml parity');

test('every slot stringId is defined with the canonical label', function () {
    const map = stringsMap();
    SLOTS.forEach(function (s) {
        assert(s.stringId in map, 'strings.xml missing id ' + s.stringId);
        assert.strictEqual(map[s.stringId], s.label,
            s.stringId + ': "' + map[s.stringId] + '" != "' + s.label + '"');
    });
});

// --- index.html: all three selects mirror the option list, in order -------

console.log('index.html parity');

['slot-left', 'slot-center', 'slot-right'].forEach(function (selectId) {
    test(selectId + ' options mirror slots.js in order', function () {
        const opts = optionsFor(selectId);
        assert.deepStrictEqual(
            opts,
            SLOTS.map(function (s) { return { key: s.key, label: s.label }; })
        );
    });
});

// --- app.js: getMetricDetails maps each key to the canonical header --------

console.log('app.js parity');

test('getMetricDetails handles every real key with the right header', function () {
    REAL_SLOTS.forEach(function (s) {
        const re = new RegExp("case '" + s.key + "':\\s*return \\{ label: '" + s.header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'");
        assert(re.test(appJs), 'app.js getMetricDetails missing/mismatched case for ' + s.key + ' (header ' + s.header + ')');
    });
});

// --- View.mc: getDataFieldInfo draws each canonical header -----------------

console.log('View.mc parity');

test('getDataFieldInfo defines every real header', function () {
    REAL_SLOTS.forEach(function (s) {
        assert(viewMc.indexOf('label = "' + s.header + '";') !== -1,
            'View.mc getDataFieldInfo missing header "' + s.header + '" for id ' + s.id);
    });
});

test('clamp range admits every id and None skip covers the sentinel', function () {
    // The clamp must admit the full id range (highest id), and drawStats must
    // skip the NONE_ID slot.
    const maxId = SLOTS.reduce(function (m, s) { return Math.max(m, s.id); }, 0);
    assert(viewMc.indexOf('value > ' + maxId) !== -1,
        'View.mc clampDataFieldSetting should allow up to the max id (' + maxId + ')');
    assert(viewMc.indexOf('!= ' + NONE_ID) !== -1,
        'View.mc drawStats should filter out the NONE_ID slot');
});

// --- Color themes: parity across all five files ---------------------------

console.log('theme parity');

// (value,label) buttons from index.html's theme grid.
function themeButtons() {
    const buttons = [];
    const r = /<button class="theme-btn[^"]*" data-theme="([^"]+)"[\s\S]*?<\/span>\s*([^<]+?)\s*<\/button>/g;
    let m;
    while ((m = r.exec(indexHtml)) !== null) {
        buttons.push({ key: m[1], label: m[2] });
    }
    return buttons;
}

// Hex values (uppercase, no prefix) from the View.mc mActiveColors array.
function viewActiveColors() {
    const m = viewMc.match(/mActiveColors\s*=\s*\[([^\]]+)\]/);
    assert(m, 'View.mc mActiveColors array not found');
    return m[1].split(',').map(function (s) {
        return s.trim().replace(/^0x/i, '').toUpperCase();
    });
}

test('ids are 0..N-1 contiguous and unique', function () {
    const ids = THEMES.map(function (t) { return t.id; });
    assert.deepStrictEqual(ids, ids.map(function (_, i) { return i; }));
});

test('settings.xml ColorTheme lists every theme in order', function () {
    const entries = listEntriesFor('ColorTheme');
    assert.deepStrictEqual(
        entries,
        THEMES.map(function (t) { return { id: t.id, stringId: t.stringId }; })
    );
});

test('strings.xml defines every theme label', function () {
    const map = stringsMap();
    THEMES.forEach(function (t) {
        assert.strictEqual(map[t.stringId], t.label,
            t.stringId + ': "' + map[t.stringId] + '" != "' + t.label + '"');
    });
});

test('index.html theme buttons mirror themes in order', function () {
    assert.deepStrictEqual(
        themeButtons(),
        THEMES.map(function (t) { return { key: t.key, label: t.label }; })
    );
});

test('app.js themes map defines every theme with the right accent', function () {
    THEMES.forEach(function (t) {
        const needle = t.key + ": { primary: '#" + t.hex.toLowerCase() + "'";
        assert(appJs.indexOf(needle) !== -1,
            'app.js themes map missing/mismatched "' + t.key + '" (#' + t.hex.toLowerCase() + ')');
    });
});

test('View.mc mActiveColors matches the theme accents in order', function () {
    assert.deepStrictEqual(
        viewActiveColors(),
        THEMES.map(function (t) { return t.hex; })
    );
});

// --- Display toggles: property <-> setting parity -------------------------

console.log('toggle parity');

const TOGGLES = ['ShowSeconds', 'ShowDataFields', 'ShowDigitalTime', 'ShowBitLabels', 'ShowBattery', 'ShowDate'];

test('every display toggle has both a property and a setting', function () {
    TOGGLES.forEach(function (id) {
        assert(propertiesXml.indexOf('<property id="' + id + '" type="boolean">') !== -1,
            'properties.xml missing boolean property ' + id);
        assert(settingsXml.indexOf('propertyKey="@Properties.' + id + '"') !== -1,
            'settings.xml missing setting for ' + id);
    });
});

console.log('\n' + passed + ' assertions passed.');
