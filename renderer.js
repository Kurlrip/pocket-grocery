(function (root) {
    'use strict';
    const TILE = 64;
    class StoreRenderer {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.width = 0;
            this.height = 0;
            this.scale = 1;
            this.origin = { x: 0, y: 0 };
        }
        resize() {
            const r = this.canvas.getBoundingClientRect(),
                dpr = Math.min(devicePixelRatio || 1, 2);
            if (this.width !== r.width || this.height !== r.height || this.dpr !== dpr) {
                this.width = r.width;
                this.height = r.height;
                this.dpr = dpr;
                this.canvas.width = Math.round(r.width * dpr);
                this.canvas.height = Math.round(r.height * dpr);
            }
            this.scale = Math.min((this.width - 24) / 870, (this.height - 150) / 440);
            this.origin = { x: this.width * 0.5, y: 118 + (this.height - 158 - 320 * this.scale) / 2 };
        }
        p(x, y, z = 0) {
            return { x: ((x - y) * TILE) / 2, y: ((x + y) * TILE) / 4 - z };
        }
        polygon(points, fill, stroke) {
            const c = this.ctx;
            c.beginPath();
            points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
            c.closePath();
            if (fill) {
                c.fillStyle = fill;
                c.fill();
            }
            if (stroke) {
                c.strokeStyle = stroke;
                c.lineWidth = 0.65;
                c.stroke();
            }
        }
        surface(x, y, w, h, z, color, stroke) {
            this.polygon(
                [this.p(x, y, z), this.p(x + w, y, z), this.p(x + w, y + h, z), this.p(x, y + h, z)],
                color,
                stroke,
            );
        }
        box(x, y, w, h, z, height, top, left, right) {
            const a = this.p(x, y, z),
                b = this.p(x + w, y, z),
                d = this.p(x, y + h, z),
                e = this.p(x + w, y + h, z);
            const up = (p) => ({ x: p.x, y: p.y - height });
            this.polygon([d, e, up(e), up(d)], left, '#42503c18');
            this.polygon([b, e, up(e), up(b)], right, '#42503c18');
            this.polygon([up(a), up(b), up(e), up(d)], top, '#ffffff22');
        }
        ellipse(x, y, rx, ry, color) {
            const c = this.ctx;
            c.beginPath();
            c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
            c.fillStyle = color;
            c.fill();
        }
        line(a, b, color, width = 1) {
            const c = this.ctx;
            c.beginPath();
            c.moveTo(a.x, a.y);
            c.lineTo(b.x, b.y);
            c.strokeStyle = color;
            c.lineWidth = width;
            c.stroke();
        }
        text(text, x, y, size, color, font = 'sans-serif') {
            const c = this.ctx;
            c.font = `${size}px ${font}`;
            c.textAlign = 'center';
            c.fillStyle = color;
            c.fillText(text, x, y);
        }
        shadow(x, y, w, h) {
            this.surface(x + 0.12, y + 0.12, w + 0.05, h + 0.12, 0.2, '#354a3422');
        }
        plant(x, y, big = false) {
            const p = this.p(x + 0.25, y + 0.25, 0);
            this.ellipse(p.x, p.y + 4, big ? 24 : 12, big ? 11 : 6, '#40533818');
            this.box(x, y, 0.48, 0.48, 0, big ? 20 : 13, '#b6ad90', '#978f75', '#a59e80');
            const z = big ? 57 : 30;
            this.line(this.p(x + 0.24, y + 0.24, 14), this.p(x + 0.24, y + 0.24, z), '#6c7551', big ? 5 : 2);
            const center = this.p(x + 0.24, y + 0.24, z);
            for (let i = 0; i < 7; i++) {
                const angle = i * 2.4;
                this.ellipse(
                    center.x + Math.cos(angle) * (big ? 13 : 6),
                    center.y + Math.sin(angle) * (big ? 10 : 5),
                    big ? 19 : 9,
                    big ? 17 : 8,
                    ['#829963', '#6f8b55', '#9aaf78'][i % 3],
                );
            }
            this.ellipse(center.x - 6, center.y - 8, big ? 14 : 7, big ? 12 : 6, '#a6ba83');
        }
        tree(x, y) {
            const p = this.p(x, y);
            this.ellipse(p.x + 7, p.y + 7, 40, 19, '#6477471c');
            this.box(x - 0.08, y - 0.08, 0.16, 0.16, 0, 66, '#93876a', '#8a7e61', '#7e7459');
            const a = this.p(x, y, 84);
            for (const [dx, dy, r, col] of [
                [-18, 0, 28, '#8eaa6d'],
                [20, 0, 30, '#88a566'],
                [0, -22, 33, '#a1b97c'],
                [-10, 12, 29, '#91ae6f'],
                [13, -14, 27, '#b0c58b'],
            ])
                this.ellipse(a.x + dx, a.y + dy, r, r * 0.84, col);
        }
        building(b, preview = false) {
            const d = Store.CATALOG[b.type],
                { w, h } = d.size,
                c = this.ctx;
            const x = b.x + 0.09,
                y = b.y + 0.09,
                W = w - 0.18,
                H = h - 0.18;
            if (!preview) this.shadow(x, y, W, H);
            if (b.type === 'produce') {
                this.box(x + 0.05, y + 0.04, W - 0.1, H - 0.08, 0, 8, '#a07e51', '#88683f', '#765939');
                this.box(x, y, W, H, 8, 20, '#bfa16f', '#aa895c', '#93764d');
                this.box(x - 0.015, y - 0.015, W + 0.03, H + 0.03, 27, 4, '#d7bb8c', '#c0a075', '#ad8b60');
                for (let k = 0; k < 3; k++) {
                    const bx = x + 0.08 + k * (W / 3);
                    this.surface(bx, y + 0.07, W / 3 - 0.11, H - 0.14, 32, '#69563a');
                    for (let i = 0; i < 3; i++)
                        for (let j = 0; j < 3; j++) {
                            const p = this.p(bx + 0.07 + i * 0.12, y + 0.13 + j * 0.21, 36 + (i % 2) * 2);
                            this.ellipse(p.x, p.y, 4.2, 3.7, ['#c76542', '#a6b754', '#dfaa4c'][k]);
                            this.ellipse(p.x - 1, p.y - 1, 1.3, 1, ['#e68a5e', '#c4d26d', '#f3cb72'][k]);
                        }
                }
                this.label(b, 'BIO', d.color, 31);
            } else if (b.type === 'bakery') {
                this.box(x, y, W, H, 0, 29, '#c49c6c', '#b18c61', '#95734d');
                this.box(x - 0.03, y - 0.03, W + 0.06, H + 0.06, 29, 4, '#e0c297', '#ceb087', '#b79a72');
                for (let k = 0; k < 3; k++) {
                    this.surface(x + 0.06 + k * 0.59, y + 0.09, 0.5, H - 0.18, 34, '#9f7b4d');
                    for (let j = 0; j < 3; j++) {
                        const p = this.p(x + 0.18 + k * 0.59, y + 0.2 + j * 0.19, 38);
                        c.save();
                        c.translate(p.x, p.y);
                        c.rotate(-0.35);
                        this.ellipse(0, 0, 9, 4, '#d9aa60');
                        for (let q = -1; q <= 1; q++)
                            this.line({ x: q * 4 - 1, y: -2 }, { x: q * 4 + 1, y: 1 }, '#f6d496', 1.2);
                        c.restore();
                    }
                }
                this.label(b, 'PAIN', d.color, 32);
            } else if (b.type === 'dairy') {
                this.box(x, y, W, H, 0, 41, '#e1eddf', '#8caba8', '#7b9996');
                this.box(x, y, W, 0.13, 41, 14, '#a4c2bb', '#82a6a1', '#71978f');
                this.box(x + 0.07, y + 0.17, W - 0.14, H - 0.22, 41, 3, '#bbd7d1', '#adcac5', '#9fbbb6');
                for (let i = 0; i < 6; i++) {
                    const px = x + 0.17 + i * 0.25,
                        py = y + 0.37;
                    this.box(
                        px,
                        py,
                        0.12,
                        0.2,
                        44,
                        8,
                        ['#f6f4df', '#e8d588', '#eff2e9'][i % 3],
                        '#c6d4c4',
                        '#bbc9be',
                    );
                    this.box(px + 0.025, py + 0.02, 0.07, 0.12, 52, 2, '#86a3ab', '#809da0', '#709096');
                }
                this.label(b, 'FRAIS', d.color, 30);
            } else if (b.type === 'grocery') {
                this.box(x, y + 0.08, W, 0.25, 0, 61, '#ba9770', '#a88661', '#967452');
                for (const z of [12, 31, 50]) {
                    this.box(x - 0.015, y + 0.02, W + 0.03, H - 0.05, z, 3, '#d8ba8d', '#c1a274', '#af8d64');
                    for (let i = 0; i < 7; i++) {
                        const px = x + 0.12 + i * 0.23,
                            py = y + 0.43;
                        const color = ['#8b9b63', '#b67452', '#d6bb79', '#c6bc94'][i % 4];
                        this.box(px, py, 0.14, 0.18, z + 3, 10, color, color, color);
                        this.box(px, py, 0.14, 0.18, z + 6, 3, '#e5ddbf', '#e5ddbf', '#d9d0ae');
                        this.box(px, py, 0.14, 0.18, z + 13, 2, '#ddd5b0', '#c8bd94', '#b7ab85');
                    }
                }
                this.label(b, 'ÉPICERIE', d.color, 20);
            } else {
                this.box(x + 0.08, y + 0.05, W - 0.16, H - 0.1, 0, 25, '#d4bd97', '#b9a27c', '#ab926d');
                for (const [dx, dy, col] of [
                    [0.2, 0.2, '#d692aa'],
                    [0.56, 0.24, '#e9c477'],
                    [0.3, 0.58, '#ab9ebd'],
                ]) {
                    const p = this.p(x + dx, y + dy, 40);
                    for (let i = 0; i < 4; i++) {
                        const angle = i * 1.7;
                        this.line(
                            { x: p.x, y: p.y + 13 },
                            { x: p.x + Math.cos(angle) * 7, y: p.y + Math.sin(angle) * 6 },
                            '#728b57',
                            2,
                        );
                        this.ellipse(p.x + Math.cos(angle) * 7, p.y + Math.sin(angle) * 6, 4, 3, col);
                    }
                    this.ellipse(p.x, p.y, 4, 4, col);
                }
            }
        }
        label(b, text, color, z) {
            const { w, h } = Store.CATALOG[b.type].size,
                p = this.p(b.x + w / 2, b.y + h + 0.025, z);
            const c = this.ctx;
            c.save();
            c.translate(p.x, p.y);
            c.transform(1, 0.5, 0, 1, 0, 0);
            c.fillStyle = '#fbf6df';
            c.fillRect(-15, -3, 30, 10);
            this.text(text, 0, 4, 5.3, color);
            c.restore();
        }
        counter() {
            this.shadow(1.05, 7.05, 1.9, 0.85);
            this.box(1.05, 7.05, 1.9, 0.85, 0, 28, '#bed0ad', '#547d62', '#41684f');
            this.box(1.01, 7.01, 1.98, 0.93, 28, 4, '#d4bd90', '#b9a37a', '#a58d67');
            this.box(1.17, 7.2, 0.7, 0.53, 32, 2, '#829184', '#647e6d', '#637766');
            this.box(2.2, 7.28, 0.37, 0.34, 32, 6, '#dedfce', '#9da99b', '#89988c');
            const p = this.p(2.35, 7.35, 47);
            this.polygon(
                [
                    { x: p.x - 7, y: p.y - 6 },
                    { x: p.x + 7, y: p.y + 1 },
                    { x: p.x + 7, y: p.y + 12 },
                    { x: p.x - 7, y: p.y + 5 },
                ],
                '#44635a',
            );
            this.polygon(
                [
                    { x: p.x - 5, y: p.y - 3 },
                    { x: p.x + 5, y: p.y + 2 },
                    { x: p.x + 5, y: p.y + 9 },
                    { x: p.x - 5, y: p.y + 4 },
                ],
                '#a3c8b7',
            );
            const bag = this.p(1.9, 7.65, 33);
            this.box(1.81, 7.55, 0.2, 0.22, 32, 11, '#d9c49a', '#c0a979', '#b29a70');
            this.line({ x: bag.x - 3, y: bag.y - 10 }, { x: bag.x - 3, y: bag.y - 16 }, '#ab976c', 1);
        }
        person(a, time, staff = false, cashier = false) {
            const p = this.p(a.x + 0.5, a.y + 0.5),
                c = this.ctx;
            const walk = a.route?.length ? Math.sin(time * 11 + a.color) * 2 : 0;
            this.ellipse(p.x, p.y, 8, 3.8, '#4b53352b');
            const shirt = staff
                ? '#7d9a68'
                : ['#b4856a', '#c9a264', '#8aa6a5', '#b58a9c', '#788da3'][a.color || 0];
            this.line({ x: p.x - 3, y: p.y - 9 }, { x: p.x - 3 + walk, y: p.y - 1 }, '#514f43', 3.5);
            this.line({ x: p.x + 3, y: p.y - 9 }, { x: p.x + 3 - walk, y: p.y - 1 }, '#514f43', 3.5);
            c.fillStyle = shirt;
            c.beginPath();
            c.roundRect(p.x - 6, p.y - 23, 12, 16, 4);
            c.fill();
            this.line({ x: p.x - 6, y: p.y - 20 }, { x: p.x - 8 - walk, y: p.y - 11 }, '#d5ac86', 3);
            this.line({ x: p.x + 6, y: p.y - 20 }, { x: p.x + 8 + walk, y: p.y - 11 }, '#d5ac86', 3);
            if (staff) {
                c.fillStyle = '#496b50';
                c.fillRect(p.x - 4, p.y - 20, 8, 12);
                c.fillStyle = '#e1dbb9';
                c.fillRect(p.x + 1, p.y - 18, 3, 2);
            }
            this.ellipse(p.x, p.y - 27, 5.5, 6.5, '#dab38d');
            this.ellipse(p.x - 1, p.y - 31, 5.5, 3.8, staff ? '#6e624b' : '#655748');
            if (a.value > 0) {
                this.box(a.x + 0.72, a.y + 0.48, 0.17, 0.18, 9, 9, '#d0b688', '#bda16e', '#af925e');
            }
            if ((a.state === 'refill' && !a.route.length) || cashier) {
                const t = this.p(a.x + 0.5, a.y + 0.5, 44);
                this.ellipse(t.x, t.y, 8, 6, '#fff9e4');
                this.text(cashier ? '€' : '↻', t.x, t.y + 3, 8, '#749360');
            }
        }
        walls() {
            this.box(-0.17, -0.17, 10.34, 0.16, 0, 66, '#d9d7bd', '#e0dfc8', '#c0c6aa');
            this.box(-0.17, 0, 0.16, 10, 0, 66, '#d9d7bd', '#bcc6ac', '#e3e0c8');
            this.box(-0.2, -0.2, 10.4, 0.2, 65, 4, '#eee8cd', '#d7d8bb', '#c9ceb1');
            this.box(-0.2, 0, 0.2, 10, 65, 4, '#eee8cd', '#c1c9ac', '#dcd8ba');
            this.box(0, 0.03, 10, 0.03, 0, 10, '#96aa83', '#a5b995', '#8da57d');
            this.box(0.03, 0, 0.03, 10, 0, 10, '#96aa83', '#a5b995', '#8da57d');
            // Windows on the rear wall, built in its projected plane.
            for (const x of [1.1, 3.4, 6.6]) {
                const points = [
                    this.p(x, 0, 52),
                    this.p(x + 1.6, 0, 52),
                    this.p(x + 1.6, 0, 19),
                    this.p(x, 0, 19),
                ];
                this.polygon(points, '#b7d0c4', '#92ad9b');
                this.line(this.p(x + 0.8, 0, 52), this.p(x + 0.8, 0, 19), '#e5e4c8', 3);
                this.line(this.p(x, 0, 35), this.p(x + 1.6, 0, 35), '#e5e4c8', 3);
                this.line(this.p(x + 0.1, 0, 23), this.p(x + 1.45, 0, 49), '#d6e5d746', 5);
            }
            const c = this.ctx,
                p = this.p(0, 4.8, 43);
            c.save();
            c.translate(p.x, p.y);
            c.transform(1, -0.5, 0, 1, 0, 0);
            c.fillStyle = '#4e765b';
            c.fillRect(-61, -19, 122, 36);
            this.text('LA PETITE ÉPICERIE', 0, -4, 9, '#f6edcf', 'Georgia');
            this.text('FRAIS • LOCAL • DE SAISON', 0, 7, 4.8, '#d7e0bd');
            c.restore();
        }
        environment(time) {
            const c = this.ctx;
            this.ellipse(7, 200, 360, 135, '#7c8e6220');
            this.box(-1.7, -1.7, 13.4, 13.4, -22, 18, '#cbd7ae', '#b5c39b', '#a8ba90');
            // A paved lane around the store; individually shaded slabs keep the miniature scale.
            for (let y = -1; y < 11; y++)
                for (let x = -1; x < 11; x++)
                    if (x < 0 || y < 0 || x === 10 || y === 10)
                        this.surface(x, y, 0.98, 0.98, -3, (x + y) % 2 ? '#dedbc8' : '#e4dfce', '#c7c7ae55');
            this.tree(-1.1, 1.4);
            this.tree(9.5, -1.1);
            // Small entrance welcome mat.
            this.surface(3.9, 10.05, 1.3, 0.85, 1, '#8c9d78');
            const p = this.p(4.55, 10.5, 2);
            c.save();
            c.translate(p.x, p.y);
            c.transform(1, 0.5, -1, 0.5, 0, 0);
            this.text('BIENVENUE', 0, 2, 5, '#f2edcf');
            c.restore();
            // Sparse meadow flowers, stable positions rather than per-frame randomness.
            for (let i = 0; i < 30; i++) {
                const x = -1.5 + ((i * 1.79) % 13),
                    y = i % 2 ? -1.4 : 11.35;
                const p = this.p(x, y, -2);
                this.line(p, { x: p.x + 1, y: p.y - 4 }, '#9cad7b', 1);
                if (i % 3 === 0) this.ellipse(p.x + 1, p.y - 5, 1.8, 1.8, '#f3edc0');
            }
        }
        render(state, hover, selected) {
            this.resize();
            const c = this.ctx;
            c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            c.clearRect(0, 0, this.width, this.height);
            const gradient = c.createRadialGradient(
                this.width * 0.5,
                this.height * 0.55,
                15,
                this.width * 0.5,
                this.height * 0.5,
                this.width * 0.65,
            );
            gradient.addColorStop(0, '#f4f4e7');
            gradient.addColorStop(1, '#e9efdf');
            c.fillStyle = gradient;
            c.fillRect(0, 0, this.width, this.height);
            c.save();
            c.translate(this.origin.x, this.origin.y);
            c.scale(this.scale, this.scale);
            this.environment(state.time);
            this.box(0, 0, 10, 10, -12, 12, '#efead8', '#c5bda3', '#b1af94');
            for (let y = 0; y < 10; y++)
                for (let x = 0; x < 10; x++)
                    this.surface(x, y, 0.997, 0.997, 0.1, (x + y) % 2 ? '#e8e1cb' : '#f0ead7', '#d4cdb544');
            this.walls();
            const renderables = state.buildings.map((b) => ({
                depth: b.x + b.y + (Store.CATALOG[b.type].size.w + Store.CATALOG[b.type].size.h) / 2,
                draw: () => this.building(b),
            }));
            renderables.push({ depth: 9.5, draw: () => this.counter() });
            renderables.push({
                depth: 8,
                draw: () => this.person({ x: 1.25, y: 6, color: 0 }, state.time, true, true),
            });
            for (const a of state.customers)
                renderables.push({ depth: a.x + a.y + 1, draw: () => this.person(a, state.time) });
            renderables.push({
                depth: state.staff.x + state.staff.y + 1,
                draw: () => this.person(state.staff, state.time, true),
            });
            for (const [x, y] of [
                [0.3, 0.8],
                [0.3, 8.7],
                [8.8, 0.4],
            ])
                renderables.push({ depth: x + y + 1, draw: () => this.plant(x, y) });
            for (const [x, y, big] of [
                [-1.3, 6.6, true],
                [10.45, 2, true],
                [1.7, 10.5, false],
                [7.4, 10.5, false],
            ])
                renderables.push({ depth: x + y + 1, draw: () => this.plant(x, y, big) });
            renderables.push({
                depth: 16.4,
                draw: () => this.box(10.45, 5, 0.35, 1.65, -2, 13, '#94ad73', '#7d9860', '#718c56'),
            });
            renderables.push({
                depth: 18.5,
                draw: () => {
                    this.box(10.28, 7.3, 0.54, 1.3, 0, 12, '#c6ac7a', '#af9567', '#a08760');
                    this.box(10.72, 7.3, 0.12, 1.3, 12, 16, '#c6ac7a', '#b29a6c', '#9b855c');
                },
            });
            // Stock crates in the rear corner.
            renderables.push({
                depth: 9.8,
                draw: () => {
                    this.box(9, 0.3, 0.7, 0.65, 0, 18, '#c6ad7e', '#b29a6e', '#a48c60');
                    this.box(9, 0.35, 0.62, 0.52, 18, 15, '#d8c397', '#bfa775', '#ae9667');
                },
            });
            if (selected && hover && hover.x >= 0 && hover.y >= 0 && hover.x < 10 && hover.y < 10) {
                const valid = Store.placement(state, selected, hover.x, hover.y).ok,
                    d = Store.CATALOG[selected];
                this.surface(
                    hover.x,
                    hover.y,
                    d.size.w,
                    d.size.h,
                    1,
                    valid ? '#759a5f66' : '#bf715f66',
                    valid ? '#64834c' : '#af6250',
                );
                renderables.push({
                    depth: hover.x + hover.y + (d.size.w + d.size.h) / 2,
                    draw: () => {
                        c.save();
                        c.globalAlpha = 0.6;
                        this.building({ x: hover.x, y: hover.y, type: selected }, true);
                        c.restore();
                    },
                });
            }
            renderables.sort((a, b) => a.depth - b.depth).forEach((item) => item.draw());
            if (!selected && hover) {
                const b = state.buildings.find(
                    (b) =>
                        hover.x >= b.x &&
                        hover.x < b.x + Store.CATALOG[b.type].size.w &&
                        hover.y >= b.y &&
                        hover.y < b.y + Store.CATALOG[b.type].size.h,
                );
                if (b) {
                    const d = Store.CATALOG[b.type],
                        p = this.p(b.x + d.size.w / 2, b.y + 0.5, 78);
                    c.fillStyle = '#fffdf3';
                    c.shadowColor = '#4c5c3320';
                    c.shadowBlur = 12;
                    c.beginPath();
                    c.roundRect(p.x - 62, p.y - 24, 124, 43, 7);
                    c.fill();
                    c.shadowBlur = 0;
                    this.text(d.name, p.x, p.y - 9, 10, '#3a5b42');
                    this.text(
                        `${b.stock} / ${d.capacity} en stock · ${d.price} €`,
                        p.x,
                        p.y + 5,
                        8,
                        '#869476',
                    );
                }
            }
            c.restore();
        }
        pick(clientX, clientY) {
            const rect = this.canvas.getBoundingClientRect();
            return Isometric.pick(
                (clientX - rect.left - this.origin.x) / this.scale,
                (clientY - rect.top - this.origin.y) / this.scale,
                TILE,
                { x: 0, y: 0 },
            );
        }
        static thumbnail(canvas, type) {
            const r = new StoreRenderer(canvas),
                c = r.ctx,
                dpr = Math.min(devicePixelRatio || 1, 2);
            canvas.width = 250 * dpr;
            canvas.height = 140 * dpr;
            c.scale(dpr, dpr);
            c.translate(124, 86);
            c.scale(1.2, 1.2);
            const w = Store.CATALOG[type].size.w;
            c.translate(-(w - 1) * 16, -(w + 1) * 8);
            r.building({ x: 0, y: 0, type }, true);
        }
    }
    root.StoreRenderer = StoreRenderer;
})(globalThis);
