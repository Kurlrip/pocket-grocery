const { test } = require('node:test');
const assert = require('node:assert/strict');
const S = require('../game-core.js');
function run(s, seconds) {
    for (let i = 0; i < seconds * 30; i++) S.step(s, 1 / 30);
}

test('routes use cardinal, walkable cells and avoid the initial furniture', () => {
    const s = S.create(),
        grid = S.gridFor(s.buildings),
        route = S.path(grid, S.ENTRANCE, S.DEPOT);
    assert.ok(route.length);
    let p = S.ENTRANCE;
    for (const next of route) {
        assert.equal(grid[next.y][next.x], 0);
        assert.equal(Math.abs(p.x - next.x) + Math.abs(p.y - next.y), 1);
        p = next;
    }
    assert.deepEqual(p, S.DEPOT);
    assert.equal(S.path(grid, S.ENTRANCE, { x: 3, y: 3 }), null);
});

test('building charges exactly once, and rejection does not mutate the state', () => {
    const s = S.create();
    assert.equal(S.place(s, 'flowers', 5, 7).ok, true);
    assert.equal(s.money, 480 - S.CATALOG.flowers.cost + 180);
    assert.equal(s.buildings.at(-1).stock, S.CATALOG.flowers.capacity);
    const before = JSON.stringify(s);
    assert.equal(S.place(s, 'flowers', 5, 7).ok, false);
    assert.equal(JSON.stringify(s), before);
});

test('placement preserves service points, bounds and affordability', () => {
    const s = S.create();
    for (const p of [S.ENTRANCE, S.CHECKOUT, S.DEPOT, { x: 1, y: 7 }, { x: 9, y: 4 }, { x: -1, y: 1 }])
        assert.equal(S.placement(s, 'produce', p.x, p.y).ok, false);
    s.money = 0;
    assert.equal(S.place(s, 'flowers', 5, 5).ok, false);
});

test('closing the last route from the entrance is rejected', () => {
    const s = S.create();
    s.money = 10000;
    s.buildings = [];
    for (let x = 0; x < 10; x++)
        if (x !== 4) s.buildings.push({ id: 10 + x, type: 'flowers', x, y: 8, stock: 16 });
    s.nextId = 30;
    assert.equal(S.placement(s, 'flowers', 4, 8).ok, false);
    assert.match(S.placement(s, 'flowers', 4, 8).reason, /passage/);
});

test('customers buy, pay, leave, and staff pay for replacement stock', () => {
    const s = S.create();
    run(s, 180);
    assert.ok(s.served >= 30);
    assert.ok(s.revenue > 0);
    assert.ok(s.supplySpent > 0);
    assert.ok(s.goal >= 1);
    const rewards = S.GOALS.reduce((n, g, i) => n + (s.completed[i] ? g.reward : 0), 0);
    assert.equal(s.money, 480 + s.revenue - s.supplySpent + rewards);
    assert.ok(s.customers.length <= 9);
    for (const b of s.buildings) assert.ok(b.stock >= 0 && b.stock <= S.CATALOG[b.type].capacity);
});

test('agents never occupy furniture or move diagonally through it', () => {
    const s = S.create(),
        grid = S.gridFor(s.buildings);
    for (let i = 0; i < 3600; i++) {
        S.step(s, 1 / 30);
        for (const a of [...s.customers, s.staff]) {
            assert.equal(grid[Math.round(a.y)][Math.round(a.x)], 0);
            assert.ok(Number.isInteger(a.x) || Number.isInteger(a.y));
        }
    }
});

test('an empty shop restocks itself and does not spend beyond available funds', () => {
    const s = S.create();
    s.money = 5;
    s.buildings.forEach((b) => (b.stock = 0));
    run(s, 60);
    assert.ok(s.supplySpent > 0);
    assert.ok(s.served > 0);
    assert.ok(s.money >= 0);
});

test('building during active routes re-plans without stranding customers', () => {
    const s = S.create();
    run(s, 4);
    assert.ok(s.customers.length > 0);
    assert.equal(S.place(s, 'flowers', 5, 7).ok, true);
    const grid = S.gridFor(s.buildings);
    for (const a of [...s.customers, s.staff]) for (const p of a.route) assert.equal(grid[p.y][p.x], 0);
    run(s, 90);
    assert.ok(s.served > 10);
});

test('the same fixed steps reproduce the same economy and agents', () => {
    const a = S.create(),
        b = S.create();
    run(a, 90);
    run(b, 90);
    assert.deepEqual(a, b);
});
