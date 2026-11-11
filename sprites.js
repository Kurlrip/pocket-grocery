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
        'furniture-hd': {
            bakery: [4, 4, 426, 324],
            grocery: [438, 4, 424, 358],
            counter: [4, 366, 462, 332],
        },
        people: {
            shopper0: [42, 21, 152, 249],
            shopper1: [214, 27, 145, 245],
            shopper2: [386, 27, 142, 242],
            shopper3: [552, 23, 179, 249],
            cashier: [747, 23, 147, 245],
            employee: [914, 20, 146, 250],
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
    const hdFurnitureSlopes = {
        bakery: [0.22, -0.55],
        grocery: [0.22, -0.62],
        counter: [0.24, -0.61],
    };
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
        const hd = sheet === 'furniture' && images['furniture-hd'] && frames['furniture-hd'][name];
        const image = hd ? images['furniture-hd'] : images[sheet],
            frame = hd || frames[sheet][name];
        if (!image || !frame) return false;
        const [, , w, h] = frame;
        height ??= (width * h) / w;
        ctx.save();
        ctx.translate(x, y);
        const slopes = sheet === 'furniture' && flip && (hd ? hdFurnitureSlopes[name] : furnitureSlopes[name]);
        if (slopes && floorSlope) {
            const [front, side] = slopes;
            const verticalScale = (2 * floorSlope) / (front - side);
            const shear = floorSlope - front * verticalScale;
            // Keep the ground pivot fixed and all vertical edges vertical.
            ctx.transform(1, shear, 0, verticalScale, 0, 0);
        }
        if (flip) ctx.scale(-1, 1);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, ...frame, -width / 2, -height * anchor, width, height);
        ctx.restore();
        return true;
    }
    globalThis.StoreSprites = { ready, draw };
})();
