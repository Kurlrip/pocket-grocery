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
                dpr = Math.max(1, devicePixelRatio || 1);
            if (this.width !== r.width || this.height !== r.height || this.dpr !== dpr) {
                this.width = r.width;
                this.height = r.height;
                this.dpr = dpr;
                this.canvas.width = Math.round(r.width * dpr);
                this.canvas.height = Math.round(r.height * dpr);
            }
            this.scale = Math.min((this.width - 32) / 700, (this.height - 132) / 411);
            this.origin = { x: this.width * 0.5, y: 105 + (this.height - 146 - 252 * this.scale) / 2 };
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
        sprite(sheet, name, x, y, width, options) {
            const p = this.p(x, y);
            return StoreSprites.draw(this.ctx, sheet, name, p.x, p.y, width, options);
        }
        plant(x, y, big = false) {
            if (this.sprite('furniture', big ? 'blossom' : 'shrub', x + 0.24, y + 0.24, big ? 65 : 31))
                return;
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
        building(b, preview = false) {
            const d = Store.CATALOG[b.type],
                { w, h } = d.size,
                c = this.ctx;
            const x = b.x + 0.09,
                y = b.y + 0.09,
                W = w - 0.18,
                H = h - 0.18;
            if (!preview) this.shadow(x, y, W, H);
            if (
                this.sprite('furniture', b.type, b.x + w / 2, b.y + h / 2, w === 1 ? 52 : 94, {
                    flip: w > 1,
                    floorSlope: this.p(1, 0).y / this.p(1, 0).x,
                })
            )
                return;
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
        counter(x, y) {
            if (
                this.sprite('furniture', 'counter', x + 1, y + 0.5, 92, {
                    flip: true,
                    floorSlope: this.p(1, 0).y / this.p(1, 0).x,
                })
            )
                return;
            this.box(x + 0.05, y + 0.05, 1.9, 0.85, 0, 29, '#f4dcc0', '#d3473e', '#9e292c');
            this.box(x + 1.1, y + 0.3, 0.35, 0.35, 29, 14, '#7795a2', '#38424d', '#232b34');
        }
        wallFace(alongX) {
            const point = (u, z) => (alongX ? this.p(u, 0, z) : this.p(0, u, z));
            const c = this.ctx;
            const gradient = c.createLinearGradient(0, -68, 0, 160);
            gradient.addColorStop(0, alongX ? '#ffe7cf' : '#efd1b7');
            gradient.addColorStop(1, alongX ? '#d49873' : '#bd8160');
            this.polygon([point(0, 68), point(10, 68), point(10, 0), point(0, 0)], gradient);
            for (let z = 12; z < 68; z += 11) {
                this.line(point(0, z), point(10, z), '#fff4df35', 0.8);
                for (let u = z % 2 ? 0.45 : 0.9; u < 10; u += 0.9)
                    this.line(point(u, z - 11), point(u, z), '#98624426', 0.7);
            }
            this.line(point(0, 68), point(10, 68), '#fff3db', 4);
            this.line(point(0, 3), point(10, 3), '#9d654b', 4);
        }
        frontGlass() {
            const c = this.ctx;
            for (const x of [0.5, 1.6, 2.7, 5.4, 6.5]) {
                const y = 10;
                const a = this.p(x, y, 44),
                    b = this.p(x + 1.1, y, 44);
                const d = this.p(x, y, 1),
                    e = this.p(x + 1.1, y, 1);
                const glass = c.createLinearGradient(a.x, a.y, e.x, e.y);
                glass.addColorStop(0, '#c9f0ffdf');
                glass.addColorStop(0.52, '#61abd6b3');
                glass.addColorStop(1, '#346e9eb8');
                this.polygon([a, b, e, d], glass);
                this.line(a, b, '#e3edf2', 3);
                this.line(d, e, '#4c6682', 4);
                this.line(a, d, '#5e7d99', 3);
                this.line(b, e, '#476784', 3);
                this.line(this.p(x + 0.18, y, 34), this.p(x + 0.9, y, 28), '#ffffff9e', 2);
                this.line(this.p(x + 0.81, y, 18), this.p(x + 0.81, y, 12), '#f0dfb7', 2);
            }
        }
        person(a, time, staff = false, cashier = false) {
            const p = this.p(a.x + 0.5, a.y + 0.5),
                c = this.ctx;
            const next = a.route?.[0];
            const bob = next ? Math.abs(Math.sin(time * 10 + (a.color || 0))) * 2 : 0;
            const name = cashier ? 'cashier' : staff ? 'employee' : `shopper${(a.color || 0) % 4}`;
            if (
                StoreSprites.draw(c, 'people', name, p.x, p.y - bob, 29, {
                    height: 44,
                    anchor: 0.94,
                    flip: !!next && next.x - a.x < next.y - a.y,
                })
            ) {
                if ((a.state === 'refill' && !next) || cashier) {
                    this.ellipse(p.x, p.y - 47, 8, 6, '#fff9e4');
                    this.text(cashier ? '€' : '↻', p.x, p.y - 44, 8, '#2d6f6a');
                }
                return;
            }
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
            this.wallFace(true);
            this.wallFace(false);
            const c = this.ctx,
                p = this.p(0, 4.8, 43);
            c.save();
            c.translate(p.x, p.y);
            c.transform(1, -0.5, 0, 1, 0, 0);
            c.fillStyle = '#b83836';
            c.fillRect(-61, -19, 122, 36);
            this.text('LA PETITE ÉPICERIE', 0, -4, 9, '#f6edcf', 'Georgia');
            this.text('FRAIS • LOCAL • DE SAISON', 0, 7, 4.8, '#d7e0bd');
            c.restore();
        }
        render(state, hover, selected) {
            this.resize();
            const c = this.ctx;
            c.setTransform(this.canvas.width / this.width, 0, 0, this.canvas.height / this.height, 0, 0);
            c.clearRect(0, 0, this.width, this.height);
            const gradient = c.createRadialGradient(
                this.width * 0.5,
                this.height * 0.55,
                15,
                this.width * 0.5,
                this.height * 0.5,
                this.width * 0.65,
            );
            gradient.addColorStop(0, '#53768d');
            gradient.addColorStop(1, '#1e3148');
            c.fillStyle = gradient;
            c.fillRect(0, 0, this.width, this.height);
            c.save();
            c.translate(this.origin.x, this.origin.y);
            c.scale(this.scale, this.scale);
            this.ellipse(6, 191, 302, 140, '#0a142b43');
            this.box(0, 0, 10, 10, -15, 15, '#f9dfc4', '#c99772', '#ac7a57');
            for (let y = 0; y < 10; y++)
                for (let x = 0; x < 10; x++) {
                    this.surface(x, y, 1, 1, 0.1, (x + y) % 2 ? '#f1d1ad' : '#f8dfc3', '#bc91695e');
                }
            this.walls();
            this.surface(4.04, 9.55, 0.92, 0.46, 0.2, '#855145', '#b47e60');
            const renderables = state.buildings.map((b) => ({
                depth: b.x + b.y + (Store.CATALOG[b.type].size.w + Store.CATALOG[b.type].size.h) / 2,
                draw: () => this.building(b),
            }));
            for (const { x, y } of Store.COUNTERS) {
                renderables.push({ depth: x + y + 1.5, draw: () => this.counter(x, y) });
                renderables.push({
                    depth: x + y + 0.25,
                    draw: () => this.person({ x: x + 0.25, y: y - 1, color: 0 }, state.time, true, true),
                });
            }
            for (const a of state.customers)
                renderables.push({ depth: a.x + a.y + 1, draw: () => this.person(a, state.time) });
            renderables.push({
                depth: state.staff.x + state.staff.y + 1,
                draw: () => this.person(state.staff, state.time, true),
            });
            for (const [x, y] of [
                [0.3, 0.8],
                [8.8, 0.4],
            ])
                renderables.push({ depth: x + y + 1, draw: () => this.plant(x, y) });
            // Stock crates in the rear corner.
            renderables.push({
                depth: 9.8,
                draw: () => {
                    if (this.sprite('furniture', 'stock', 9.3, 0.65, 48)) return;
                    this.box(9, 0.3, 0.7, 0.65, 0, 18, '#c6ad7e', '#b29a6e', '#a48c60');
                    this.box(9, 0.35, 0.62, 0.52, 18, 15, '#d8c397', '#bfa775', '#ae9667');
                },
            });
            renderables.push({ depth: 21, draw: () => this.frontGlass() });
            renderables.push({
                depth: 22,
                draw: () => {
                    this.plant(0.12, 10, false);
                    this.plant(7.54, 10, false);
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
