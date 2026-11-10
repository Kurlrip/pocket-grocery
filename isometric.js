(function (root) {
    'use strict';

    function project(x, y, tileSize, origin) {
        return { x: origin.x + (x - y) * tileSize / 2, y: origin.y + (x + y) * tileSize / 4 };
    }

    function pick(screenX, screenY, tileSize, origin) {
        const x = (screenX - origin.x) / (tileSize / 2);
        const y = (screenY - origin.y) / (tileSize / 4);
        return { x: Math.floor((x + y) / 2), y: Math.floor((y - x) / 2) };
    }

    function canPlace(grid, x, y, size, reserved) {
        if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 ||
            y + size.h > grid.length || x + size.w > grid[0].length) return false;
        for (let iy = y; iy < y + size.h; iy++) {
            for (let ix = x; ix < x + size.w; ix++) {
                if (grid[iy][ix] !== 0 || reserved.some(p => p.x === ix && p.y === iy)) return false;
            }
        }
        return true;
    }

    const api = { project, pick, canPlace };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.Isometric = api;
})(globalThis);
