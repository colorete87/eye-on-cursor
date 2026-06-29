// SPDX-FileCopyrightText: 2024-2026 Djinn Alexio
// SPDX-License-Identifier: GPL-3.0-or-later

import St from 'gi://St';

/**
 * Retrieves an accent color from the current theme and returns it as an object containing RGB
 * components. Returns `null` if no suitable accent color can be determined.
 *
 * @returns {object|null} The object containing the 'red', 'green', and 'blue' values (0–255)
 */
export function getThemeColor() {
    const candidates = ['calendar-today', 'button default', 'osd-monitor-label'];

    let color = null;
    for (const styleClass of candidates) {
        const dummy = new St.Widget({style_class: styleClass});
        global.stage.add_child(dummy);
        color = dummy.get_theme_node().get_background_color();
        global.stage.remove_child(dummy);
        dummy.destroy();

        if (color.alpha > 0 && // Color is visible
            !(color.red === color.green && color.green === color.blue) // Color isn't black/grey
        )
            break; // Stop looking
        else
            color = null;
    }

    if (color) {
        return {
            red: color.red,
            green: color.green,
            blue: color.blue,
        };
    } else {
        console.warn('Eye on Cursor: Could not determine accent color from theme.');
        return null;
    }
}
