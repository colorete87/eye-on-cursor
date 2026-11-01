// SPDX-FileCopyrightText: 2024-2026 Djinn Alexio
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * A color expressed as separate red, green and blue channels.
 * @typedef {object} RGBColor
 * @property {number} red - Red component (0-255).
 * @property {number} green - Green component (0-255).
 * @property {number} blue - Blue component (0-255).
 */

//#region Imports
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
//#endregion

/**
 * Style classes that commonly get an accent color from custom themes, checked in order.
 * - 'calendar-today': highlight for the current day in the GNOME calendar
 * - 'button default': default action button
 * - 'osd-monitor-label': number overlaid on each display when rearranging them in Settings;
 *   rarely overridden, so usually still carries '-st-accent-color' as a fallback
 * @type {string[]}
 */
const ACCENT_STYLE_CLASSES = ['calendar-today', 'button default', 'osd-monitor-label'];
const FALLBACK_ACCENT_COLOR = { red: 111, green: 132, blue: 150 }; // Adwaita Slate
//#endregion

//#region Get theme color
/**
 * Retrieves an accent color from the current theme. Falls back to Adwaita Slate if none of the
 * candidate style classes yields a visible, non-grey color.
 * @returns {RGBColor} The theme's accent color, or the fallback.
 */
export function getThemeColor() {
    let color = null;
    let found = false;
    for (const styleClass of ACCENT_STYLE_CLASSES) {
        const dummy = new St.Widget({ style_class: styleClass });
        global.stage.add_child(dummy);
        color = dummy.get_theme_node().get_background_color();
        global.stage.remove_child(dummy);
        dummy.destroy();

        if (
            color.alpha > 0 && // Color is visible
            !(color.red === color.green && color.green === color.blue) // Color isn't black/grey
        ) {
            found = true;
            break;
        }
    }

    return found ? { red: color.red, green: color.green, blue: color.blue } : FALLBACK_ACCENT_COLOR;
}
//#endregion

//#region Show release notification
/**
 * Displays a notification announcing the current release of the extension, with actions to open
 * the preferences, view the changelog and donate.
 * @param {import('../../extension.js').default} extension - The extension instance.
 * @returns {MessageTray.Source} The notification source. The caller must destroy it in `disable()`.
 */
export function showReleaseNotification(extension) {
    const logoPath = GLib.build_filenamev([
        extension.path,
        'assets',
        'hicolor',
        'scalable',
        'apps',
        'eye-on-cursor-logo.svg',
    ]);

    let source = new MessageTray.Source({
        title: extension.metadata.name,
        icon: Gio.icon_new_for_string(logoPath),
    });

    // Reset the notification source if it's destroyed
    source.connect('destroy', () => {
        source = null;
    });

    Main.messageTray.add(source);

    const notification = new MessageTray.Notification({
        source,
        title: _('Version 3.1 — What’s New'),
        body: _('Blink duration is now configurable.'),
        iconName: 'software-update-available-symbolic',
        urgency: MessageTray.Urgency.NORMAL,
    });

    notification.connect('activated', () => extension.openPreferences());

    notification.addAction(_('Open Settings'), () => extension.openPreferences());

    notification.addAction(_('View Changelog'), () => {
        Gio.app_info_launch_default_for_uri(
            `${extension.metadata.url}-/blob/main/CHANGELOG.md`,
            null
        );
    });

    notification.addAction(_('Donate'), () => {
        Gio.app_info_launch_default_for_uri('https://github.com/sponsors/djinnalexio', null);
    });

    source.addNotification(notification);

    return source; // Stores it to destroy it in disable
}
//#endregion
