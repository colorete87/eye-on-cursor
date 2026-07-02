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
    // Items that commonly get an accent color from custom themes
    // - 'calendar-today': highlight for the current day in the GNOME calendar
    // - 'button default': default action button
    // - 'osd-monitor-label': number overlaid on each display when rearranging them in Settings;
    //   rarely overridden, so usually still carries '-st-accent-color' as a fallback

    let color = null;
    let found = false;
    for (const styleClass of candidates) {
        const dummy = new St.Widget({style_class: styleClass});
        global.stage.add_child(dummy);
        color = dummy.get_theme_node().get_background_color();
        global.stage.remove_child(dummy);
        dummy.destroy();

        if (color.alpha > 0 && // Color is visible
            !(color.red === color.green && color.green === color.blue) // Color isn't black/grey
        ) {
            found = true;
            break;
        }
    }

    if (found) {
        return {
            red: color.red,
            green: color.green,
            blue: color.blue,
        };
    } else {
        return null;
    }
}
