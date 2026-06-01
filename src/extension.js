// SPDX-FileCopyrightText: 2024-2026 Djinn Alexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {BlinkController} from './extensionModules/blinkController.js';
import {spawnEyes, destroyEyes} from './extensionModules/eye.js';
import {TrackerManager} from './extensionModules/trackerManager.js';
//#endregion

/**
 * The **Eye on Cursor** GNOME Shell extension.
 */
export default class EyeOnCursorExtension extends Extension {
    #blinkController;

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

        this.#convertHexCodeToRGBModel();

        // Create the tracker
        this.mouseTracker = new TrackerManager(this.settings, this.metadata, this.path);

        // Create eyes based on starting settings
        this.eyeArray = [];
        spawnEyes(this);

        // Create the Blink controller
        this.#blinkController = new BlinkController(this.settings, this.eyeArray);

        // Connect eye placement settings
        [
            'eye-active',
            'eye-position',
            'eye-index',
            'eye-count',
        ].forEach((key) =>
            this.settings.connectObject(
                `changed::${key}`,
                spawnEyes.bind(this, this),
                this
            )
        );
    }
    //#endregion

    //#region Disable
    /**
     * Disables the extension.
     */
    disable() {
        this.settings.disconnectObject(this);
        this.settings = null;

        this.#blinkController?.destroy();
        this.#blinkController = null;

        destroyEyes(this.eyeArray);
        this.eyeArray = null;

        this.mouseTracker?.destroy();
        this.mouseTracker = null;
    }
    //#endregion

    //#region Helpers
    /**
     * (v2.3.1 - 28-apr-26) transition from hex code to rgb values for color settings.
     * Convert user's custom colors so that they fit the new expected format
     */
    #convertHexCodeToRGBModel() {
        [
            'eye-color-iris',
            'eye-color-eyelid',
            'tracker-color-main',
            'tracker-color-left',
            'tracker-color-middle',
            'tracker-color-right',
        ].forEach((key) => {
            const color = this.settings.get_string(key);
            if (color.startsWith('#')) {
                const rgbValue = `rgb(${[color.slice(1, 3), color.slice(3, 5), color.slice(5, 7)]
                    .map((value) => parseInt(value, 16)).join()})`;
                this.settings.set_string(key, rgbValue);
            }
        });
    }
    //#endregion
}
