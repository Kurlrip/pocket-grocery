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
    canvas.addEventListener('pointermove', (e) => {
        hover = renderer.pick(e.clientX, e.clientY);
    });
    canvas.addEventListener('pointerleave', () => {
        hover = null;
    });
    canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        hover = renderer.pick(e.clientX, e.clientY);
        if (!selected) return;
        const result = Store.place(state, selected, hover.x, hover.y);
        if (!result.ok) toast(result.reason, true);
        else {
            selected = null;
            drainEvents();
        }
        updateUI();
    });
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        cancel();
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
