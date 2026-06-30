// SPDX-FileCopyrightText: 2024-2026 Djinn Alexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {EyeGlobalPage} from './prefsModules/eyeGlobalSettings.js';
import {EyesPage} from './prefsModules/eyeSettings.js';
import {TrackerPage} from './prefsModules/trackerSettings.js';
//#endregion

/**
 * The preferences window for the **Eye on Cursor** GNOME Shell extension.
 */
export default class EyeOnCursorPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.default_width = 480;
        window.default_height = 820;

        const settings = this.getSettings();

        // Add path for custom icons
        const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
        const iconThemePath = GLib.build_filenamev([this.path, 'assets']);
        if (!iconTheme.get_search_path().includes(iconThemePath))
            iconTheme.add_search_path(iconThemePath);

        window.add(new EyeGlobalPage(settings));
        window.add(new EyesPage(settings));
        window.add(new TrackerPage(settings, this.metadata, this.path));

        window.set_visible_page_name('eyes');
    }
}
