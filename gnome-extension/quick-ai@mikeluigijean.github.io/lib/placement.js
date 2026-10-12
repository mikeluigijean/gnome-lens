// Where to put the chat window. Pure: rectangles in, [x, y] out.
// Ported from Dict's moveToPosition / moveToCenter (sunwxg/gnome-shell-extension-dict, MIT).
import {Position} from './constants.js';

/**
 * @param {object} p
 * @param {{x: number, y: number}} p.pointer
 * @param {{width: number, height: number}} p.frame       window size
 * @param {{x: number, y: number, width: number, height: number}} p.workarea  monitor work area
 * @param {string} p.mode  Position.POINTER | Position.CENTER
 * @returns {[number, number]} top-left corner, inside the work area when the window fits
 */
export function computePosition({pointer, frame, workarea, mode}) {
    if (mode === Position.CENTER) {
        return [
            Math.floor(workarea.x + (workarea.width - frame.width) / 2),
            Math.floor(workarea.y + (workarea.height - frame.height) / 2),
        ];
    }

    const right = workarea.x + workarea.width;
    const bottom = workarea.y + workarea.height;

    // Right of the pointer if it fits, otherwise to its left.
    let x = pointer.x + frame.width <= right ? pointer.x : pointer.x - frame.width;
    // Vertically centered on the pointer, pushed back inside the work area.
    let y = pointer.y - frame.height / 2;
    if (y + frame.height > bottom)
        y = bottom - frame.height;

    x = Math.max(x, workarea.x);
    y = Math.max(y, workarea.y);
    return [Math.floor(x), Math.floor(y)];
}
