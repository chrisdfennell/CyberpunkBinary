/**
 * Unit tests for the binary time encoding (binary.js).
 *
 * This locks down the exact set of lit dots for known times so the simulator
 * and the on-device Monkey C (source/View.mc) can't silently disagree about
 * how the clock reads. Run with: npm test  (or: node tests/binary.test.js)
 *
 * Zero dependencies — uses Node's built-in assert.
 */
const assert = require('assert');
const BinaryClock = require('../binary.js');

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

// Collapse columns into a sorted list of "col:row" keys for lit dots, which is
// easy to eyeball and compare.
function activeKeys(columns) {
    const keys = [];
    columns.forEach(function (col, c) {
        col.rows.forEach(function (cell) {
            if (cell.active) {
                keys.push(c + ':' + cell.row);
            }
        });
    });
    return keys.sort();
}

console.log('BCD mode');

test('10:26:53 lights the exact expected dots', function () {
    const cols = BinaryClock.bcdColumns(10, 26, 53, true);
    // hTens=1, hOnes=0, mTens=2, mOnes=6, sTens=5, sOnes=3
    assert.deepStrictEqual(activeKeys(cols), [
        '0:3',            // hTens=1 -> bit 1
        '1:4',            // hOnes=0 -> zero-row
        '2:2',            // mTens=2 -> bit 2
        '3:1', '3:2',     // mOnes=6 -> bits 4 + 2
        '4:1', '4:3',     // sTens=5 -> bits 4 + 1
        '5:2', '5:3',     // sOnes=3 -> bits 2 + 1
    ].sort());
});

test('hour-tens column only renders its bottom 3 rows', function () {
    // 23h: hTens=2 should light bit-2 row (row 2) and nothing in rows 0/1.
    const cols = BinaryClock.bcdColumns(23, 0, 0, false);
    const hTens = cols[0];
    assert.strictEqual(hTens.startRow, 2);
    assert.strictEqual(hTens.rows[0].present, false);
    assert.strictEqual(hTens.rows[1].present, false);
    assert.strictEqual(hTens.rows[2].active, true);  // value 2 -> bit 2
});

test('zero value lights the indicator row and nothing else', function () {
    const cols = BinaryClock.bcdColumns(10, 0, 0, false);
    const mOnes = cols[3]; // value 0
    const lit = mOnes.rows.filter(function (r) { return r.active; });
    assert.strictEqual(lit.length, 1);
    assert.strictEqual(lit[0].bit, 0); // the "is zero" row
});

test('showSeconds toggles the seconds columns in/out', function () {
    assert.strictEqual(BinaryClock.bcdColumns(1, 2, 3, false).length, 4);
    assert.strictEqual(BinaryClock.bcdColumns(1, 2, 3, true).length, 6);
});

console.log('Pure binary mode');

test('10:26:53 lights the exact expected dots', function () {
    const cols = BinaryClock.pureColumns(10, 26, 53, true);
    // hour=10 (8+2), min=26 (16+8+2), sec=53 (32+16+4+1)
    assert.deepStrictEqual(activeKeys(cols), [
        '0:2', '0:4',                 // 10 -> bits 8 + 2
        '1:1', '1:2', '1:4',          // 26 -> bits 16 + 8 + 2
        '2:0', '2:1', '2:3', '2:5',   // 53 -> bits 32 + 16 + 4 + 1
    ].sort());
});

test('hours column skips the 32 row', function () {
    const cols = BinaryClock.pureColumns(23, 0, 0, false);
    assert.strictEqual(cols[0].startRow, 1);
    assert.strictEqual(cols[0].rows[0].present, false); // 32-row never drawn for hours
});

test('midnight hour 0 lights only the zero-indicator row', function () {
    const cols = BinaryClock.pureColumns(0, 0, 0, true);
    const lit = cols[0].rows.filter(function (r) { return r.active; });
    assert.strictEqual(lit.length, 1);
    assert.strictEqual(lit[0].bit, 0);
});

console.log('\n' + passed + ' assertions passed.');
