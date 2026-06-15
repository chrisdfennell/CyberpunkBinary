/**
 * BinaryClock — pure time→dot encoding shared by the simulator (app.js) and
 * the unit tests (tests/binary.test.js). Keeping this logic in one place is
 * what stops the browser simulator from drifting away from the on-device
 * Monkey C logic in source/View.mc. It draws nothing; it only decides which
 * dots are lit. Geometry (pixel positions) stays in the renderer.
 *
 * Works in both the browser (attaches window.BinaryClock) and Node (exports).
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.BinaryClock = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    // Row bit weights, top → bottom. The trailing 0 is the "value is zero"
    // indicator row (lit only when the whole column value is 0).
    const BCD_ROW_BITS = [8, 4, 2, 1, 0];
    const PURE_ROW_BITS = [32, 16, 8, 4, 2, 1, 0];

    function bitActive(value, bit) {
        return bit === 0 ? value === 0 : (value & bit) !== 0;
    }

    // Builds one column descriptor: its value, the first drawn row index
    // (rows above startRow are intentionally blank), and a per-row breakdown.
    function buildColumn(value, startRow, rowBits) {
        const rows = rowBits.map((bit, r) => ({
            bit: bit,
            row: r,
            present: r >= startRow,
            active: r >= startRow && bitActive(value, bit),
        }));
        return { value: value, startRow: startRow, rows: rows };
    }

    // BCD mode: hTens, hOnes, mTens, mOnes [, sTens, sOnes].
    // Hour-tens uses only 3 rows (bits 2,1,0); the tens of minutes/seconds use
    // 4 rows (bits 4,2,1,0) — matching View.mc colStartRow logic.
    function bcdColumns(hour, min, sec, showSeconds) {
        const values = [
            Math.floor(hour / 10), hour % 10,
            Math.floor(min / 10), min % 10,
        ];
        if (showSeconds) {
            values.push(Math.floor(sec / 10), sec % 10);
        }
        return values.map(function (value, c) {
            let startRow = 0;
            if (c === 0) {
                startRow = 2;
            } else if (c === 2 || c === 4) {
                startRow = 1;
            }
            return buildColumn(value, startRow, BCD_ROW_BITS);
        });
    }

    // Pure binary mode: hour, min [, sec]. Hours skip the 32 row (bit fits in
    // 16 down to 0); minutes/seconds use all 7 rows.
    function pureColumns(hour, min, sec, showSeconds) {
        const values = [hour, min];
        if (showSeconds) {
            values.push(sec);
        }
        return values.map(function (value, c) {
            const startRow = c === 0 ? 1 : 0;
            return buildColumn(value, startRow, PURE_ROW_BITS);
        });
    }

    return {
        BCD_ROW_BITS: BCD_ROW_BITS,
        PURE_ROW_BITS: PURE_ROW_BITS,
        bitActive: bitActive,
        bcdColumns: bcdColumns,
        pureColumns: pureColumns,
    };
});
