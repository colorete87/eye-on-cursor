// SPDX-FileCopyrightText: 2024-2026 Djinn Alexio
// SPDX-License-Identifier: GPL-3.0-or-later

const BLINK_CHANGE_DELAY = 100; // Make sure the eyeArray is created before starting blink routine
const EYE_ARRAY_SETTINGS = ['eye-enabled', 'eye-count', 'eye-blink-mode'];

/**
 * An object that controls blinking actions for the Eye instances.
 *
 * @param {EyeOnCursorExtension} extension - The extension instance.
 * @param {Eye[]} eyeArray - The array that stores created Eye instances.
 * @param {TrackerManager} mouseTracker - The object that controls an icon that follows and reacts
 * to the cursor.
 */
export class BlinkController {
    #settings;
    #eyeArray;
    #mouseTracker;

    #fixedRoutine;
    #blinkChangeDelay;
    #blinkMode;
    #blinkInterval;
    #blinkIntervalRange;

    //#region Constructor
    constructor(settings, eyeArray, mouseTracker) {
        // Get extension object properties
        this.#settings = settings;
        this.#eyeArray = eyeArray;
        this.#mouseTracker = mouseTracker;

        // Initialize settings values
        this.#blinkMode = this.#settings.get_string('eye-blink-mode');
        this.#blinkInterval = this.#settings.get_double('eye-blink-interval');
        this.#blinkIntervalRange = this.#getValidIntervalRange();

        // Connect changes in eye array or blink mode settings to update methods
        EYE_ARRAY_SETTINGS.forEach((key) =>
            this.#settings.connectObject(
                `changed::${key}`,
                () => {
                // Delay reset so that the blink routine gets updated after the eye array
                    this.#blinkChangeDelay = clearTimeout(this.#blinkChangeDelay);
                    this.#blinkChangeDelay = setTimeout(
                        this.#startBlinkMode.bind(this),
                        BLINK_CHANGE_DELAY
                    );
                },
                this
            )
        );

        // Connect routine-specific changes in settings to update methods
        this.#settings.connectObject(
            'changed::eye-blink-interval',
            () => {
                this.#blinkInterval = this.#settings.get_double('eye-blink-interval');
                this.#startBlinkMode();
            },
            this
        );
        this.#settings.connectObject(
            'changed::eye-blink-interval-range',
            () => {
                this.#blinkIntervalRange = this.#getValidIntervalRange();
                this.#startBlinkMode();
            },
            this
        );

        this.#startBlinkMode();
    }

    #getValidIntervalRange() {
        const range = this.#settings.get_value('eye-blink-interval-range').deep_unpack();

        if (range.length === 2 && range[0] < range[1]) {
            return range;
        } else {
            console.warn('Eye on Cursor: Invalid blink interval range (min >= max), ' +
                'using default.');
            return this.#settings.get_default_value('eye-blink-interval-range').deep_unpack();
        }
    }
    //#endregion

    //#region Blink methods
    #blinkAll() {
        if (this.#eyeArray.length > 0)
            this.#eyeArray.forEach((eye) => eye.blink());
    }

    #scheduleNextBlink(eye) {
        // Calculate a random interval to next blink
        const interval =
            this.#blinkIntervalRange[0] +
            ((this.#blinkIntervalRange[1] - this.#blinkIntervalRange[0]) * Math.random());

        eye.randomBlinkTimeout = setTimeout(
            () => {
                eye.blink();
                this.#scheduleNextBlink(eye);
            },
            1000 * interval
        );
    }
    //#endregion

    //#region Routine methods
    //#region Start
    #startBlinkMode() {
        this.#stopCurrentMode();

        // Update blink mode
        this.#blinkMode = this.#settings.get_string('eye-blink-mode');

        if (this.#eyeArray.length > 0) {
            switch (this.#blinkMode) {
                case 'click':
                    this.#startClickBlink();
                    break;
                case 'fixed':
                    this.#startFixedBlink();
                    break;
                case 'random':
                    this.#startRandomBlink();
                    break;
                case 'none':
                default:
                    break;
            }
        }
    }
    //#endregion

    //#region Stop
    #stopCurrentMode() {
        switch (this.#blinkMode) {
            case 'click':
                this.#stopClickBlink();
                break;
            case 'fixed':
                this.#stopFixedBlink();
                break;
            case 'random':
                this.#stopRandomBlink();
                break;
            case 'none':
            default:
                break;
        }
    }
    //#endregion

    //#region Click mode
    #startClickBlink() {
        this.#mouseTracker.connectObject('clicked', this.#blinkAll.bind(this), this);
    }

    #stopClickBlink() {
        this.#mouseTracker.disconnectObject(this);
    }
    //#endregion

    //#region Fixed mode
    #startFixedBlink() {
        this.#fixedRoutine = setInterval(this.#blinkAll.bind(this), 1000 * this.#blinkInterval);
    }

    #stopFixedBlink() {
        this.#fixedRoutine = clearInterval(this.#fixedRoutine);
    }
    //#endregion

    //#region Random mode
    #startRandomBlink() {
        this.#eyeArray.forEach((eye) => this.#scheduleNextBlink(eye));
    }

    #stopRandomBlink() {
        this.#eyeArray.forEach((eye) => {
            eye.randomBlinkTimeout = clearTimeout(eye.randomBlinkTimeout);
        });
    }
    //#endregion
    //#endregion

    //#region Destroy method
    destroy() {
        // Stop routines
        this.#stopCurrentMode();

        // Clear any remaining timeouts
        this.#blinkChangeDelay = clearTimeout(this.#blinkChangeDelay);

        // Disconnect settings
        this.#settings.disconnectObject(this);
        this.#settings = null;
    }
    //#endregion
}
