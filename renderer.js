(function (root) {
    'use strict';
    const TILE = 64;
    // Framing rectangles in the thumbnail canvas, measured with and without the sprite atlas.
    const thumbnailBounds = {
        produce: [[91, 110, 156, 150], [91, 144, 152, 132]],
        bakery: [[87, 103, 156, 158], [91, 142, 153, 136]],
        dairy: [[87, 77, 160, 193], [93, 110, 148, 168]],
        grocery: [[88, 78, 157, 192], [94, 102, 147, 163]],
        flowers: [[109, 162, 75, 68], [100, 133, 79, 115]],
    };
    const hdThumbnailBounds = {
        produce: [93, 114, 146, 162],
        bakery: [92, 127, 148, 149],
        dairy: [95, 75, 143, 202],
        grocery: [96, 114, 139, 162],
        flowers: [110, 179, 74, 71],
    };
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const neighborhoodBackdrop = new Image();
    neighborhoodBackdrop.src = 'assets/commerce-neighborhood.webp';
    class StoreRenderer {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.width = 0;
            this.height = 0;
            this.zoom = 1;
            this.pan = { x: 0, y: 0 };
            this.scale = 1;
            this.origin = { x: 0, y: 0 };
        }
        resize() {
            const r = this.canvas.getBoundingClientRect(),
                dpr = clamp(devicePixelRatio || 1, 1, 2);
            if (this.width !== r.width || this.height !== r.height || this.dpr !== dpr) {
                this.width = r.width;
                this.height = r.height;
                this.dpr = dpr;
                this.canvas.width = Math.round(r.width * dpr);
                this.canvas.height = Math.round(r.height * dpr);
                this.fitScale = clamp(Math.min((this.width - 18) / 790, (this.height - 36) / 560), 0.01, 1.45);
                this.updateCamera();
            }
        }
        updateCamera() {
            this.scale = this.fitScale * this.zoom;
            const baseX = this.width * 0.5 - 18 * this.fitScale,
                baseY = this.height * 0.5 - 205 * this.fitScale,
                marginX = this.width * 0.2,
                marginY = this.height * 0.2,
                floorExtent = 5 * TILE * this.scale;
            // Keep part of the floor reachable even after a long drag.
            this.pan.x = clamp(this.pan.x, marginX - baseX - floorExtent, this.width - marginX - baseX + floorExtent);
            this.pan.y = clamp(this.pan.y, marginY - baseY - floorExtent, this.height - marginY - baseY);
            this.origin = { x: baseX + this.pan.x, y: baseY + this.pan.y };
        }
        moveCamera(from, to, factor = 1) {
            this.resize();
            const rect = this.canvas.getBoundingClientRect(),
                zoom = clamp(this.zoom * factor, 1, 3),
                ratio = zoom / this.zoom;
            this.pan.x += to.x - from.x + (1 - ratio) * (from.x - rect.left - this.origin.x);
            this.pan.y += to.y - from.y + (1 - ratio) * (from.y - rect.top - this.origin.y);
            this.zoom = zoom;
            this.updateCamera();
        }
        p(x, y, z = 0) {
            return { x: ((x - y) * TILE) / 2, y: ((x + y) * TILE) / 4 - z };
        }
        polygon(points, fill, stroke, strokeWidth = 0.65) {
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
                c.lineWidth = strokeWidth;
                c.stroke();
            }
        }
        surface(x, y, w, h, z, color, stroke, strokeWidth) {
            this.polygon(
                [this.p(x, y, z), this.p(x + w, y, z), this.p(x + w, y + h, z), this.p(x, y + h, z)],
                color,
                stroke,
                strokeWidth,
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
            if (b.rotated) {
                const origin = this.p(b.x, b.y);
                this.ctx.save();
                this.ctx.translate(origin.x, origin.y);
                this.ctx.scale(-1, 1);
                this.building({ ...b, x: 0, y: 0, rotated: false }, preview);
                this.ctx.restore();
                return;
            }
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
                return true;
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
        stockMeter(b) {
            const ratio = clamp(b.stock / Store.CATALOG[b.type].capacity, 0, 1);
            const { w, h } = Store.sizeOf(b);
            const p = b.rotated
                ? this.p(b.x + w, b.y + h * 0.6, 3)
                : this.p(b.x + w * 0.6, b.y + h, 3);
            const unit = 1 / this.scale;
            const width = clamp(25 * this.scale, 19, 39) * unit;
            const height = clamp(5 * this.scale, 5, 8) * unit;
            const x = p.x - width / 2, y = p.y - height / 2;
            const c = this.ctx;
            c.beginPath();
            c.roundRect(x, y, width, height, height / 2);
            c.fillStyle = '#29404a';
            c.fill();
            c.lineWidth = unit;
            c.strokeStyle = ratio === 0 ? '#fa927d' : '#fff2d9';
            c.stroke();
            if (ratio > 0) {
                const fillWidth = Math.max(unit, (width - 2 * unit) * ratio);
                c.beginPath();
                c.roundRect(x + unit, y + unit, fillWidth, height - 2 * unit, height / 2);
                c.fillStyle = ratio <= 0.25 ? '#ff947b' : ratio <= 0.5 ? '#ffc761' : '#a8dc72';
                c.fill();
            }
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
        wallFace(alongX, start = 0, end = 10, offset = 0, height = 68) {
            const point = (u, z) => (alongX ? this.p(u, offset, z) : this.p(offset, u, z));
            const c = this.ctx;
            const gradient = c.createLinearGradient(0, -68, 0, 160);
            gradient.addColorStop(0, alongX ? '#ffe7cf' : '#efd1b7');
            gradient.addColorStop(1, alongX ? '#d49873' : '#bd8160');
            this.polygon([point(start, height), point(end, height), point(end, 0), point(start, 0)], gradient);
            for (let z = 12; z < height; z += 11) {
                this.line(point(start, z), point(end, z), '#fff4df35', 0.8);
                for (let u = start + (z % 2 ? 0.45 : 0.9); u < end; u += 0.9)
                    this.line(point(u, z - 11), point(u, z), '#98624426', 0.7);
            }
            this.line(point(start, height), point(end, height), '#fff3db', 4);
            this.line(point(start, 3), point(end, 3), '#9d654b', 4);
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
            const entrance = Store.DEPOT.x;
            this.wallFace(true, 0, entrance - 0.2);
            this.wallFace(true, entrance + 1.2, 10, 0, 12);
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
        drawStockroom() {
            const x = Store.DEPOT.x;
            this.box(x - 1, -2.5, 3, 2.5, -15, 15, '#dfceb4', '#c99772', '#ac7a57');
            for (let column = -1; column < 2; column++) {
                for (let row = -3; row < 0; row++) {
                    const y = Math.max(row, -2.5);
                    const color = (column + row) % 2 ? '#d5c2a5' : '#e8d9c0';
                    this.surface(x + column, y, 1, row + 1 - y, 0.1, color, '#af96765e');
                }
            }
            this.wallFace(true, x - 1, x + 2, -2.5, 54);
            this.wallFace(false, -2.5, 0, x - 1, 54);
            const sign = this.p(x + 0.66, -2.49, 43);
            this.ctx.save();
            this.ctx.translate(sign.x, sign.y);
            this.ctx.transform(1, 0.5, 0, 1, 0, 0);
            this.ctx.fillStyle = '#245a74';
            this.ctx.fillRect(-32, -8, 64, 16);
            this.text('RÉSERVE', 0, 3, 9, '#fff4dc');
            this.ctx.restore();
        }
        drawBackdrop() {
            const c = this.ctx;
            const { naturalWidth, naturalHeight } = neighborhoodBackdrop;
            if (naturalWidth && naturalHeight) {
                const scale = Math.max(this.width / naturalWidth, this.height / naturalHeight);
                const width = naturalWidth * scale;
                c.drawImage(neighborhoodBackdrop, (this.width - width) / 2, 0, width, naturalHeight * scale);
                return;
            }
            const sky = c.createLinearGradient(0, 0, 0, this.height);
            sky.addColorStop(0, '#43a9e9');
            sky.addColorStop(0.35, '#b7e2ef');
            sky.addColorStop(0.44, '#8bb55c');
            sky.addColorStop(1, '#739749');
            c.fillStyle = sky;
            c.fillRect(0, 0, this.width, this.height);
        }
        drawStreet() {
            this.surface(-1.15, -1.1, 12.4, 13.1, -15, '#a8c66b', '#72984d');
            this.box(-0.8, 10, 11.6, 1.55, -23, 12, '#f4dbc0', '#c59a7c', '#ab806c');
            for (let x = -0.5; x < 10.8; x += 0.5)
                this.line(this.p(x, 10, -10), this.p(x, 11.55, -10), '#b8927566');
            this.line(this.p(-0.8, 10.76, -10), this.p(10.8, 10.76, -10), '#b8927566');
            this.box(-0.8, 11.55, 11.6, 2.2, -27, 4, '#536575', '#384c5c', '#405361');
            this.box(-0.8, 13.75, 11.6, 0.63, -26, 11, '#edd2b3', '#bf9b7d', '#aa8267');
            for (let x = 0; x < 10; x += 0.85)
                if (x < 3.6 || x > 5.2) this.surface(x, 12.59, 0.47, 0.075, -22, '#f5d06a');
            for (let y = 11.72; y < 13.65; y += 0.34)
                this.surface(4.04, y, 1.03, 0.17, -22, '#fff2db');
            this.surface(4.12, 10, 0.75, 1.55, -10, '#f7e1b0');
        }
        drawPark() {
            this.box(3.5, 14.38, 7.3, 3.8, -27, 9, '#9fbe60', '#729346', '#587843');
            this.surface(4.04, 14.38, 1.03, 1.4, -17, '#ead5a8');
            this.surface(4.04, 15.7, 5.95, 1.16, -17, '#ead5a8');
            const fountain = this.p(7.25, 16.3, -17);
            this.ellipse(fountain.x, fountain.y, 36, 16, '#c8b28a');
            StoreSprites.draw(this.ctx, 'street', 'fountain', fountain.x, fountain.y, 64, { anchor: 0.82 });
            for (const [name, x, y, width] of [
                ['hedge', 5.7, 14.82, 79],
                ['shrub', 5.15, 17.1, 53],
                ['blossom', 10.32, 15.12, 96],
                ['bench', 9.52, 16.67, 55],
                ['tree', 10.3, 17.56, 98],
            ]) {
                this.sprite('furniture', name, x, y, width);
            }
        }
        drawTraffic(time) {
            const elapsed = (time + 6.7) % 18;
            if (elapsed > 11) return;
            const c = this.ctx,
                p = this.p(elapsed - 0.35, 13.02, -22);
            c.save();
            c.globalAlpha = Math.min(1, elapsed * 2, (11 - elapsed) * 2);
            this.ellipse(p.x, p.y + 2, 35, 10, '#14263850');
            StoreSprites.draw(c, 'street', 'car', p.x, p.y, 78, { height: 59, anchor: 0.82 });
            c.restore();
        }
        render(state, hover, draft, editing) {
            this.resize();
            const c = this.ctx;
            c.setTransform(this.canvas.width / this.width, 0, 0, this.canvas.height / this.height, 0, 0);
            this.drawBackdrop();
            c.save();
            c.translate(this.origin.x, this.origin.y);
            c.scale(this.scale, this.scale);
            this.ellipse(-22, 203, 345, 169, '#37492640');
            this.drawStreet();
            for (const [name, x, y, width] of [
                ['tree', -0.7, 2.4, 91],
                ['blossom', -0.75, 6.6, 83],
                ['hedge', 4.1, -0.7, 79],
                ['tree', 8.5, -3.1, 110],
            ]) {
                this.sprite('furniture', name, x, y, width);
            }
            this.drawStockroom();
            this.box(0, 0, 10, 10, -15, 15, '#f9dfc4', '#c99772', '#ac7a57');
            for (let y = 0; y < 10; y++)
                for (let x = 0; x < 10; x++) {
                    this.surface(x, y, 1, 1, 0.1, (x + y) % 2 ? '#f1d1ad' : '#f8dfc3', '#bc91695e');
                }
            if (editing) {
                const { w, h } = Store.sizeOf(editing);
                this.surface(editing.x, editing.y, w, h, 1, '#62a6d878', '#2674a7');
            }
            this.walls();
            this.surface(4.04, 9.55, 0.92, 0.46, 0.2, '#855145', '#b47e60');
            const renderables = state.buildings.map((b) => ({
                depth: b.x + b.y + (Store.CATALOG[b.type].size.w + Store.CATALOG[b.type].size.h) / 2,
                draw: () => this.building(b),
            }));
            const cashierOffset = StoreSprites.hasHDFurniture('counter') ? 0.35 : 0;
            for (const { x, y } of Store.COUNTERS) {
                renderables.push({ depth: x + y + 1.5, draw: () => this.counter(x, y) });
                renderables.push({
                    depth: x + y + 0.25,
                    draw: () => this.person(
                        { x: x + 0.25 + cashierOffset, y: y - 1 + cashierOffset, color: 0 },
                        state.time, true, true,
                    ),
                });
            }
            for (const [name, x, y, width] of [
                ['planter', 3.18, 10.25, 30],
                ['chalkboard', 5.24, 10.58, 29],
                ['planter', 7.72, 10.47, 34],
            ]) {
                const p = this.p(x, y, -10);
                renderables.push({
                    depth: x + y + 1,
                    draw: () => StoreSprites.draw(c, 'street', name, p.x, p.y, width),
                });
            }
            for (const a of state.customers) {
                renderables.push({
                    depth: a.x + a.y + 1,
                    draw: () => {
                        this.person(a, state.time);
                        if (a.unserved) {
                            const p = this.p(a.x + 0.5, a.y + 0.5, 48);
                            this.ellipse(p.x, p.y, 9, 8, '#fff0cc');
                            this.text('!', p.x, p.y + 4, 12, '#813e2d');
                        }
                    },
                });
            }
            const staff = state.staff;
            const distanceFromStockroom = Math.abs(staff.x - Store.DEPOT.x) + Math.abs(staff.y - Store.DEPOT.y);
            // Extend the drawn route into the annex while the simulation uses the shop grid.
            const visibleStaff = { ...staff, y: staff.y - 1.7 * Math.max(0, 1 - distanceFromStockroom) };
            renderables.push({
                depth: visibleStaff.x + visibleStaff.y + 1,
                draw: () => this.person(visibleStaff, state.time, true),
            });
            renderables.push({ depth: 2.1, draw: () => this.plant(0.3, 0.8) });
            renderables.push({
                depth: 8.5,
                draw: () => {
                    const x = Store.DEPOT.x + 1.48, y = -1.46;
                    if (this.sprite('furniture', 'stock', x, y, 45)) return;
                    this.box(x - 0.35, y - 0.28, 0.7, 0.65, 0, 18, '#c6ad7e', '#b29a6e', '#a48c60');
                    this.box(x - 0.35, y - 0.23, 0.62, 0.52, 18, 15, '#d8c397', '#bfa775', '#ae9667');
                },
            });
            renderables.push({ depth: 21, draw: () => this.frontGlass() });
            for (const [name, x, y, width] of [
                ['blossom', 0.05, 10.8, 76],
                ['bench', 2.35, 10.65, 57],
                ['lamp', 3.45, 11.21, 23],
                ['lamp', 5.63, 11.21, 23],
                ['shrub', 6.73, 10.62, 42],
                ['tree', 10.5, 10.65, 105],
            ]) {
                renderables.push({
                    depth: x + y + 1,
                    draw: () => {
                        if (!this.sprite('furniture', name, x, y, width)) this.plant(x, y);
                    },
                });
            }
            if (draft && hover && hover.x >= 0 && hover.y >= 0 && hover.x < 10 && hover.y < 10) {
                const valid = Store.placement(state, draft.type, hover.x, hover.y, draft.rotated).ok,
                    { w, h } = Store.sizeOf(draft);
                this.surface(
                    hover.x,
                    hover.y,
                    w,
                    h,
                    1,
                    valid ? '#78c45ba8' : '#e87d69a8',
                    valid ? '#397640' : '#a33c2e',
                    2.2,
                );
                renderables.push({
                    depth: hover.x + hover.y + (w + h) / 2,
                    draw: () => {
                        c.save();
                        c.globalAlpha = 0.6;
                        this.building({ ...draft, x: hover.x, y: hover.y }, true);
                        c.restore();
                    },
                });
            }
            renderables.sort((a, b) => a.depth - b.depth).forEach((item) => item.draw());
            this.drawTraffic(state.time);
            this.drawPark();
            for (const b of state.buildings) this.stockMeter(b);
            if (!draft && !editing && hover) {
                const b = Store.shelfAt(state.buildings, hover.x, hover.y);
                if (b) {
                    const d = Store.CATALOG[b.type],
                        { w, h } = Store.sizeOf(b),
                        p = this.p(b.x + w / 2, b.y + h / 2, 78);
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
            this.resize();
            const rect = this.canvas.getBoundingClientRect();
            return Isometric.pick(
                (clientX - rect.left - this.origin.x) / this.scale,
                (clientY - rect.top - this.origin.y) / this.scale,
                TILE,
                { x: 0, y: 0 },
            );
        }
        static thumbnail(canvas, type) {
            const source = document.createElement('canvas');
            source.width = 320;
            source.height = 300;
            const r = new StoreRenderer(source);
            r.ctx.translate(140, 200);
            r.ctx.scale(1.7, 1.7);
            const illustrated = r.building({ x: 0, y: 0, type }, true);
            const hdBounds = StoreSprites.hasHDFurniture(type) && hdThumbnailBounds[type];
            const [left, top, width, height] = hdBounds || thumbnailBounds[type][illustrated ? 0 : 1];
            const sw = width + 4, sh = height + 4;
            const dpr = Math.min(devicePixelRatio || 1, 2);
            canvas.width = Math.round(144 * dpr);
            canvas.height = Math.round(104 * dpr);
            const scale = Math.min((canvas.width - 12 * dpr) / sw, (canvas.height - 12 * dpr) / sh);
            const dw = sw * scale, dh = sh * scale;
            canvas.getContext('2d').drawImage(
                source, left - 2, top - 2, sw, sh, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh,
            );
        }
    }
    root.StoreRenderer = StoreRenderer;
})(globalThis);
