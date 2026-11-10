const { test } = require('node:test');
const assert = require('node:assert/strict');
const { project, pick, canPlace } = require('../isometric.js');

const origin = { x: 450, y: 700 / 6 };
const emptyGrid = () => Array.from({ length: 12 }, () => Array(12).fill(0));
const size = { w: 2, h: 1 };
const reserved = [{ x: 0, y: 11 }, { x: 2, y: 2 }, { x: 11, y: 0 }];

test('every tile picks its own center, including the last row and column', () => {
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
        const p = project(x + 0.5, y + 0.5, 56, origin);
        assert.deepEqual(pick(p.x, p.y, 56, origin), { x, y });
    }
});

test('points on either side of a cell boundary pick different cells', () => {
    for (const [x, expectedX] of [[3.99, 3], [4.01, 4], [-0.01, -1]]) {
        const p = project(x, 5.5, 56, origin);
        assert.deepEqual(pick(p.x, p.y, 56, origin), { x: expectedX, y: 5 });
    }
});

test('picking uses the supplied viewport origin and tile scale', () => {
    const shifted = { x: 200, y: 30 };
    const p = project(7.25, 2.75, 80, shifted);
    assert.deepEqual(pick(p.x, p.y, 80, shifted), { x: 7, y: 2 });
});

test('placement accepts a footprint exactly within the grid', () => {
    assert.equal(canPlace(emptyGrid(), 10, 11, size, []), true);
});

test('placement rejects out-of-bounds and fractional origins', () => {
    for (const [x, y] of [[11, 11], [-1, 0], [0, 12], [1.5, 1]]) {
        assert.equal(canPlace(emptyGrid(), x, y, size, reserved), false);
    }
});

test('the entire footprint must be free, without mutating the grid', () => {
    const grid = emptyGrid();
    grid[4][5] = { type: 'produce' };
    const before = JSON.stringify(grid);
    assert.equal(canPlace(grid, 4, 4, size, reserved), false);
    assert.equal(canPlace(grid, 3, 4, size, reserved), true);
    assert.equal(JSON.stringify(grid), before);
});

test('entrance, checkout and stock room stay free, including footprint overlap', () => {
    for (const p of reserved) assert.equal(canPlace(emptyGrid(), p.x, p.y, { w: 1, h: 1 }, reserved), false);
    assert.equal(canPlace(emptyGrid(), 1, 2, size, reserved), false);
});
