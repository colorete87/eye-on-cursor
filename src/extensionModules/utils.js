// SPDX-FileCopyrightText: 2024-2026 Djinn Alexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
//#endregion

//#region Get theme color
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
    } else { // Adwaita Slate as fallback neutral color
        return {
            red: 111,
            green: 132,
            blue: 150,
        };
    }
}
//#endregion

//#region Show release notification
/**
 * Displays a notification announcing the latest release of the extension.
 *
 * @param {EyeOnCursorExtension} extension - The extension instance.
 * @returns {MessageTray.Source} The source of notifications for the extension.
 */
export function showReleaseNotification(extension) {
    const logoPath = GLib.build_filenamev([extension.path, 'assets', 'eye-on-cursor-logo.svg']);

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
        title: _('Version 3.0 — What’s New'),
        body: _('Eyes are now individually configurable, ' +
            'with new blink modes and broader theme color support.'),
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
        Gio.app_info_launch_default_for_uri(
            'https://github.com/sponsors/djinnalexio',
            null
        );
    });

    source.addNotification(notification);

    return source; // Stores it to destroy it in disable
}
//#endregion
