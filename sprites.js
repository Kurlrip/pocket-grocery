(() => {
    'use strict';
    const images = {};
    const frames = {
        furniture: {
            produce: [947, 712, 254, 178],
            bakery: [1213, 720, 213, 162],
            dairy: [498, 710, 205, 181],
            grocery: [717, 709, 212, 179],
            flowers: [893, 581, 136, 129],
            counter: [260, 724, 231, 166],
            stock: [304, 880, 202, 199],
            tree: [21, 522, 184, 193],
            blossom: [209, 525, 190, 191],
            shrub: [752, 578, 145, 131],
            hedge: [1225, 182, 219, 160],
            bench: [267, 352, 209, 176],
            lamp: [493, 331, 78, 193],
            paving: [512, 16, 232, 133],
            grass: [25, 20, 237, 129],
        },
        'furniture-hd-v2': {
            bakery: [4, 4, 426, 311],
            grocery: [438, 4, 424, 343],
            dairy: [870, 4, 410, 336],
            counter: [4, 420, 462, 271],
            produce: [474, 420, 508, 355],
            flowers: [990, 420, 272, 234],
        },
        people: {
            shopper0: [42, 21, 152, 249],
            shopper1: [214, 27, 145, 245],
            shopper2: [386, 27, 142, 242],
            shopper3: [552, 23, 179, 249],
            cashier: [747, 23, 147, 245],
            employee: [914, 20, 146, 250],
        },
        'people-floor': {
            shopper0: [2, 2, 216, 328],
            shopper1: [222, 2, 216, 328],
            shopper2: [442, 2, 216, 328],
            shopper3: [2, 334, 216, 328],
            cashier: [222, 334, 216, 328],
            employee: [442, 334, 216, 328],
        },
        street: {
            fountain: [12, 12, 195, 232],
            car: [268, 12, 232, 202],
            planter: [12, 268, 232, 230],
            chalkboard: [268, 268, 208, 232],
        },
    };
    // Ground-edge slopes measured on the source sprites after mirroring.
    const furnitureSlopes = {
        produce: [0.25, -0.56],
        bakery: [0.24, -0.61],
        dairy: [0.22, -0.63],
        grocery: [0.24, -0.56],
        counter: [0.23, -0.52],
    };
    const hdFurnitureLayout = {
        bakery: { slopes: [0.26, -0.56], anchor: 0.776 },
        grocery: { slopes: [0.24, -0.63], anchor: 0.806 },
        counter: { slopes: [0.2, -0.68], anchor: 0.752 },
        produce: { slopes: [0.24, -0.46], anchor: 0.791 },
        dairy: { slopes: [0.18, -0.52], anchor: 0.847 },
        flowers: { anchor: 0.667 },
    };
    function hdFurnitureFrame(name) {
        return images['furniture-hd-v2'] && frames['furniture-hd-v2'][name];
    }
    const ready = Promise.all(
        Object.keys(frames).map(
            (name) =>
                new Promise((resolve) => {
                    const image = new Image();
                    image.onload = () => {
                        images[name] = image;
                        resolve();
                    };
                    image.onerror = resolve;
                    const extension = name === 'furniture' || name === 'people' ? 'png' : 'webp';
                    image.src = `assets/commerce-${name}.${extension}`;
                }),
        ),
    );
    function draw(ctx, sheet, name, x, y, width, { anchor = 0.9, height, flip = false, floorSlope } = {}) {
        const hd = sheet === 'furniture' && hdFurnitureFrame(name);
        const grounded = sheet === 'people' && images['people-floor'] && frames['people-floor'][name];
        const art = hd ? 'furniture-hd-v2' : grounded ? 'people-floor' : sheet;
        const image = images[art],
            frame = frames[art][name];
        if (!image || !frame) return false;
        const [, , w, h] = frame;
        height ??= (width * h) / w;
        ctx.save();
        ctx.translate(x, y);
        const layout = hd && hdFurnitureLayout[name];
        const slopes = sheet === 'furniture' && flip && (layout ? layout.slopes : furnitureSlopes[name]);
        if (slopes && floorSlope) {
            const [front, side] = slopes;
            const verticalScale = (2 * floorSlope) / (front - side);
            const shear = floorSlope - front * verticalScale;
            // Keep the ground pivot fixed and all vertical edges vertical.
            ctx.transform(1, shear, 0, verticalScale, 0, 0);
        }
        if (flip) ctx.scale(-1, 1);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, ...frame, -width / 2, -height * (layout?.anchor ?? (grounded ? 0.99 : anchor)), width, height);
        ctx.restore();
        return true;
    }
    globalThis.StoreSprites = { ready, draw, hasHDFurniture: (name) => Boolean(hdFurnitureFrame(name)) };
})();
