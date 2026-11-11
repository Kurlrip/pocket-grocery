const { test } = require('node:test');
const assert = require('node:assert/strict');
const Store = require('../game-core.js');
const Save = require('../save-game.js');

function memory(initial = null) {
    let value = initial;
    return {
        getItem: (key) => key === Save.KEY ? value : null,
        setItem(key, next) {
            assert.equal(key, Save.KEY);
            value = next;
        },
    };
}

function run(state, seconds) {
    for (let i = 0; i < seconds * 30; i++) Store.step(state, 1 / 30);
}

test('a save resumes rotated shelves, paid goals, demand and active routes deterministically', () => {
    const state = Store.create();
    assert.ok(Store.rotate(state, 1).ok);
    assert.ok(Store.place(state, 'flowers', 5, 7).ok);
    state.buildings[0].stock = 7;
    run(state, 3);
    assert.equal(state.staff.state, 'refill');
    assert.ok(state.customers.some((customer) => customer.route.length));
    const storage = memory();
    assert.ok(Save.open(storage).write(state, 3, true));
    const { state: restored, speed, paused } = Save.open(storage).loaded;
    assert.equal(speed, 3);
    assert.equal(paused, true);
    assert.deepEqual(restored, { ...state, events: [] });
    state.events = [];
    run(state, 90);
    run(restored, 90);
    assert.deepEqual(restored, state);
});

test('an unreadable or newer save stays intact until an explicit restart', () => {
    for (const raw of ['{broken', '{"version":3}']) {
        const storage = memory(raw);
        const save = Save.open(storage);
        assert.equal(save.status, 'invalid');
        assert.equal(save.loaded, null);
        assert.equal(save.write(Store.create(), 1, false), false);
        assert.equal(storage.getItem(Save.KEY), raw);
        assert.ok(save.write(Store.create(), 1, false, true));
        assert.deepEqual(Save.open(storage).loaded.state, Store.create());
    }
});

test('older saves migrate without inventing an earlier sales history', () => {
    const state = Store.create();
    run(state, 210);
    delete state.expanded;
    delete state.dayStart;
    delete state.lastDay;
    const raw = JSON.stringify({ version: 1, speed: 2, paused: true, state });
    const save = Save.open(memory(raw));
    assert.equal(save.status, 'ready');
    assert.equal(save.loaded.state.money, state.money);
    assert.equal(save.loaded.state.expanded, false);
    assert.equal(save.loaded.state.lastDay, null);
    assert.equal(Store.dayReport(save.loaded.state).revenue, 0);
    assert.equal(Store.dayReport(save.loaded.state).partial, true);
});

test('new saves preserve the extension, relocated shelves and the previous day', () => {
    const state = Store.create();
    state.money = 1300;
    assert.ok(Store.expand(state).ok);
    assert.ok(Store.moveShelf(state, 1, 10, 4).ok);
    run(state, 200);
    const storage = memory();
    assert.ok(Save.open(storage).write(state, 3, true));
    const resumed = Save.open(storage).loaded.state;
    assert.deepEqual(resumed, { ...state, events: [] });
    assert.ok(resumed.expanded);
    assert.equal(resumed.lastDay.day, 1);
});

test('starting over replaces all shelves and progression with a playable empty shop', () => {
    const previous = Store.create();
    previous.money = 1300;
    assert.ok(Store.expand(previous).ok);
    assert.ok(Store.place(previous, 'flowers', 10, 4).ok);
    run(previous, 200);
    const storage = memory();
    assert.ok(Save.open(storage).write(previous, 3, true));
    assert.ok(Save.open(storage).write(Store.create({ empty: true }), 1, false, true));
    const { state, speed, paused } = Save.open(storage).loaded;
    assert.deepEqual(state.buildings, []);
    assert.deepEqual(state, Store.create({ empty: true }));
    assert.equal(speed, 1);
    assert.equal(paused, false);
    assert.ok(Store.place(state, 'produce', 3, 3).ok);
    assert.equal(state.buildings[0].id, 1);
    run(state, 45);
    assert.ok(state.served > 0);
});

test('invalid route and shelf data are rejected before starting the simulation', () => {
    for (const corrupt of [
        (s) => { s.staff.state = 'refill'; s.staff.target = 999; },
        (s) => { s.staff.route = [{ x: 20, y: 0 }]; },
        (s) => { s.buildings[0].type = '__proto__'; },
        (s) => { s.buildings[0].x = 4; s.buildings[0].y = 0; },
    ]) {
        const storage = memory();
        const state = Store.create();
        corrupt(state);
        Save.open(storage).write(state, 1, false);
        assert.equal(Save.open(storage).status, 'invalid');
    }
});

test('an older tab cannot overwrite a more recent save', () => {
    const storage = memory();
    const first = Save.open(storage), second = Save.open(storage);
    const state = Store.create();
    state.money = 700;
    assert.ok(second.write(state, 2, false));
    assert.equal(first.write(Store.create(), 1, false), false);
    assert.equal(first.status, 'conflict');
    assert.equal(first.write(Store.create(), 1, false, true), false);
    assert.equal(Save.open(storage).loaded.state.money, 700);
});

test('unavailable browser storage leaves the game playable in memory', () => {
    const blocked = () => { throw new Error('Storage blocked'); };
    assert.equal(Save.open({ getItem: blocked }).status, 'unavailable');
    const save = Save.open({ getItem: () => null, setItem: blocked });
    assert.equal(save.write(Store.create(), 1, false), false);
    assert.equal(save.status, 'unavailable');
});
