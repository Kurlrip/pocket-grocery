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
    for (const raw of ['{broken', '{"version":2}']) {
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
