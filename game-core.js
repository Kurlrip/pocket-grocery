(function (root) {
    'use strict';
    const SIZE = 10;
    const EXPANSION = { x: SIZE, y: 3, w: 3, h: 5, cost: 650 };
    const WIDTH = SIZE + EXPANSION.w;
    const DAY_LENGTH = 180;
    const STARTING_BUDGET = 625;
    const ENTRANCE = { x: 4, y: 9 };
    const COUNTERS = [
        { x: 1, y: 7 },
        { x: 6, y: 8 },
    ];
    const CHECKOUTS = COUNTERS.map(({ x, y }) => ({ x: x + 2, y }));
    const CHECKOUT = CHECKOUTS[0];
    const DEPOT = { x: 8, y: 0 };
    const TEAM = { counter: 190, cashier: 95, helper: 140, cashierWage: 24, helperWage: 32, maxCounters: 6, maxHelpers: 2 };
    const checkoutCell = ({ x, y }) => ({ x: x + 2, y });
    const counterTiles = ({ x, y }) => [{ x, y }, { x: x + 1, y }, { x, y: y - 1 }];
    const workers = (s) => s.staff ? [s.staff, ...s.helpers] : s.helpers;
    const newWorker = () => ({ ...DEPOT, route: [], state: 'idle', target: null, timer: 0 });
    const startingCounters = () => COUNTERS.map((b, i) => ({ ...b, id: i + 1, staffed: true, included: true }));
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
    const cheapestShelf = Math.min(...productTypes.map((type) => CATALOG[type].cost));
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
        Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0 && p.x < WIDTH && p.y < SIZE;
    function hasFloor(x, y, expanded) {
        return inside({ x, y }) && (x < SIZE || (expanded && y >= EXPANSION.y && y < EXPANSION.y + EXPANSION.h));
    }
    function sizeOf({ type, rotated }) {
        if (type === 'counter') return { w: 2, h: 1 };
        const { w, h } = CATALOG[type].size;
        return rotated ? { w: h, h: w } : { w, h };
    }
    function shelfAt(buildings, x, y) {
        return buildings.find((b) => {
            const { w, h } = sizeOf(b);
            return x >= b.x && x < b.x + w && y >= b.y && y < b.y + h;
        });
    }
    function gridFor(buildings, expanded = false, counters = COUNTERS) {
        const grid = Array.from({ length: SIZE }, (_, y) =>
            Array.from({ length: WIDTH }, (_, x) => hasFloor(x, y, expanded) ? 0 : -2));
        // Counter and the cashier's standing position.
        for (const counter of counters)
            for (const { x, y } of counterTiles(counter)) grid[y][x] = -1;
        for (const b of buildings) {
            const size = sizeOf(b);
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
        const { w, h } = sizeOf(b);
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
    function create({ empty = true } = {}) {
        const state = {
            money: empty ? STARTING_BUDGET : 480,
            served: 0,
            revenue: 0,
            supplySpent: 0,
            payrollSpent: 0,
            payrollDue: 0,
            demand: Object.fromEntries(productTypes.map((type) => [type, { sold: 0, missed: 0 }])),
            time: 0,
            spawnTimer: 1,
            expanded: false,
            lastDay: null,
            nextId: empty ? 1 : 6,
            goal: 0,
            completed: GOALS.map(() => false),
            buildings: empty ? [] : [
                { id: 1, type: 'produce', x: 3, y: 3, stock: 20 },
                { id: 2, type: 'bakery', x: 6, y: 5, stock: 18 },
                { id: 3, type: 'dairy', x: 0, y: 1, stock: CATALOG.dairy.capacity },
                { id: 4, type: 'grocery', x: 4, y: 0, stock: CATALOG.grocery.capacity },
                { id: 5, type: 'grocery', x: 7, y: 2, stock: CATALOG.grocery.capacity },
            ],
            customers: [],
            counters: empty ? [] : startingCounters(),
            staff: empty ? null : newWorker(),
            helpers: [],
            events: [],
            rng: 82317,
        };
        state.dayStart = daySnapshot(state);
        return state;
    }
    function dayOf(s) {
        return Math.floor(s.time / DAY_LENGTH) + 1;
    }
    function daySnapshot(s) {
        return {
            revenue: s.revenue,
            supplySpent: s.supplySpent,
            payrollSpent: s.payrollSpent,
            demand: Object.fromEntries(productTypes.map((type) => [type, { ...s.demand[type] }])),
        };
    }
    function dayReport(s, day = dayOf(s)) {
        return {
            day,
            partial: !!s.dayStart.partial,
            revenue: s.revenue - s.dayStart.revenue,
            supplySpent: s.supplySpent - s.dayStart.supplySpent,
            payrollSpent: s.payrollSpent - s.dayStart.payrollSpent,
            products: productTypes.map((type) => ({
                type,
                sold: s.demand[type].sold - s.dayStart.demand[type].sold,
                missed: s.demand[type].missed - s.dayStart.demand[type].missed,
            })),
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
    function purchaseReason(s, cost, adding) {
        if (s.money < cost) return `Il manque ${cost - s.money} € pour cet achat.`;
        let reserve = 0;
        if (!s.counters.length && adding !== 'counter') reserve += TEAM.counter;
        if (!s.counters.some((b) => b.staffed) && adding !== 'cashier') reserve += TEAM.cashier;
        if (!s.buildings.length && adding !== 'shelf') reserve += cheapestShelf;
        return s.money - cost < reserve ? `Gardez ${reserve} € pour ouvrir une caisse et un premier rayon.` : '';
    }
    function placement(s, type, x, y, rotated = false) {
        const config = CATALOG[type];
        if (!config || !Number.isInteger(x) || !Number.isInteger(y))
            return { ok: false, reason: 'Choisissez une case dans le magasin.' };
        const reason = purchaseReason(s, config.cost, 'shelf');
        if (reason) return { ok: false, reason };
        return validateLayout(s, { id: s.nextId, type, x, y, ...(rotated && { rotated: true }) });
    }
    function headedToShelf(agent, id) {
        return agent.target === id && (agent.state === 'shopping' || agent.state === 'refill');
    }
    function validateLayout(s, candidate, replace = false) {
        const { x, y, id } = candidate;
        const buildings = replace ? s.buildings.filter((b) => b.id !== id) : s.buildings;
        const grid = gridFor(buildings, s.expanded, s.counters), size = sizeOf(candidate);
        if (x < 0 || y < 0 || x + size.w > WIDTH || y + size.h > SIZE)
            return { ok: false, reason: 'Le rayon doit rester dans le magasin.' };
        const protectedCells = [ENTRANCE, ...s.counters.map(checkoutCell), DEPOT];
        for (const a of [...s.customers, ...workers(s)]) {
            protectedCells.push(
                { x: Math.floor(a.x), y: Math.floor(a.y) },
                { x: Math.ceil(a.x), y: Math.ceil(a.y) },
            );
            if (a.route[0]) protectedCells.push(a.route[0]);
        }
        for (let iy = y; iy < y + size.h; iy++)
            for (let ix = x; ix < x + size.w; ix++) {
                if (!hasFloor(ix, iy, s.expanded))
                    return { ok: false, reason: 'Le rayon doit rester dans le magasin.' };
                if (grid[iy][ix] !== 0 || protectedCells.some((p) => p.x === ix && p.y === iy))
                    return { ok: false, reason: 'Cette case est occupée. Gardez les passages libres.' };
                grid[iy][ix] = id;
            }
        const all = [...buildings, candidate];
        const connected = reachable(grid, ENTRANCE);
        const targets = [...s.counters.map(checkoutCell), DEPOT];
        for (const a of [...s.customers, ...workers(s)]) {
            if (!replace || !headedToShelf(a, id) || !a.route.length)
                targets.push(a.route.at(-1) || { x: Math.round(a.x), y: Math.round(a.y) });
            if (a.route[0]) targets.push(a.route[0]);
        }
        if (
            targets.some((p) => !connected.has(key(p))) ||
            (s.expanded && !Array.from({ length: EXPANSION.h }, (_, row) =>
                connected.has(key({ x: EXPANSION.x, y: EXPANSION.y + row }))).some(Boolean)) ||
            all.some((b) => !serviceCells(b, grid).some((p) => connected.has(key(p))))
        ) {
            return { ok: false, reason: 'Ce rayon bloquerait un passage. Laissez une allée accessible.' };
        }
        return { ok: true, grid, candidate };
    }
    function place(s, type, x, y, rotated = false) {
        const result = placement(s, type, x, y, rotated);
        if (!result.ok) return result;
        s.money -= CATALOG[type].cost;
        s.buildings.push({ ...result.candidate, stock: CATALOG[type].capacity });
        s.nextId++;
        updateRoutes(s, result.grid);
        notify(s, `${CATALOG[type].name} a ouvert ses portes.`, 'success');
        checkGoals(s);
        return { ok: true };
    }
    function updateRoutes(s, grid, changedId) {
        // Start at the next cell so an agent already moving keeps its current segment.
        const employees = workers(s);
        for (const a of [...s.customers, ...employees]) {
            const first = a.route[0], from = first || { x: a.x, y: a.y };
            let route;
            if (changedId !== undefined && headedToShelf(a, changedId)) {
                if (employees.includes(a)) {
                    const shelf = s.buildings.find((b) => b.id === changedId);
                    route = shelf && nearestRoute(grid, from, serviceCells(shelf, grid));
                    if (route) a.timer = 2;
                    else {
                        a.state = 'return';
                        a.target = null;
                        route = path(grid, from, DEPOT);
                    }
                } else {
                    const shelf = findStockedShelf(s.buildings, grid, from, a.request);
                    if (shelf) {
                        a.target = shelf.id;
                        a.timer = 0.9;
                        route = shelf.route;
                    } else {
                        leaveShop(s, grid, a, from, true);
                        route = a.route;
                    }
                }
            } else if (first) route = path(grid, from, a.route.at(-1));
            if (route) a.route = first ? [first, ...route] : route;
        }
    }
    function rotate(s, id) {
        const shelf = s.buildings.find((b) => b.id === id);
        if (!shelf) return { ok: false, reason: 'Ce rayon a déjà été retiré.' };
        return moveShelf(s, id, shelf.x, shelf.y, !shelf.rotated);
    }
    function movePlacement(s, id, x, y, rotated) {
        const shelf = s.buildings.find((b) => b.id === id);
        if (!shelf) return { ok: false, reason: 'Ce rayon a déjà été retiré.' };
        if (!Number.isInteger(x) || !Number.isInteger(y))
            return { ok: false, reason: 'Choisissez une case dans le magasin.' };
        return validateLayout(s, { ...shelf, x, y, rotated: rotated ?? !!shelf.rotated }, true);
    }
    function moveShelf(s, id, x, y, rotated) {
        const result = movePlacement(s, id, x, y, rotated);
        if (!result.ok) return result;
        const shelf = s.buildings.find((b) => b.id === id);
        Object.assign(shelf, result.candidate);
        updateRoutes(s, result.grid, id);
        return { ok: true };
    }
    function counterPlacement(s, x, y, id) {
        const current = s.counters.find((b) => b.id === id);
        if (id && !current) return { ok: false, reason: 'Cette caisse est introuvable.' };
        if (!current) {
            if (s.counters.length >= TEAM.maxCounters)
                return { ok: false, reason: 'Nombre maximal de caisses atteint.' };
            const reason = purchaseReason(s, TEAM.counter, 'counter');
            if (reason) return { ok: false, reason };
        }
        const candidate = { id: id ?? s.counters.length + 1, x, y, staffed: current?.staffed ?? false,
            included: current?.included ?? false };
        const others = s.counters.filter((b) => b !== current);
        const grid = gridFor(s.buildings, s.expanded, others);
        const agents = [...s.customers, ...workers(s)];
        const protectedCells = [ENTRANCE, DEPOT, ...others.map(checkoutCell)];
        for (const a of agents) {
            protectedCells.push({ x: Math.floor(a.x), y: Math.floor(a.y) },
                { x: Math.ceil(a.x), y: Math.ceil(a.y) });
            if (a.route[0]) protectedCells.push(a.route[0]);
        }
        const tiles = counterTiles(candidate), service = checkoutCell(candidate);
        if ([...tiles, service].some((p) => !hasFloor(p.x, p.y, s.expanded) || grid[p.y][p.x] !== 0) ||
            tiles.some((p) => protectedCells.some((q) => same(p, q))) ||
            protectedCells.slice(0, 2).some((p) => same(p, service)) ||
            others.some((b) => same(checkoutCell(b), service)))
            return { ok: false, reason: 'Laissez deux cases pour la caisse, une derrière et une à droite pour le client.' };
        for (const p of tiles) grid[p.y][p.x] = -1;
        const connected = reachable(grid, ENTRANCE);
        const targets = [...protectedCells, service];
        for (const a of agents)
            if (a.route.length && !(a.state === 'checkout' && a.checkoutId === id))
                targets.push(a.route.at(-1));
        if (targets.some((p) => !connected.has(key(p))) ||
            (s.expanded && !Array.from({ length: EXPANSION.h }, (_, row) =>
                connected.has(key({ x: EXPANSION.x, y: EXPANSION.y + row }))).some(Boolean)) ||
            s.buildings.some((b) => !serviceCells(b, grid).some((p) => connected.has(key(p)))))
            return { ok: false, reason: 'Cette caisse bloquerait un passage.' };
        return { ok: true, candidate, grid };
    }
    function placeCounter(s, x, y, id) {
        const result = counterPlacement(s, x, y, id);
        if (!result.ok) return result;
        const current = s.counters.find((b) => b.id === id);
        if (current) {
            Object.assign(current, result.candidate);
            for (const a of s.customers) {
                if (a.state !== 'checkout' || a.checkoutId !== id) continue;
                const first = a.route[0], from = first || { x: a.x, y: a.y };
                const route = path(result.grid, from, checkoutCell(current));
                a.route = first ? [first, ...route] : route;
            }
        } else {
            s.money -= TEAM.counter;
            s.counters.push(result.candidate);
        }
        updateRoutes(s, result.grid);
        return { ok: true };
    }
    function hireCashier(s, id) {
        const counter = s.counters.find((b) => b.id === id);
        if (!counter || counter.staffed || purchaseReason(s, TEAM.cashier, 'cashier')) return false;
        counter.staffed = true;
        s.money -= TEAM.cashier;
        s.payrollSpent += TEAM.cashier;
        return true;
    }
    function hireHelper(s) {
        if (s.helpers.length >= TEAM.maxHelpers || purchaseReason(s, TEAM.helper)) return false;
        s.helpers.push(newWorker());
        s.money -= TEAM.helper;
        s.payrollSpent += TEAM.helper;
        return true;
    }
    function dailyWages(s) {
        return s.counters.filter((b) => !b.included && b.staffed).length * TEAM.cashierWage +
            s.helpers.length * TEAM.helperWage;
    }
    function expand(s) {
        if (s.expanded) return { ok: false, reason: 'L’extension est déjà ouverte.' };
        const reason = purchaseReason(s, EXPANSION.cost);
        if (reason) return { ok: false, reason };
        s.money -= EXPANSION.cost;
        s.expanded = true;
        updateRoutes(s, gridFor(s.buildings, true, s.counters));
        notify(s, 'Extension ouverte. Vous avez 15 cases de plus !', 'success');
        return { ok: true };
    }
    function remove(s, id) {
        const index = s.buildings.findIndex((b) => b.id === id);
        if (index === -1) return false;
        s.buildings.splice(index, 1);
        updateRoutes(s, gridFor(s.buildings, s.expanded, s.counters), id);
        return true;
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
        if (missed) {
            s.demand[a.request].missed++;
            a.mood = 'missed';
            a.moodUntil = s.time + 2.5;
        }
        a.unserved = missed;
        a.value = 0;
        a.state = 'leaving';
        a.timer = missed ? 1.6 : 0;
        a.route = path(grid, from, ENTRANCE) || [];
    }
    function chooseCheckout(s, grid, from) {
        let best = null;
        for (const counter of s.counters) {
            if (!counter.staffed) continue;
            const route = path(grid, from, checkoutCell(counter));
            if (!route) continue;
            const waiting = s.customers.filter((a) => a.state === 'checkout' && a.checkoutId === counter.id).length;
            const score = route.length + waiting * 3;
            if (!best || score < best.score) best = { id: counter.id, route, score };
        }
        return best;
    }
    function step(s, dt, onStockChange) {
        if (!Number.isFinite(dt) || dt <= 0) return;
        const day = dayOf(s);
        s.time += dt;
        if (s.buildings.length && s.counters.some((b) => b.staffed)) s.spawnTimer -= dt;
        const grid = gridFor(s.buildings, s.expanded, s.counters);
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
                    mood: 'request',
                    moodUntil: s.time + 2.7,
                };
                if (!shelf) leaveShop(s, grid, customer, ENTRANCE, true);
                s.customers.push(customer);
            }
        }
        for (const a of s.customers) {
            if (!move(a, dt, 1.8)) continue;
            if (a.state === 'checkout' && s.customers.find((other) =>
                other.state === 'checkout' && other.checkoutId === a.checkoutId && !other.route.length) !== a) continue;
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
                const checkout = chooseCheckout(s, grid, from);
                if (!checkout) {
                    leaveShop(s, grid, a, from, true);
                    continue;
                }
                b.stock--;
                onStockChange?.(b, b.stock + 1);
                a.value = CATALOG[a.request].price;
                a.state = 'checkout';
                a.timer = 1.1;
                a.checkoutId = checkout.id;
                a.route = checkout.route;
            } else if (a.state === 'checkout') {
                s.money += a.value;
                s.revenue += a.value;
                s.served++;
                s.demand[a.request].sold++;
                a.mood = 'happy';
                a.moodUntil = s.time + 2.1;
                leaveShop(s, grid, a, from);
            } else a.state = 'done';
        }
        s.customers = s.customers.filter((a) => a.state !== 'done');
        const employees = workers(s);
        for (const a of employees) {
            if (a.state === 'idle') {
                const b = s.buildings.find(
                    (b) => b.stock < CATALOG[b.type].capacity * 0.5 && s.money >= CATALOG[b.type].supply &&
                        !employees.some((worker) => worker.state === 'refill' && worker.target === b.id),
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
                        if (units) onStockChange?.(b, b.stock - units);
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
        }
        checkGoals(s);
        if (dayOf(s) !== day) {
            if (s.served > 0) s.payrollDue += dailyWages(s);
            const paid = Math.min(s.money, s.payrollDue);
            s.payrollDue -= paid;
            s.money -= paid;
            s.payrollSpent += paid;
            s.lastDay = dayReport(s, day);
            s.dayStart = daySnapshot(s);
        }
    }
    const api = {
        SIZE,
        WIDTH,
        DAY_LENGTH,
        STARTING_BUDGET,
        EXPANSION,
        ENTRANCE,
        CHECKOUT,
        COUNTERS,
        TEAM,
        DEPOT,
        CATALOG,
        GOALS,
        create,
        gridFor,
        hasFloor,
        sizeOf,
        shelfAt,
        path,
        serviceCells,
        placement,
        place,
        movePlacement,
        moveShelf,
        expand,
        counterPlacement,
        placeCounter,
        hireCashier,
        hireHelper,
        dailyWages,
        purchaseReason,
        checkoutCell,
        counterTiles,
        startingCounters,
        workers,
        dayOf,
        daySnapshot,
        dayReport,
        rotate,
        remove,
        step,
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.Store = api;
})(globalThis);
