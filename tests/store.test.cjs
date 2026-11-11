const { test } = require('node:test');
const assert = require('node:assert/strict');
const S = require('../game-core.js');
function run(s, seconds, onStockChange) {
    for (let i = 0; i < seconds * 30; i++) S.step(s, 1 / 30, onStockChange);
}

test('a new shop opens from an empty room within the starting budget', () => {
    const s = S.create();
    assert.deepEqual(s.buildings, []);
    assert.deepEqual(s.counters, []);
    assert.deepEqual(S.workers(s), []);
    run(s, 10);
    assert.equal(s.customers.length, 0);
    assert.ok(S.placeCounter(s, 1, 7).ok);
    assert.ok(S.hireCashier(s, 1));
    assert.ok(S.place(s, 'produce', 3, 3).ok);
    assert.equal(s.money, 75);
    assert.equal(S.dailyWages(s), S.TEAM.cashierWage);
    run(s, 45);
    assert.ok(s.served > 0);
});

test('routes use cardinal, walkable cells and avoid the initial furniture', () => {
    const s = S.create({ empty: false }),
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
    const s = S.create({ empty: false });
    assert.equal(S.place(s, 'flowers', 5, 7).ok, true);
    assert.equal(s.money, 480 - S.CATALOG.flowers.cost + 180);
    assert.equal(s.buildings.at(-1).stock, S.CATALOG.flowers.capacity);
    const before = JSON.stringify(s);
    assert.equal(S.place(s, 'flowers', 5, 7).ok, false);
    assert.equal(JSON.stringify(s), before);
});

test('placement preserves service points, bounds and affordability', () => {
    const s = S.create({ empty: false });
    for (const p of [S.ENTRANCE, S.CHECKOUT, S.DEPOT, { x: 1, y: 7 }, { x: 9, y: 4 }, { x: -1, y: 1 }])
        assert.equal(S.placement(s, 'produce', p.x, p.y).ok, false);
    s.money = 0;
    assert.equal(S.place(s, 'flowers', 5, 5).ok, false);
});

test('closing the last route from the entrance is rejected', () => {
    const s = S.create({ empty: false });
    s.money = 10000;
    s.buildings = [];
    for (let x = 0; x < 10; x++)
        if (x !== 4) s.buildings.push({ id: 10 + x, type: 'flowers', x, y: 8, stock: 16 });
    s.nextId = 30;
    assert.equal(S.placement(s, 'flowers', 4, 8).ok, false);
    assert.match(S.placement(s, 'flowers', 4, 8).reason, /passage/);
});

test('customers buy, pay, leave, and staff pay for replacement stock', () => {
    const s = S.create({ empty: false });
    run(s, 180);
    assert.ok(s.served >= 30);
    assert.ok(s.revenue > 0);
    assert.ok(s.supplySpent > 0);
    assert.ok(s.goal >= 1);
    const rewards = S.GOALS.reduce((n, g, i) => n + (s.completed[i] ? g.reward : 0), 0);
    assert.equal(s.money, 480 + s.revenue - s.supplySpent + rewards);
    assert.ok(s.customers.length <= 9);
    assert.equal(Object.values(s.demand).reduce((total, demand) => total + demand.sold, 0), s.served);
    assert.equal(Object.entries(s.demand).reduce((total, [type, demand]) => total + demand.sold * S.CATALOG[type].price, 0), s.revenue);
    for (const b of s.buildings) assert.ok(b.stock >= 0 && b.stock <= S.CATALOG[b.type].capacity);
});

test('an absent product misses sales until its shelf is opened', () => {
    const s = S.create({ empty: false });
    run(s, 10);
    const missed = s.demand.flowers.missed;
    assert.ok(missed > 0);
    assert.equal(s.demand.flowers.sold, 0);
    assert.equal(S.place(s, 'flowers', 5, 7).ok, true);
    run(s, 35);
    assert.equal(s.demand.flowers.missed, missed);
    assert.ok(s.demand.flowers.sold > 0);
});

test('a customer finds a second shelf of the same type if the first sells out', () => {
    const s = S.create({ empty: false });
    assert.equal(S.place(s, 'produce', 5, 6).ok, true);
    run(s, 2);
    const customer = s.customers.find((a) => a.request === 'produce');
    const target = s.buildings.find((b) => b.id === customer.target);
    const alternative = s.buildings.find((b) => b.type === 'produce' && b !== target);
    s.spawnTimer = Infinity;
    s.money = 0;
    target.stock = 0;
    run(s, 18);
    assert.equal(s.demand.produce.missed, 0);
    assert.equal(s.demand.produce.sold, 1);
    assert.equal(alternative.stock, S.CATALOG.produce.capacity - 1);
});

test('a shelf running out during the trip records one miss and no sale', () => {
    const s = S.create({ empty: false });
    run(s, 2);
    const customer = s.customers.find((a) => a.request === 'produce');
    s.buildings.find((b) => b.id === customer.target).stock = 0;
    s.spawnTimer = Infinity;
    s.money = 0;
    run(s, 20);
    assert.deepEqual(s.demand.produce, { sold: 0, missed: 1 });
    assert.equal(s.served, 0);
    assert.equal(s.money, 0);
    assert.equal(s.customers.length, 0);
});

test('agents never occupy furniture or move diagonally through it', () => {
    const s = S.create({ empty: false }),
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
    const s = S.create({ empty: false });
    s.money = 5;
    s.buildings.forEach((b) => (b.stock = 0));
    run(s, 60);
    assert.ok(s.supplySpent > 0);
    assert.ok(s.served > 0);
    assert.ok(s.money >= 0);
});

test('stock changes report the exact units taken and restocked', () => {
    const s = S.create({ empty: false });
    const events = [];
    const record = (shelf, before) => events.push([shelf.type, before, shelf.stock]);
    s.buildings[0].stock = 8;
    s.spawnTimer = Infinity;
    run(s, 22, record);
    assert.deepEqual(events, [['produce', 8, 20]]);
    s.spawnTimer = 0;
    run(s, 9, record);
    assert.deepEqual(events[1], ['produce', 20, 19]);
});

test('building during active routes re-plans without stranding customers', () => {
    const s = S.create({ empty: false });
    run(s, 4);
    assert.ok(s.customers.length > 0);
    assert.equal(S.place(s, 'flowers', 5, 7).ok, true);
    const grid = S.gridFor(s.buildings);
    for (const a of [...s.customers, s.staff]) for (const p of a.route) assert.equal(grid[p.y][p.x], 0);
    run(s, 90);
    assert.ok(s.served > 10);
});

test('rotated shelves swap their footprint without losing stock or charging again', () => {
    const s = S.create({ empty: false });
    assert.equal(S.place(s, 'produce', 5, 7, true).ok, true);
    const shelf = s.buildings.at(-1);
    assert.equal(S.shelfAt(s.buildings, 5, 8), shelf);
    assert.notEqual(S.shelfAt(s.buildings, 6, 7), shelf);
    const before = JSON.stringify(s);
    assert.equal(S.rotate(s, shelf.id).ok, false);
    assert.equal(JSON.stringify(s), before);
    const existing = s.buildings[0];
    const money = s.money, stock = existing.stock;
    assert.equal(S.rotate(s, existing.id).ok, true);
    assert.equal(S.gridFor(s.buildings)[4][3], existing.id);
    assert.equal(S.gridFor(s.buildings)[3][4], 0);
    assert.equal(existing.stock, stock);
    assert.equal(s.money, money);
});

test('removing a shelf redirects a shopper and an employee without refunding the shelf', () => {
    const s = S.create({ empty: false });
    assert.equal(S.place(s, 'produce', 5, 6).ok, true);
    const shelf = s.buildings.at(-1);
    shelf.stock = 1;
    run(s, 2);
    const shopper = s.customers.find((a) => a.target === shelf.id);
    assert.ok(shopper);
    assert.equal(s.staff.target, shelf.id);
    const money = s.money;
    assert.equal(S.remove(s, shelf.id), true);
    assert.equal(s.money, money);
    assert.equal(s.staff.state, 'return');
    assert.equal(shopper.target, 1);
    assert.equal(S.remove(s, shelf.id), false);
    run(s, 20);
    assert.ok(s.demand.produce.sold > 0);
});

test('rotation preserves the current movement segment and leads to a valid shelf access', () => {
    const s = S.create({ empty: false });
    run(s, 2);
    const shopper = s.customers.find((a) => a.request === 'produce');
    const shelf = s.buildings.find((b) => b.id === shopper.target);
    const next = shopper.route[0];
    assert.equal(S.rotate(s, shelf.id).ok, true);
    assert.deepEqual(shopper.route[0], next);
    assert.ok(S.serviceCells(shelf, S.gridFor(s.buildings)).some((cell) =>
        cell.x === shopper.route.at(-1).x && cell.y === shopper.route.at(-1).y));
    run(s, 15);
    assert.ok(s.demand.produce.sold > 0);
});

test('the extension is paid once and adds only the 15 connected floor cells', () => {
    const s = S.create({ empty: false }), { x, y, cost } = S.EXPANSION;
    assert.equal(S.placement(s, 'flowers', x, y).ok, false);
    assert.equal(S.expand(s).ok, false);
    s.money = cost + 480;
    assert.equal(S.expand(s).ok, true);
    assert.equal(S.expand(s).ok, false);
    assert.equal(s.money, 480);
    const before = S.gridFor(s.buildings), after = S.gridFor(s.buildings, true);
    assert.equal(after.flat().filter((cell, i) => cell === 0 && before.flat()[i] === -2).length, 15);
    assert.ok(S.path(after, S.ENTRANCE, { x: x + 2, y }).length > 0);
    assert.equal(S.placement(s, 'flowers', x, y - 1).ok, false);
});

test('placement keeps an entrance open even before the extension has a shelf', () => {
    const s = S.create({ empty: false });
    s.money = 5000;
    assert.ok(S.expand(s).ok);
    for (let y = 3; y < 7; y++) assert.ok(S.place(s, 'flowers', 10, y).ok);
    assert.match(S.placement(s, 'flowers', 10, 7).reason, /passage/);
});

test('moving a stocked shelf into the extension is free and preserves active routes', () => {
    const s = S.create({ empty: false });
    s.money = 1200;
    assert.ok(S.expand(s).ok);
    run(s, 2);
    const shelf = s.buildings[0], stock = shelf.stock, money = s.money;
    const customer = s.customers.find((a) => a.target === shelf.id);
    const next = customer.route[0];
    assert.equal(S.moveShelf(s, shelf.id, S.CHECKOUT.x, S.CHECKOUT.y).ok, false);
    assert.equal(S.moveShelf(s, shelf.id, 10, 4, true).ok, true);
    assert.equal(shelf.stock, stock);
    assert.equal(s.money, money);
    assert.equal(S.shelfAt(s.buildings, 10, 5), shelf);
    assert.deepEqual(customer.route[0], next);
    run(s, 30);
    assert.ok(s.demand.produce.sold > 0);
});

test('the previous day is frozen and the new day reports only its own activity', () => {
    const s = S.create({ empty: false });
    run(s, 185);
    const yesterday = structuredClone(s.lastDay);
    assert.equal(yesterday.day, 1);
    assert.ok(yesterday.revenue > 0);
    assert.ok(yesterday.products.some((p) => p.missed > 0));
    run(s, 30);
    assert.deepEqual(s.lastDay, yesterday);
    const today = S.dayReport(s);
    assert.equal(today.day, 2);
    assert.equal(today.revenue + yesterday.revenue, s.revenue);
    assert.equal(today.supplySpent + yesterday.supplySpent, s.supplySpent);
    for (const product of today.products) {
        const previous = yesterday.products.find((p) => p.type === product.type);
        assert.deepEqual(s.demand[product.type], {
            sold: product.sold + previous.sold,
            missed: product.missed + previous.missed,
        });
    }
});

test('a new checkout needs a cashier and can move without charging or stranding a customer', () => {
    const s = S.create({ empty: false });
    s.money = 1500;
    assert.equal(S.placeCounter(s, 3, 3).ok, false);
    assert.ok(S.placeCounter(s, 5, 3).ok);
    const counter = s.counters.at(-1);
    assert.equal(counter.staffed, false);
    assert.equal(s.money, 1500 - S.TEAM.counter);
    run(s, 20);
    assert.ok(s.customers.every((a) => a.checkoutId !== counter.id));
    assert.ok(S.hireCashier(s, counter.id));
    assert.equal(S.hireCashier(s, counter.id), false);
    const target = S.checkoutCell(counter);
    const grid = S.gridFor(s.buildings, s.expanded, s.counters);
    const route = S.path(grid, S.ENTRANCE, target);
    const customer = { ...S.ENTRANCE, route, request: 'produce', state: 'checkout',
        checkoutId: counter.id, timer: 1.1, value: S.CATALOG.produce.price, color: 0 };
    s.customers.push(customer);
    const money = s.money, next = route[0];
    assert.ok(S.placeCounter(s, 6, 4, counter.id).ok);
    assert.equal(s.money, money);
    assert.ok(counter.staffed);
    assert.deepEqual(customer.route[0], next);
    assert.deepEqual(customer.route.at(-1), S.checkoutCell(counter));
});

test('reserve hires split restocks and unpaid wages carry forward at day end', () => {
    const s = S.create({ empty: false });
    s.money = 1800;
    assert.ok(S.placeCounter(s, 5, 3).ok);
    assert.ok(S.hireCashier(s, 3));
    assert.ok(S.hireHelper(s));
    s.buildings[0].stock = s.buildings[1].stock = 1;
    S.step(s, 1 / 30);
    assert.deepEqual(S.workers(s).map((worker) => worker.target), [1, 2]);
    const fees = s.payrollSpent;
    s.money = 20;
    s.time = S.DAY_LENGTH - 0.01;
    S.step(s, 1 / 30);
    assert.equal(s.money, 0);
    assert.equal(s.payrollDue, S.TEAM.cashierWage + S.TEAM.helperWage - 20);
    assert.equal(s.lastDay.payrollSpent, fees + 20);
});

test('each staffed checkout processes one waiting customer at a time', () => {
    const s = S.create({ empty: false });
    s.spawnTimer = Infinity;
    const shopper = (counter) => ({ ...S.checkoutCell(counter), route: [], request: 'produce',
        state: 'checkout', checkoutId: counter.id, timer: 1, value: S.CATALOG.produce.price, color: 0 });
    const [first, second] = s.counters;
    s.customers = [shopper(first), shopper(first), shopper(second)];
    S.step(s, 0.25);
    assert.deepEqual(s.customers.map((a) => a.timer), [0.75, 1, 0.75]);
});

test('customers show their request, a successful checkout or a missed purchase briefly', () => {
    const s = S.create({ empty: false });
    const moods = new Set();
    for (let tick = 0; tick < 1200; tick++) {
        S.step(s, 1 / 30);
        for (const a of s.customers)
            if (a.moodUntil > s.time) moods.add(a.mood);
    }
    assert.deepEqual(moods, new Set(['request', 'happy', 'missed']));
});

test('the same fixed steps reproduce the same economy and agents', () => {
    const a = S.create({ empty: false }),
        b = S.create({ empty: false });
    run(a, 90);
    run(b, 90);
    assert.deepEqual(a, b);
});
