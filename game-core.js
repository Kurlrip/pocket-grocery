(function (root) {
    'use strict';
    const SIZE = 10;
    const ENTRANCE = { x: 4, y: 9 };
    const COUNTERS = [
        { x: 1, y: 7 },
        { x: 6, y: 8 },
    ];
    const CHECKOUTS = COUNTERS.map(({ x, y }) => ({ x: x + 2, y }));
    const CHECKOUT = CHECKOUTS[0];
    const DEPOT = { x: 8, y: 0 };
    const CATALOG = {
        produce: {
            name: 'Le primeur',
            detail: 'Fruits & légumes',
            cost: 120,
            capacity: 20,
            price: 8,
            supply: 2,
            color: '#699e51',
            size: { w: 2, h: 1 },
        },
        bakery: {
            name: 'Le fournil',
            detail: 'Pain & viennoiseries',
            cost: 180,
            capacity: 18,
            price: 12,
            supply: 3,
            color: '#cf9553',
            size: { w: 2, h: 1 },
        },
        dairy: {
            name: 'Le coin frais',
            detail: 'Lait & fromages',
            cost: 280,
            capacity: 24,
            price: 17,
            supply: 5,
            color: '#71a5ae',
            size: { w: 2, h: 1 },
        },
        grocery: {
            name: 'Le garde-manger',
            detail: 'Épicerie fine',
            cost: 400,
            capacity: 28,
            price: 23,
            supply: 7,
            color: '#b88462',
            size: { w: 2, h: 1 },
        },
        flowers: {
            name: 'Le fleuriste',
            detail: 'Bouquets de saison',
            cost: 240,
            capacity: 16,
            price: 15,
            supply: 4,
            color: '#b17996',
            size: { w: 1, h: 1 },
        },
    };
    const productTypes = Object.keys(CATALOG);
    const GOALS = [
        {
            title: 'Les premiers habitués',
            text: 'Servir 10 clients',
            reward: 120,
            progress: (s) => s.served,
            total: 10,
        },
        {
            title: 'Un peu de tout',
            text: 'Proposer 5 rayons différents',
            reward: 180,
            progress: (s) => new Set(s.buildings.map((b) => b.type)).size,
            total: 5,
        },
        {
            title: 'Le cœur du quartier',
            text: 'Servir 50 clients',
            reward: 300,
            progress: (s) => s.served,
            total: 50,
        },
    ];
    const key = (p) => `${p.x},${p.y}`;
    const same = (a, b) => a.x === b.x && a.y === b.y;
    const inside = (p) =>
        Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0 && p.x < SIZE && p.y < SIZE;
    function gridFor(buildings) {
        const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
        // Counter and the cashier's standing position.
        for (const { x, y } of COUNTERS) grid[y][x] = grid[y][x + 1] = grid[y - 1][x] = -1;
        for (const b of buildings) {
            const size = CATALOG[b.type].size;
            for (let y = b.y; y < b.y + size.h; y++)
                for (let x = b.x; x < b.x + size.w; x++) grid[y][x] = b.id;
        }
        return grid;
    }
    function reachable(grid, start) {
        const parents = new Map([[key(start), null]]),
            queue = [start];
        for (let i = 0; i < queue.length; i++) {
            const p = queue[i];
            for (const n of [
                { x: p.x + 1, y: p.y },
                { x: p.x - 1, y: p.y },
                { x: p.x, y: p.y + 1 },
                { x: p.x, y: p.y - 1 },
            ]) {
                if (inside(n) && grid[n.y][n.x] === 0 && !parents.has(key(n))) {
                    parents.set(key(n), p);
                    queue.push(n);
                }
            }
        }
        return parents;
    }
    function path(grid, start, end) {
        if (!inside(start) || !inside(end) || grid[start.y][start.x] !== 0 || grid[end.y][end.x] !== 0)
            return null;
        const parents = reachable(grid, start);
        if (!parents.has(key(end))) return null;
        const route = [];
        for (let p = end; !same(p, start); p = parents.get(key(p))) route.unshift({ ...p });
        return route;
    }
    function serviceCells(b, grid) {
        const { w, h } = CATALOG[b.type].size;
        const points = [];
        for (let x = b.x; x < b.x + w; x++) points.push({ x, y: b.y + h }, { x, y: b.y - 1 });
        for (let y = b.y; y < b.y + h; y++) points.push({ x: b.x - 1, y }, { x: b.x + w, y });
        return points.filter((p) => inside(p) && grid[p.y][p.x] === 0);
    }
    function nearestRoute(grid, from, targets) {
        let best = null;
        for (const target of targets) {
            const route = path(grid, from, target);
            if (route && (!best || route.length < best.length)) best = route;
        }
        return best;
    }
    function create() {
        return {
            money: 480,
            served: 0,
            revenue: 0,
            supplySpent: 0,
            demand: Object.fromEntries(productTypes.map((type) => [type, { sold: 0, missed: 0 }])),
            time: 0,
            spawnTimer: 1,
            nextId: 6,
            goal: 0,
            completed: GOALS.map(() => false),
            buildings: [
                { id: 1, type: 'produce', x: 3, y: 3, stock: 20 },
                { id: 2, type: 'bakery', x: 6, y: 5, stock: 18 },
                { id: 3, type: 'dairy', x: 0, y: 1, stock: CATALOG.dairy.capacity },
                { id: 4, type: 'grocery', x: 4, y: 0, stock: CATALOG.grocery.capacity },
                { id: 5, type: 'grocery', x: 7, y: 2, stock: CATALOG.grocery.capacity },
            ],
            customers: [],
            staff: { x: DEPOT.x, y: DEPOT.y, route: [], state: 'idle', target: null, timer: 0 },
            events: [],
            rng: 82317,
        };
    }
    function random(s) {
        s.rng = (s.rng * 1664525 + 1013904223) >>> 0;
        return s.rng / 4294967296;
    }
    function notify(s, text, kind = 'info') {
        s.events.push({ text, kind });
        if (s.events.length > 8) s.events.shift();
    }
    function placement(s, type, x, y) {
        const config = CATALOG[type];
        if (!config || !Number.isInteger(x) || !Number.isInteger(y))
            return { ok: false, reason: 'Choisissez une case dans le magasin.' };
        if (s.money < config.cost)
            return { ok: false, reason: 'Quelques ventes de plus et ce rayon sera à vous.' };
        const grid = gridFor(s.buildings),
            size = config.size;
        if (x < 0 || y < 0 || x + size.w > SIZE || y + size.h > SIZE)
            return { ok: false, reason: 'Le rayon doit rester dans le magasin.' };
        const protectedCells = [ENTRANCE, ...CHECKOUTS, DEPOT];
        for (const a of [...s.customers, s.staff]) {
            protectedCells.push(
                { x: Math.floor(a.x), y: Math.floor(a.y) },
                { x: Math.ceil(a.x), y: Math.ceil(a.y) },
            );
            if (a.route[0]) protectedCells.push(a.route[0]);
        }
        for (let iy = y; iy < y + size.h; iy++)
            for (let ix = x; ix < x + size.w; ix++) {
                if (grid[iy][ix] !== 0 || protectedCells.some((p) => p.x === ix && p.y === iy))
                    return { ok: false, reason: 'Cette case est occupée. Gardez les passages libres.' };
                grid[iy][ix] = s.nextId;
            }
        const candidate = { id: s.nextId, type, x, y },
            all = [...s.buildings, candidate];
        const connected = reachable(grid, ENTRANCE);
        const targets = [...CHECKOUTS, DEPOT];
        for (const a of [...s.customers, s.staff]) {
            targets.push(a.route.at(-1) || { x: Math.round(a.x), y: Math.round(a.y) });
            if (a.route[0]) targets.push(a.route[0]);
        }
        if (
            targets.some((p) => !connected.has(key(p))) ||
            all.some((b) => !serviceCells(b, grid).some((p) => connected.has(key(p))))
        ) {
            return { ok: false, reason: 'Ce rayon bloquerait un passage. Laissez une allée accessible.' };
        }
        return { ok: true, grid, candidate };
    }
    function place(s, type, x, y) {
        const result = placement(s, type, x, y);
        if (!result.ok) return result;
        s.money -= CATALOG[type].cost;
        s.buildings.push({ ...result.candidate, stock: CATALOG[type].capacity });
        s.nextId++;
        // Preserve the current movement segment, then rebuild the remaining route.
        for (const a of [...s.customers, s.staff])
            if (a.route.length) {
                const first = a.route[0],
                    last = a.route.at(-1);
                a.route = [first, ...path(result.grid, first, last)];
            }
        notify(s, `${CATALOG[type].name} a ouvert ses portes.`, 'success');
        checkGoals(s);
        return { ok: true };
    }
    function move(a, dt, speed) {
        let budget = dt * speed;
        while (a.route.length && budget > 0) {
            const p = a.route[0],
                distance = Math.hypot(p.x - a.x, p.y - a.y);
            if (distance <= budget) {
                a.x = p.x;
                a.y = p.y;
                a.route.shift();
                budget -= distance;
            } else {
                a.x += ((p.x - a.x) * budget) / distance;
                a.y += ((p.y - a.y) * budget) / distance;
                budget = 0;
            }
        }
        return a.route.length === 0;
    }
    function checkGoals(s) {
        GOALS.forEach((goal, i) => {
            if (!s.completed[i] && goal.progress(s) >= goal.total) {
                s.completed[i] = true;
                s.goal++;
                s.money += goal.reward;
                notify(s, `${goal.title} : +${goal.reward} € de prime !`, 'success');
            }
        });
    }
    function findStockedShelf(buildings, grid, from, type) {
        let best = null;
        for (const b of buildings) {
            if (b.type !== type || b.stock <= 0) continue;
            const route = nearestRoute(grid, from, serviceCells(b, grid));
            if (route && (!best || route.length < best.route.length)) best = { id: b.id, route };
        }
        return best;
    }
    function leaveShop(s, grid, a, from, missed = false) {
        if (missed) s.demand[a.request].missed++;
        a.unserved = missed;
        a.value = 0;
        a.state = 'leaving';
        a.timer = missed ? 0.8 : 0;
        a.route = path(grid, from, ENTRANCE) || [];
    }
    function step(s, dt) {
        if (!Number.isFinite(dt) || dt <= 0) return;
        s.time += dt;
        s.spawnTimer -= dt;
        const grid = gridFor(s.buildings);
        if (s.spawnTimer <= 0) {
            s.spawnTimer = 3.5;
            if (s.customers.length < 9) {
                const request = productTypes[Math.floor(random(s) * productTypes.length)];
                const shelf = findStockedShelf(s.buildings, grid, ENTRANCE, request);
                const customer = {
                    ...ENTRANCE,
                    request,
                    route: shelf?.route ?? [],
                    state: 'shopping',
                    target: shelf?.id ?? null,
                    timer: 0.9,
                    value: 0,
                    color: Math.floor(random(s) * 5),
                };
                if (!shelf) leaveShop(s, grid, customer, ENTRANCE, true);
                s.customers.push(customer);
            }
        }
        for (const a of s.customers) {
            if (!move(a, dt, 1.8)) continue;
            a.timer -= dt;
            if (a.timer > 0) continue;
            const from = { x: a.x, y: a.y };
            if (a.state === 'shopping') {
                const b = s.buildings.find((b) => b.id === a.target);
                if (!b || b.stock <= 0) {
                    const alternative = findStockedShelf(s.buildings, grid, from, a.request);
                    if (alternative) {
                        a.target = alternative.id;
                        a.route = alternative.route;
                        a.timer = 0.9;
                    } else leaveShop(s, grid, a, from, true);
                    continue;
                }
                b.stock--;
                a.value = CATALOG[a.request].price;
                a.state = 'checkout';
                a.timer = 1.1;
                a.route = nearestRoute(grid, from, CHECKOUTS) || [];
            } else if (a.state === 'checkout') {
                s.money += a.value;
                s.revenue += a.value;
                s.served++;
                s.demand[a.request].sold++;
                leaveShop(s, grid, a, from);
            } else a.state = 'done';
        }
        s.customers = s.customers.filter((a) => a.state !== 'done');
        const a = s.staff;
        if (a.state === 'idle') {
            const b = s.buildings.find(
                (b) => b.stock < CATALOG[b.type].capacity * 0.5 && s.money >= CATALOG[b.type].supply,
            );
            if (b) {
                const route = nearestRoute(grid, { x: a.x, y: a.y }, serviceCells(b, grid));
                if (route) {
                    a.target = b.id;
                    a.state = 'refill';
                    a.route = route;
                    a.timer = 2;
                }
            }
        } else if (move(a, dt, 2.1)) {
            if (a.state === 'refill') {
                a.timer -= dt;
                if (a.timer <= 0) {
                    const b = s.buildings.find((b) => b.id === a.target),
                        config = CATALOG[b.type];
                    const units = Math.min(config.capacity - b.stock, Math.floor(s.money / config.supply));
                    b.stock += units;
                    s.money -= units * config.supply;
                    s.supplySpent += units * config.supply;
                    a.state = 'return';
                    a.route = path(grid, { x: a.x, y: a.y }, DEPOT) || [];
                }
            } else {
                a.state = 'idle';
                a.target = null;
            }
        }
        checkGoals(s);
    }
    const api = {
        SIZE,
        ENTRANCE,
        CHECKOUT,
        COUNTERS,
        DEPOT,
        CATALOG,
        GOALS,
        create,
        gridFor,
        path,
        serviceCells,
        placement,
        place,
        step,
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.Store = api;
})(globalThis);
