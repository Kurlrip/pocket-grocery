(() => {
    'use strict';
    function openSave() {
        try {
            return StoreSave.open(window.localStorage);
        } catch {
            return StoreSave.open(null);
        }
    }
    const save = openSave(),
        state = save.loaded?.state ?? Store.create(),
        canvas = document.getElementById('gameCanvas'),
        renderer = new StoreRenderer(canvas);
    let selected = null,
        rotated = false,
        targetTile = null,
        editing = null,
        confirmRemoval = false,
        hover = null,
        speed = save.loaded?.speed ?? 1,
        paused = save.loaded?.paused ?? false,
        last = 0,
        accumulator = 0,
        uiClock = 0,
        toastTimer = 0;
    let saveDirty = save.status === 'empty',
        lastSave = 0,
        restarting = false;
    const moneyFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
    const touches = new Map();
    let touchGesture = false;
    let mousePress = null;
    const $ = (id) => document.getElementById(id);
    const panel = $('gamePanel');
    const panelBody = panel.querySelector('.panel-body');
    const panelTitles = { construction: 'Construire un rayon', objectives: 'Objectifs du quartier', controls: 'Commandes' };
    const panelButtons = [...document.querySelectorAll('[data-panel]')];
    const catalogFeedback = $('catalogFeedback');
    const demandHint = $('demandHint');
    const catalogCards = new Map();
    let hintedProduct = null;
    function setText(element, text) {
        if (element.textContent !== text) element.textContent = text;
    }
    const saveMessages = {
        empty: 'Sauvegarde automatique sur cet appareil.',
        ready: 'Partie sauvegardée sur cet appareil.',
        unavailable: 'Sauvegarde indisponible dans ce navigateur.',
        invalid: 'Sauvegarde illisible ou incompatible. Nouvelle partie pour la remplacer.',
        conflict: 'Partie modifiée dans un autre onglet. Rechargez le jeu pour la reprendre.',
    };
    function saveNow() {
        if (!saveDirty || restarting || !['empty', 'ready'].includes(save.status)) return;
        lastSave = performance.now();
        if (save.write(state, speed, paused)) saveDirty = false;
        else {
            if (save.status === 'conflict') paused = true;
            toast(saveMessages[save.status], true);
            updateUI();
        }
        setText($('saveStatus'), saveMessages[save.status]);
    }
    function checkpoint() {
        saveDirty = true;
        saveNow();
    }
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) saveNow();
    });
    window.addEventListener('pagehide', saveNow);
    function missedLabel(count) {
        return count === 1 ? '1 demande manquée' : `${count} demandes manquées`;
    }
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
            if (button === demandHint && hintedProduct) {
                const card = catalogCards.get(hintedProduct).button;
                card.focus({ preventScroll: true });
                card.scrollIntoView({ block: 'nearest' });
            }
        });
    }
    $('closePanel').addEventListener('click', () => panel.close());
    panel.addEventListener('close', () => {
        for (const button of panelButtons) button.setAttribute('aria-expanded', 'false');
        $('restartConfirm').hidden = true;
        $('restartButton').hidden = false;
    });
    $('restartButton').addEventListener('click', () => {
        $('restartButton').hidden = true;
        $('restartConfirm').hidden = false;
        $('restartNo').focus();
    });
    $('restartNo').addEventListener('click', () => {
        $('restartConfirm').hidden = true;
        $('restartButton').hidden = false;
        $('restartButton').focus();
    });
    $('restartYes').addEventListener('click', () => {
        if (!save.write(Store.create(), 1, false, true)) {
            setText($('saveStatus'), saveMessages[save.status]);
            return;
        }
        restarting = true;
        window.location.reload();
    });
    function toast(text, error = false) {
        $('toast').textContent = text;
        $('toast').className = `toast visible${error ? ' error' : ''}`;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => ($('toast').className = 'toast'), 4000);
    }
    function clearError() {
        if (!$('toast').classList.contains('error')) return;
        clearTimeout(toastTimer);
        $('toast').className = 'toast';
        $('toast').textContent = '';
    }
    for (const [type, d] of Object.entries(Store.CATALOG)) {
        const button = document.createElement('button');
        button.className = 'catalog-card';
        button.dataset.type = type;
        button.setAttribute('aria-pressed', 'false');
        button.innerHTML = `<canvas aria-hidden="true"></canvas><strong>${d.name}</strong><span class="card-detail">${d.detail}</span><span class="card-demand"><span class="card-stock"></span><span class="card-sales"></span><span class="card-missed"></span></span><span class="card-price"><span>${d.cost} €</span><small>+${d.price} € / vente</small></span>`;
        button.addEventListener('click', () => {
            if (state.money < d.cost) {
                catalogFeedback.textContent = `Il manque ${moneyFormat.format(d.cost - state.money)} € pour ce rayon.`;
                catalogFeedback.hidden = false;
                catalogFeedback.scrollIntoView({ block: 'nearest' });
                return;
            }
            selected = type;
            rotated = false;
            targetTile = null;
            editing = null;
            confirmRemoval = false;
            StoreRenderer.thumbnail($('placementArt'), type);
            panel.close();
            canvas.focus({ preventScroll: true });
            updateUI();
        });
        $('catalog').appendChild(button);
        catalogCards.set(type, {
            button,
            stock: button.querySelector('.card-stock'),
            sales: button.querySelector('.card-sales'),
            missed: button.querySelector('.card-missed'),
        });
        StoreRenderer.thumbnail(button.querySelector('canvas'), type);
    }
    StoreSprites.ready.then(() => {
        document
            .querySelectorAll('.catalog-card')
            .forEach((button) =>
                StoreRenderer.thumbnail(button.querySelector('canvas'), button.dataset.type),
            );
        if (selected) StoreRenderer.thumbnail($('placementArt'), selected);
        if (hintedProduct) StoreRenderer.thumbnail($('demandArt'), hintedProduct);
    });
    function updateCatalog() {
        let recommendation = null;
        for (const [type, { button, stock, sales, missed }] of catalogCards) {
            const shelves = state.buildings.filter((shelf) => shelf.type === type);
            const units = shelves.reduce((total, shelf) => total + shelf.stock, 0);
            const demand = state.demand[type];
            setText(stock, units ? `${units} en stock` : shelves.length ? 'En rupture' : 'Rayon à ouvrir');
            setText(sales, `${demand.sold} vente${demand.sold === 1 ? '' : 's'}`);
            setText(missed, missedLabel(demand.missed));
            missed.classList.toggle('has-misses', demand.missed > 0);
            missed.hidden = !demand.missed;
            button.classList.toggle('needs-stock', !units && demand.missed > 0);
            button.classList.toggle('selected', type === selected);
            button.classList.toggle('unaffordable', state.money < Store.CATALOG[type].cost);
            button.setAttribute('aria-pressed', String(type === selected));
            if (!units && demand.missed > (recommendation ? state.demand[recommendation].missed : 0))
                recommendation = type;
        }
        if (recommendation !== hintedProduct && recommendation)
            StoreRenderer.thumbnail($('demandArt'), recommendation);
        hintedProduct = recommendation;
        demandHint.hidden = !hintedProduct || !!selected || !!editing;
        if (hintedProduct) {
            setText($('demandProduct'), Store.CATALOG[hintedProduct].detail);
            setText($('demandCount'), missedLabel(state.demand[hintedProduct].missed));
        }
    }
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
        updateCatalog();
        $('placement').hidden = !selected && !editing;
        $('placeButton').hidden = !selected;
        $('removeButton').hidden = !editing;
        $('removeButton').textContent = confirmRemoval ? 'Confirmer' : 'Retirer';
        $('rotateButton').setAttribute('aria-pressed', String(selected ? rotated : !!editing?.rotated));
        if (selected) {
            const item = Store.CATALOG[selected];
            const valid = targetTile && Store.placement(state, selected, targetTile.x, targetTile.y, rotated).ok;
            $('placementName').textContent = item.name;
            $('placementPrice').textContent = `${item.cost} € · ${targetTile ? valid ? 'Prêt à poser' : 'Pose impossible' : 'Choisis une case'}`;
            $('placeButton').disabled = !valid;
        } else if (editing) {
            $('placementName').textContent = Store.CATALOG[editing.type].name;
            const capacity = Store.CATALOG[editing.type].capacity;
            $('placementPrice').textContent = confirmRemoval ? 'Retrait sans remboursement.' : `${editing.stock} / ${capacity} en stock`;
        }
        canvas.classList.toggle('placing', !!selected);
        $('openText').textContent = paused ? 'Une petite pause' : 'C’est ouvert !';
        const pauseButton = $('pauseButton');
        pauseButton.textContent = paused ? '▶' : 'Ⅱ';
        pauseButton.title = paused ? 'Reprendre' : 'Pause';
        pauseButton.setAttribute('aria-label', pauseButton.title);
        pauseButton.setAttribute('aria-pressed', String(paused));
    }
    function cancel() {
        if (!selected && !editing) return;
        selected = null;
        targetTile = null;
        editing = null;
        confirmRemoval = false;
        updateUI();
        canvas.focus({ preventScroll: true });
    }
    $('cancelButton').addEventListener('click', cancel);
    $('placeButton').addEventListener('click', () => {
        if (selected && targetTile) placeSelected();
    });
    $('rotateButton').addEventListener('click', () => {
        if (selected) {
            rotated = !rotated;
            clearError();
        } else if (editing) {
            const result = Store.rotate(state, editing.id);
            if (!result.ok) toast(result.reason, true);
            else {
                clearError();
                checkpoint();
            }
            confirmRemoval = false;
        }
        updateUI();
    });
    $('removeButton').addEventListener('click', () => {
        if (!editing) return;
        if (confirmRemoval && Store.remove(state, editing.id)) {
            toast(`${Store.CATALOG[editing.type].name} a été retiré.`);
            cancel();
            checkpoint();
            return;
        }
        confirmRemoval = true;
        updateUI();
    });
    function togglePause() {
        paused = !paused;
        checkpoint();
        updateUI();
    }
    $('pauseButton').addEventListener('click', togglePause);
    const speedButtons = [...document.querySelectorAll('[data-speed]')];
    function updateSpeedButtons() {
        for (const button of speedButtons) {
            const active = Number(button.dataset.speed) === speed;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        }
    }
    for (const button of speedButtons) {
        button.addEventListener('click', () => {
            speed = Number(button.dataset.speed);
            updateSpeedButtons();
            checkpoint();
        });
    }
    function placeSelected() {
        const result = Store.place(state, selected, targetTile.x, targetTile.y, rotated);
        if (!result.ok) toast(result.reason, true);
        else {
            cancel();
            drainEvents();
            checkpoint();
        }
        updateUI();
    }
    function activateTile(x, y, touch = false) {
        const tile = renderer.pick(x, y);
        if (selected) {
            targetTile = tile;
            if (touch) {
                const result = Store.placement(state, selected, tile.x, tile.y, rotated);
                if (!result.ok) toast(result.reason, true);
                else clearError();
                updateUI();
            } else placeSelected();
            return;
        }
        const shelf = Store.shelfAt(state.buildings, tile.x, tile.y);
        if (!shelf) {
            cancel();
            return;
        }
        editing = shelf;
        confirmRemoval = false;
        StoreRenderer.thumbnail($('placementArt'), shelf.type);
        updateUI();
    }
    const point = (e) => ({ x: e.clientX, y: e.clientY });
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const tapSlop = 8;
    canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        if (e.pointerType === 'mouse') {
            canvas.setPointerCapture(e.pointerId);
            mousePress = { id: e.pointerId, previous: point(e), dragging: false };
            return;
        }
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
        if (mousePress?.id === e.pointerId) {
            const { previous, dragging } = mousePress;
            if (!dragging && distance(previous, next) < tapSlop) return;
            mousePress.dragging = true;
            mousePress.previous = next;
            canvas.classList.add('panning');
            hover = null;
            renderer.moveCamera(previous, next);
            return;
        }
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
    function endPointer(e) {
        if (mousePress?.id === e.pointerId) {
            const { previous, dragging } = mousePress;
            mousePress = null;
            canvas.classList.remove('panning');
            if (e.type !== 'pointerup' || document.elementFromPoint(e.clientX, e.clientY) !== canvas) {
                hover = null;
                return;
            }
            hover = renderer.pick(e.clientX, e.clientY);
            if (!dragging && distance(previous, point(e)) < tapSlop) activateTile(e.clientX, e.clientY);
            return;
        }
        const previous = touches.get(e.pointerId);
        if (!previous) return;
        const tap = e.type === 'pointerup' && !touchGesture && distance(previous, point(e)) < tapSlop;
        touches.delete(e.pointerId);
        if (!touches.size) touchGesture = false;
        if (tap) activateTile(e.clientX, e.clientY, true);
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('lostpointercapture', endPointer);
    canvas.addEventListener('pointerleave', () => {
        if (!touches.size) hover = null;
    });
    canvas.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.deltaY === 0) return;
        e.preventDefault();
        const anchor = point(e);
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? renderer.height : 1;
        const delta = Math.max(-180, Math.min(180, e.deltaY * unit));
        renderer.moveCamera(anchor, anchor, Math.exp(-delta * 0.002));
        hover = renderer.pick(anchor.x, anchor.y);
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (e.pointerType !== 'touch' && !touches.size) cancel();
    });
    window.addEventListener('keydown', (e) => {
        if (panel.open) return;
        if (e.key === 'Escape') cancel();
        if (e.code === 'Space' && !['BUTTON', 'INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            togglePause();
        }
    });
    function drainEvents() {
        if (!state.events.length) return;
        toast(state.events.map((event) => event.text).join(' '), state.events.some((event) => event.kind === 'error'));
        state.events.length = 0;
    }
    const animateStock = (shelf, previous) => renderer.queueStock(shelf, previous);
    function frame(now) {
        const elapsed = last ? Math.min((now - last) / 1000, 0.2) : 0;
        last = now;
        if (!paused && !document.hidden) {
            accumulator += elapsed * speed;
            while (accumulator >= 1 / 30) {
                Store.step(state, 1 / 30, animateStock);
                accumulator -= 1 / 30;
                saveDirty = true;
            }
            uiClock += elapsed;
            if (uiClock > 0.25) {
                updateUI();
                drainEvents();
                uiClock = 0;
            }
        }
        if (now - lastSave >= 3000) saveNow();
        renderer.render(state, hover || targetTile, selected && { type: selected, rotated }, editing, now);
        requestAnimationFrame(frame);
    }
    setText($('saveStatus'), saveMessages[save.status]);
    updateSpeedButtons();
    updateUI();
    if (save.status === 'invalid' || save.status === 'unavailable') toast(saveMessages[save.status], true);
    requestAnimationFrame(frame);
})();
