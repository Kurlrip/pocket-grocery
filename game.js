(() => {
    'use strict';
    const state = Store.create(),
        canvas = document.getElementById('gameCanvas'),
        renderer = new StoreRenderer(canvas);
    let selected = null,
        hover = null,
        speed = 1,
        paused = false,
        last = 0,
        accumulator = 0,
        uiClock = 0,
        toastTimer = 0,
        helpWasPaused = false;
    const moneyFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
    const touches = new Map();
    let touchGesture = false;
    const $ = (id) => document.getElementById(id);
    function toast(text, error = false) {
        $('toast').textContent = text;
        $('toast').className = `visible${error ? ' error' : ''}`;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => ($('toast').className = ''), 4000);
    }
    for (const [type, d] of Object.entries(Store.CATALOG)) {
        const button = document.createElement('button');
        button.className = 'catalog-card';
        button.dataset.type = type;
        button.setAttribute('aria-pressed', 'false');
        button.innerHTML = `<span class="number">0${Object.keys(Store.CATALOG).indexOf(type) + 1}</span><canvas aria-hidden="true"></canvas><h3>${d.name}</h3><p>${d.detail}</p><div class="card-price"><span>${d.cost} €</span><span>+${d.price} € / vente</span></div>`;
        button.addEventListener('click', () => {
            if (state.money < d.cost) {
                toast('Quelques ventes de plus et ce rayon sera à vous.', true);
                return;
            }
            selected = selected === type ? null : type;
            updateUI();
        });
        $('catalog').appendChild(button);
        StoreRenderer.thumbnail(button.querySelector('canvas'), type);
    }
    StoreSprites.ready.then(() => {
        document
            .querySelectorAll('.catalog-card')
            .forEach((button) =>
                StoreRenderer.thumbnail(button.querySelector('canvas'), button.dataset.type),
            );
        const facade = $('storefrontCanvas');
        facade.parentElement.hidden = !StoreSprites.draw(
            facade.getContext('2d'),
            'buildings',
            'storefront',
            150,
            196,
            276,
        );
    });
    function updateUI() {
        $('money').innerHTML = `${moneyFormat.format(state.money)} <small>€</small>`;
        $('served').textContent = state.served;
        $('variety').textContent = `${new Set(state.buildings.map((b) => b.type)).size} / 5`;
        $('day').textContent = `JOUR ${String(Math.floor(state.time / 180) + 1).padStart(2, '0')}`;
        $('goals').innerHTML = Store.GOALS.map((g, i) => {
            const value = Math.min(g.progress(state), g.total),
                done = state.completed[i];
            return `<div class="goal ${done ? 'done' : ''}"><span class="goal-check">${done ? '✓' : `0${i + 1}`}</span><div><h3>${g.title}</h3><p>${g.text}</p><div class="goal-track"><span style="width:${(value / g.total) * 100}%"></span></div><div class="goal-meta"><span>${value} / ${g.total}</span><b>${done ? 'Prime reçue' : `+${g.reward} €`}</b></div></div></div>`;
        }).join('');
        document.querySelectorAll('.catalog-card').forEach((b) => {
            b.classList.toggle('selected', b.dataset.type === selected);
            b.classList.toggle('unaffordable', state.money < Store.CATALOG[b.dataset.type].cost);
            b.setAttribute('aria-pressed', String(b.dataset.type === selected));
        });
        $('cancelButton').classList.toggle('active', !selected);
        $('selectionHint').textContent = selected
            ? `${Store.CATALOG[selected].name} · Cliquez sur une case libre.`
            : 'Choisissez un rayon pour le placer.';
        canvas.style.cursor = selected ? 'crosshair' : 'default';
        $('openText').textContent = paused ? 'Une petite pause' : 'C’est ouvert !';
        $('pauseButton').textContent = paused ? '▶' : 'Ⅱ';
        $('pauseButton').setAttribute('aria-label', paused ? 'Reprendre le jeu' : 'Mettre en pause');
        $('pauseButton').setAttribute('aria-pressed', String(paused));
        $('sceneHint').textContent = paused
            ? 'Le quartier vous attend. Reprenez quand vous voulez.'
            : selected
              ? 'Un aperçu vert ? Le rayon peut s’installer ici.'
              : 'Votre employé veille au stock. Vous, imaginez la suite.';
    }
    function cancel() {
        selected = null;
        updateUI();
    }
    $('cancelButton').addEventListener('click', cancel);
    $('pauseButton').addEventListener('click', () => {
        paused = !paused;
        updateUI();
    });
    document.querySelectorAll('[data-speed]').forEach((b) =>
        b.addEventListener('click', () => {
            speed = Number(b.dataset.speed);
            document.querySelectorAll('[data-speed]').forEach((b) => {
                b.classList.toggle('active', Number(b.dataset.speed) === speed);
                b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === speed));
            });
        }),
    );
    function activateTile(x, y) {
        hover = renderer.pick(x, y);
        if (!selected) return;
        const result = Store.place(state, selected, hover.x, hover.y);
        if (!result.ok) toast(result.reason, true);
        else {
            selected = null;
            drainEvents();
        }
        updateUI();
    }
    const point = (e) => ({ x: e.clientX, y: e.clientY });
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const tapSlop = 8;
    canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        if (e.pointerType !== 'touch') {
            activateTile(e.clientX, e.clientY);
            return;
        }
        canvas.setPointerCapture(e.pointerId);
        touches.set(e.pointerId, point(e));
        touchGesture ||= touches.size > 1;
        hover = null;
    });
    canvas.addEventListener('pointermove', (e) => {
        const next = point(e);
        if (e.pointerType !== 'touch') {
            hover = renderer.pick(next.x, next.y);
            return;
        }
        const previous = touches.get(e.pointerId);
        if (!previous) return;
        if (touches.size === 1) {
            if (!touchGesture && distance(previous, next) < tapSlop) return;
            touchGesture = true;
            renderer.moveCamera(previous, next);
            touches.set(e.pointerId, next);
            return;
        }
        const [first, second] = touches.values();
        touches.set(e.pointerId, next);
        const [nextFirst, nextSecond] = touches.values();
        // Use the same pair until one of those fingers leaves the canvas.
        renderer.moveCamera(
            midpoint(first, second),
            midpoint(nextFirst, nextSecond),
            Math.max(1, distance(nextFirst, nextSecond)) / Math.max(1, distance(first, second)),
        );
    });
    function endTouch(e) {
        const previous = touches.get(e.pointerId);
        if (!previous) return;
        const tap = e.type === 'pointerup' && !touchGesture && distance(previous, point(e)) < tapSlop;
        touches.delete(e.pointerId);
        if (!touches.size) touchGesture = false;
        if (tap) activateTile(e.clientX, e.clientY);
    }
    canvas.addEventListener('pointerup', endTouch);
    canvas.addEventListener('pointercancel', endTouch);
    canvas.addEventListener('lostpointercapture', endTouch);
    canvas.addEventListener('pointerleave', () => {
        if (!touches.size) hover = null;
    });
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (e.pointerType !== 'touch' && !touches.size) cancel();
    });
    window.addEventListener('keydown', (e) => {
        if ($('helpDialog').open) return;
        if (e.key === 'Escape') cancel();
        if (e.code === 'Space' && !['BUTTON', 'INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            paused = !paused;
            updateUI();
        }
    });
    $('helpButton').addEventListener('click', () => {
        helpWasPaused = paused;
        paused = true;
        updateUI();
        $('helpDialog').showModal();
    });
    $('closeHelp').addEventListener('click', () => $('helpDialog').close());
    $('startButton').addEventListener('click', () => $('helpDialog').close());
    $('helpDialog').addEventListener('close', () => {
        paused = helpWasPaused;
        updateUI();
    });
    function drainEvents() {
        for (const event of state.events) toast(event.text, event.kind === 'error');
        state.events.length = 0;
    }
    function frame(now) {
        const elapsed = last ? Math.min((now - last) / 1000, 0.2) : 0;
        last = now;
        if (!paused && !document.hidden) {
            accumulator += elapsed * speed;
            while (accumulator >= 1 / 30) {
                Store.step(state, 1 / 30);
                accumulator -= 1 / 30;
            }
            uiClock += elapsed;
            if (uiClock > 0.25) {
                updateUI();
                drainEvents();
                uiClock = 0;
            }
        }
        renderer.render(state, hover, selected);
        requestAnimationFrame(frame);
    }
    updateUI();
    requestAnimationFrame(frame);
})();
