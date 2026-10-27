// SPDX-FileCopyrightText: 2024-2026 Djinn Alexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {BlinkController} from './lib/shell/blinkController.js';
import {getThemeColor, showReleaseNotification} from './lib/shell/utils.js';
import {spawnEyes, destroyEyes} from './lib/shell/eye.js';
import {TrackerManager} from './lib/shell/trackerManager.js';
//#endregion

/**
 * The **Eye on Cursor** GNOME Shell extension.
 */
export default class EyeOnCursorExtension extends Extension {
    #blinkController;
    #notificationSource;
    #themeContext;

    // DO NOT create objects, connect signals or add main loop sources here
    // constructor(metadata) {
    //     super(metadata);
    // }

    //#region Enable
    /**
     * Enables the extension.
     */
    enable() {
        this.settings = this.getSettings();
        this.#themeContext = St.ThemeContext.get_for_stage(global.stage);
        this.themeColor = getThemeColor();

        // Create the tracker
        this.mouseTracker = new TrackerManager(this);

        // Create eyes based on starting settings
        this.eyeArray = [];
        spawnEyes(this);

        // Create the Blink controller
        this.#blinkController =
            new BlinkController(this.settings, this.eyeArray, this.mouseTracker);

        // Connect eye placement settings
        ['eye-enabled', 'eye-count'].forEach((key) =>
            this.settings.connectObject(`changed::${key}`, () => spawnEyes(this), this)
        );

        // Connect theme color getter
        this.#themeContext.connectObject(
            'changed',
            () => {
                this.themeColor = getThemeColor();
                this.eyeArray.forEach((eye) => eye.onThemeChanged(this.themeColor));
                this.mouseTracker.onThemeChanged(this.themeColor);
            },
            this
        );

        // Display the notification on new major or minor versions
        const currentVersion = this.metadata['version-name'].split('.').slice(0, 2).join('.');
        if (this.settings.get_string('last-notified-version') !== currentVersion) {
            this.#notificationSource = showReleaseNotification(this);
            this.settings.set_string('last-notified-version', currentVersion);
        }
    }
    //#endregion

    //#region Disable
    /**
     * Disables the extension.
     */
    disable() {
        this.#blinkController?.destroy();
        this.#blinkController = null;

        destroyEyes(this.eyeArray);
        this.eyeArray = null;

        this.mouseTracker?.destroy();
        this.mouseTracker = null;

        this.#notificationSource?.destroy();
        this.#notificationSource = null;

        this.settings.disconnectObject(this);
        this.settings = null;

        this.#themeContext?.disconnectObject(this);
        this.#themeContext = null;
    }
    //#endregion
}
