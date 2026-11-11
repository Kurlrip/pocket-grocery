(function (root) {
    'use strict';
    const Store = typeof module !== 'undefined' && module.exports ? require('./game-core.js') : root.Store;
    const KEY = 'commerce-town.save';
    const VERSION = 2;
    const nonnegative = (value) => Number.isFinite(value) && value >= 0;
    const whole = (value) => Number.isSafeInteger(value) && value >= 0;
    const knownProduct = (type) => typeof type === 'string' && Object.hasOwn(Store.CATALOG, type);
    const onBoard = (value, size) => nonnegative(value) && value <= size - 1;

    function validDay(s) {
        const start = s.dayStart;
        if (!start || !whole(start.revenue) || start.revenue > s.revenue ||
            !whole(start.supplySpent) || start.supplySpent > s.supplySpent ||
            (start.partial !== undefined && typeof start.partial !== 'boolean')) return false;
        const types = Object.keys(Store.CATALOG);
        for (const type of types) {
            const before = start.demand?.[type], current = s.demand[type];
            if (!before || !whole(before.sold) || before.sold > current.sold ||
                !whole(before.missed) || before.missed > current.missed) return false;
        }
        const report = s.lastDay;
        return report === null || (report && report.day === Store.dayOf(s) - 1 &&
            report.day > 0 && typeof report.partial === 'boolean' &&
            whole(report.revenue) && whole(report.supplySpent) &&
            Array.isArray(report.products) && report.products.length === types.length &&
            report.products.every((item, i) => item?.type === types[i] && whole(item.sold) && whole(item.missed)));
    }

    function validState(s) {
        if (!s || ![s.money, s.served, s.revenue, s.supplySpent, s.nextId, s.rng].every(whole) ||
            s.rng > 0xffffffff || !nonnegative(s.time) || !nonnegative(s.spawnTimer) ||
            !Array.isArray(s.completed) || s.completed.length !== Store.GOALS.length ||
            !s.completed.every((value) => typeof value === 'boolean') ||
            s.goal !== s.completed.filter(Boolean).length) return false;

        for (const type of Object.keys(Store.CATALOG)) {
            const demand = s.demand?.[type];
            if (!demand || !whole(demand.sold) || !whole(demand.missed)) return false;
        }
        if (typeof s.expanded !== 'boolean' || !validDay(s) ||
            !Array.isArray(s.buildings) || s.buildings.length > Store.SIZE * Store.WIDTH) return false;
        const ids = new Set();
        const cells = new Set();
        for (const b of s.buildings) {
            if (!b || !knownProduct(b.type) || !whole(b.id) || !b.id || b.id >= s.nextId || ids.has(b.id) ||
                !whole(b.x) || !whole(b.y) || !whole(b.stock) || b.stock > Store.CATALOG[b.type].capacity ||
                (b.rotated !== undefined && typeof b.rotated !== 'boolean')) return false;
            const { w, h } = Store.sizeOf(b);
            if (b.x + w > Store.WIDTH || b.y + h > Store.SIZE) return false;
            ids.add(b.id);
            for (let y = b.y; y < b.y + h; y++) {
                for (let x = b.x; x < b.x + w; x++) {
                    const index = y * Store.WIDTH + x;
                    if (!Store.hasFloor(x, y, s.expanded) || cells.has(index)) return false;
                    cells.add(index);
                }
            }
        }

        const grid = Store.gridFor(s.buildings, s.expanded);
        const free = (x, y) => grid[y][x] === 0;
        for (const p of [Store.ENTRANCE, Store.DEPOT, ...Store.COUNTERS.map((b) => ({ x: b.x + 2, y: b.y }))])
            if (!free(p.x, p.y)) return false;
        for (const { x, y } of Store.COUNTERS)
            if ([grid[y][x], grid[y][x + 1], grid[y - 1][x]].some((cell) => cell !== -1)) return false;

        const validAgent = (a, states) => a && onBoard(a.x, Store.WIDTH) && onBoard(a.y, Store.SIZE) &&
            Number.isFinite(a.timer) && states.includes(a.state) && Array.isArray(a.route) &&
            a.route.length <= Store.WIDTH * Store.SIZE && free(Math.round(a.x), Math.round(a.y)) &&
            a.route.every((p) => p && whole(p.x) && whole(p.y) &&
                onBoard(p.x, Store.WIDTH) && onBoard(p.y, Store.SIZE) && free(p.x, p.y));
        if (!validAgent(s.staff, ['idle', 'refill', 'return']) ||
            (s.staff.state === 'refill' && !ids.has(s.staff.target))) return false;
        return Array.isArray(s.customers) && s.customers.length <= 9 && s.customers.every((a) =>
            validAgent(a, ['shopping', 'checkout', 'leaving']) && knownProduct(a.request) &&
            whole(a.value) && whole(a.color) && a.color <= 4 &&
            (a.state !== 'shopping' || ids.has(a.target)));
    }

    function decode(raw) {
        try {
            const data = JSON.parse(raw);
            if (data?.version === 1 && data.state) {
                data.state.expanded = false;
                data.state.lastDay = null;
                data.state.dayStart = { ...Store.daySnapshot(data.state), partial: true };
                data.version = VERSION;
            }
            if (data?.version !== VERSION || ![1, 2, 3].includes(data.speed) ||
                typeof data.paused !== 'boolean' || !validState(data.state)) return null;
            data.state.events = [];
            return data;
        } catch {
            return null;
        }
    }

    function open(storage) {
        let baseline;
        let status = 'unavailable';
        let loaded = null;
        try {
            baseline = storage.getItem(KEY);
            loaded = baseline === null ? null : decode(baseline);
            status = baseline === null ? 'empty' : loaded ? 'ready' : 'invalid';
        } catch {
            // A blocked or private browser context can still play in memory.
        }
        return {
            loaded,
            get status() { return status; },
            write(state, speed, paused, restart = false) {
                if (status === 'unavailable' || status === 'conflict' || (status === 'invalid' && !restart))
                    return false;
                try {
                    if (storage.getItem(KEY) !== baseline) {
                        status = 'conflict';
                        return false;
                    }
                    const next = JSON.stringify({ version: VERSION, state: { ...state, events: [] }, speed, paused });
                    storage.setItem(KEY, next);
                    baseline = next;
                    status = 'ready';
                    return true;
                } catch {
                    status = 'unavailable';
                    return false;
                }
            },
        };
    }
    const api = { KEY, open };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.StoreSave = api;
})(globalThis);
