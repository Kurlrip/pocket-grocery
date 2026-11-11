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
        toastTimer = 0;
    const moneyFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
    const touches = new Map();
    let touchGesture = false;
    const $ = (id) => document.getElementById(id);
    const panel = $('gamePanel');
    const panelBody = panel.querySelector('.panel-body');
    const panelTitles = { construction: 'Construire un rayon', objectives: 'Objectifs du quartier', controls: 'Commandes' };
    const panelButtons = [...document.querySelectorAll('[data-panel]')];
    const catalogFeedback = $('catalogFeedback');
    for (const element of document.querySelectorAll('[data-art]')) {
        const image = new Image();
        image.alt = element.dataset.art === 'logo' ? 'Commerce Town' : '';
        image.onload = () => element.replaceChildren(image);
        image.src = `assets/ui-${element.dataset.art}.webp`;
    }
    for (const button of panelButtons) {
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', panel.id);
        button.addEventListener('click', () => {
            const name = button.dataset.panel;
            for (const section of Object.keys(panelTitles)) $(section).hidden = section !== name;
            $('panelTitle').textContent = panelTitles[name];
            catalogFeedback.hidden = true;
            hover = null;
            button.setAttribute('aria-expanded', 'true');
            panel.showModal();
            panelBody.scrollTop = 0;
        });
    }
    $('closePanel').addEventListener('click', () => panel.close());
    panel.addEventListener('close', () => {
        for (const button of panelButtons) button.setAttribute('aria-expanded', 'false');
    });
    function toast(text, error = false) {
        $('toast').textContent = text;
        $('toast').className = `toast visible${error ? ' error' : ''}`;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => ($('toast').className = 'toast'), 4000);
    }
    for (const [type, d] of Object.entries(Store.CATALOG)) {
        const button = document.createElement('button');
        button.className = 'catalog-card';
        button.dataset.type = type;
        button.setAttribute('aria-pressed', 'false');
        button.innerHTML = `<canvas aria-hidden="true"></canvas><strong>${d.name}</strong><span class="card-detail">${d.detail}</span><span class="card-price"><span>${d.cost} €</span><small>+${d.price} € / vente</small></span>`;
        button.addEventListener('click', () => {
            if (state.money < d.cost) {
                catalogFeedback.textContent = `Il manque ${moneyFormat.format(d.cost - state.money)} € pour ce rayon.`;
                catalogFeedback.hidden = false;
                catalogFeedback.scrollIntoView({ block: 'nearest' });
                return;
            }
            selected = type;
            StoreRenderer.thumbnail($('placementArt'), type);
            panel.close();
            canvas.focus({ preventScroll: true });
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
        if (selected) StoreRenderer.thumbnail($('placementArt'), selected);
    });
    function updateUI() {
        $('money').textContent = `${moneyFormat.format(state.money)} €`;
        $('served').textContent = state.served;
        $('day').textContent = `JOUR ${String(Math.floor(state.time / 180) + 1).padStart(2, '0')}`;
        const mission = Store.GOALS.find((_, i) => !state.completed[i]);
        $('missionTitle').textContent = mission ? mission.text : 'Objectifs terminés';
        $('missionProgress').textContent = mission ? `${mission.progress(state)} / ${mission.total}` : '✓';
        $('goals').innerHTML = Store.GOALS.map((g, i) => {
            const value = Math.min(g.progress(state), g.total),
                done = state.completed[i];
            return `<div class="goal"><h3>${g.title}</h3><p>${g.text}</p><div class="goal-track" aria-hidden="true"><span style="width:${(value / g.total) * 100}%"></span></div><div class="goal-meta"><span>${value} / ${g.total}</span><b>${done ? '✓ Prime reçue' : `+${g.reward} €`}</b></div></div>`;
        }).join('');
        document.querySelectorAll('.catalog-card').forEach((b) => {
            b.classList.toggle('selected', b.dataset.type === selected);
            b.classList.toggle('unaffordable', state.money < Store.CATALOG[b.dataset.type].cost);
            b.setAttribute('aria-pressed', String(b.dataset.type === selected));
        });
        $('placement').hidden = !selected;
        if (selected) {
            const item = Store.CATALOG[selected];
            $('placementName').textContent = item.name;
            $('placementPrice').textContent = `${item.cost} € · Case libre`;
        }
        canvas.style.cursor = selected ? 'crosshair' : 'default';
        $('openText').textContent = paused ? 'Une petite pause' : 'C’est ouvert !';
        $('pauseButton').textContent = paused ? '▶ Reprendre' : 'Ⅱ Pause';
        $('pauseButton').setAttribute('aria-pressed', String(paused));
    }
    function cancel() {
        if (!selected) return;
        selected = null;
        updateUI();
        canvas.focus({ preventScroll: true });
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
        if (panel.open) return;
        if (e.key === 'Escape') cancel();
        if (e.code === 'Space' && !['BUTTON', 'INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            paused = !paused;
            updateUI();
        }
    });
    function drainEvents() {
        if (!state.events.length) return;
        toast(state.events.map((event) => event.text).join(' '), state.events.some((event) => event.kind === 'error'));
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
