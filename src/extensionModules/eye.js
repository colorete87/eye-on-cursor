// SPDX-FileCopyrightText: 2020-2023 Eye and Mouse Extended Contributors
// SPDX-FileCopyrightText: 2024-2026 Djinn Alexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {drawEye} from './eyeRenderer.js';
//#endregion

//#region Constants
const BLINK_DURATION = 250; // TODO turn blink duration into a setting 0.2-2s
const EYE_SETTINGS = [
    'eye-reactive',
    'eye-shape',
    'eye-line-mode',
    'eye-line-width',
    'eye-width',
    'eye-color-iris',
    'eye-color-iris-enabled',
    'eye-refresh-rate',
    'eye-color-eyelid',
];
const PUPIL_COLOR = parseRGB('rgb(0,0,0)');
//#endregion

/**
 * An animated eye created in the panel that follows the pointer.
 *
 * @param {EyeOnCursorExtension} extension - The extension instance.
 */
export const Eye = GObject.registerClass(
class Eye extends PanelMenu.Button {
    #settings;
    #mouseTracker;

    #mouseX = 0;
    #mouseY = 0;
    #blinking;
    #eyelidLevel = 0;
    #eyelidLevelInterval;
    randomBlinkTimeout;

    #shape;
    #lineMode;
    #lineWidth;
    #width;
    #refreshRate;
    #color = {
        useCustomIris: null,
        iris: null,
        eyelid: null,
        theme: null,
    };

    #area;
    #menuItems;
    #repaintHandler;
    #eyeRedrawInterval;

    //#region Constructor
    constructor(extension) {
        super(0, _('Animated eye that follows the mouse'), false);

        this.#settings = extension.settings;

        // Attach mouse tracker
        this.#mouseTracker = extension.mouseTracker;
        this.#mouseTracker.connectObject('toggled', this.blink.bind(this), this);
        this.#mouseTracker.connectObject('color-changed', () => this.#area.queue_repaint(), this);

        // Initialize settings values
        this.reactive = this.#settings.get_boolean('eye-reactive');
        this.#shape = this.#settings.get_string('eye-shape');
        this.#lineMode = this.#settings.get_boolean('eye-line-mode');
        this.#lineWidth = this.#settings.get_int('eye-line-width') / 10;
        this.#width = this.#settings.get_int('eye-width');
        this.#color.useCustomIris = this.#settings.get_boolean('eye-color-iris-enabled');
        this.#color.iris = parseRGB(this.#settings.get_string('eye-color-iris'));
        this.#color.eyelid = parseRGB(this.#settings.get_string('eye-color-eyelid'));
        this.#refreshRate = this.#settings.get_int('eye-refresh-rate');
        // TODO use foreground color as default eyelid to match it with contour

        this.onThemeChanged(extension.themeColor);

        // Connect change in settings to update method
        EYE_SETTINGS.forEach((key) =>
            this.#settings.connectObject(
                `changed::${key}`,
                this.#updateEyeProperties.bind(this),
                this
            )
        );

        // Add popups
        const trackerIconPath =
            GLib.build_filenamev([extension.path, 'assets', 'mouse-click-symbolic.svg']);

        this.#menuItems = [
            this.#createPopupMenuItem( // TODO replace with PopupSwitchMenuItem
                _('Toggle Tracker'),
                Gio.icon_new_for_string(trackerIconPath),
                () => this.#mouseTracker.toggleTracker()
            ),
            this.#createPopupMenuItem(
                _('Settings'),
                'org.gnome.Settings-symbolic',
                () => extension.openPreferences()
            ),
        ];
        this.#menuItems.forEach((popup) => this.menu.addMenuItem(popup));

        // Create the eye canvas
        this.#area = new St.DrawingArea({width: this.#width});
        // TODO see interaction if any between area width and button width
        this.add_child(this.#area);

        // Connect the repaint signal of the area to the repaint method
        this.#repaintHandler = this.#area.connect('repaint', this.#onRepaint.bind(this));

        // Start periodic redraw
        this.#eyeRedrawInterval = setInterval(
            this.#updateEyeFrame.bind(this),
            1000 / this.#refreshRate
        );
    }

    #createPopupMenuItem(label, icon, callback) {
        const item = new PopupMenu.PopupImageMenuItem(label, icon);
        item.connect('activate', callback);
        return item;
    }

    onThemeChanged(themeColor) {
        this.#color.theme = {
            red: themeColor.red / 255,
            green: themeColor.green / 255,
            blue: themeColor.blue / 255,
        };
        this.#area?.queue_repaint();
    }
    //#endregion

    //#region Drawing methods
    #updateEyeFrame() {
        const [mouseX, mouseY] = global.get_pointer();
        // Redraw the eye if the mouse has moved or if blinking
        if (this.#mouseX !== mouseX || this.#mouseY !== mouseY || this.#blinking) {
            [this.#mouseX, this.#mouseY] = [mouseX, mouseY];
            this.#area.queue_repaint();
        }
    }

    #onRepaint(area) {
        // Get the coordinates of the eye
        const [originX, originY] = area.get_transformed_position();
        if (isNaN(originX) || isNaN(originY))
            return; // Don't draw if the surface isn't placed yet

        // Use foreground color from the theme for the white of the eye
        const fg = this.#area.get_theme_node().get_foreground_color();
        const scleraColor = {
            red: fg.red / 255,
            green: fg.green / 255,
            blue: fg.blue / 255,
        };

        // Get iris color
        let irisColor;
        if (this.#mouseTracker.enabled)
            irisColor = parseRGB(this.#mouseTracker.currentColor);
        else if (!this.#color.useCustomIris && this.#color.theme !== null)
            irisColor = this.#color.theme;
        else
            irisColor = this.#color.iris;

        const options = {
            shape: this.#shape,
            mouseX: this.#mouseX,
            mouseY: this.#mouseY,
            originX,
            originY,
            lineWidth: this.#lineWidth,
            lineMode: this.#lineMode,
            scleraColor,
            irisColor,
            pupilColor: PUPIL_COLOR,
            eyelidLevel: this.#eyelidLevel,
            eyelidColor: this.#color.eyelid,
        };
        drawEye(area, options);
    }
    //#endregion

    //#region Properties updater
    #updateEyeProperties() {
        const newReactive = this.#settings.get_boolean('eye-reactive');
        const newShape = this.#settings.get_string('eye-shape');
        const newLineMode = this.#settings.get_boolean('eye-line-mode');
        const newLineWidth = this.#settings.get_int('eye-line-width');
        const newWidth = this.#settings.get_int('eye-width');
        const newColorUseCustomIris = this.#settings.get_boolean('eye-color-iris-enabled');
        const newColorIris = parseRGB(this.#settings.get_string('eye-color-iris'));
        const newColorEyelid = parseRGB(this.#settings.get_string('eye-color-eyelid'));
        const newRefreshRate = this.#settings.get_int('eye-refresh-rate');

        // Update reactive property
        if (this.reactive !== newReactive)
            this.reactive = newReactive;

        // Update shape
        if (this.#shape !== newShape) {
            this.#shape = newShape;
            this.#area?.queue_repaint();
        }

        // Update drawing mode
        if (this.#lineMode !== newLineMode) {
            this.#lineMode = newLineMode;
            this.#area?.queue_repaint();
        }

        // Update line thickness
        if (this.#lineWidth !== newLineWidth) {
            this.#lineWidth = newLineWidth / 10; // TODO remove the division step
            this.#area?.queue_repaint();
        }

        // Update width
        if (this.#width !== newWidth) {
            this.#width = newWidth;
            this.#area?.set_width(this.#width);
        }

        // Update iris color
        if (
            this.#color.useCustomIris !== newColorUseCustomIris ||
            JSON.stringify(this.#color.iris) !== JSON.stringify(newColorIris)
        ) {
            this.#color.useCustomIris = newColorUseCustomIris;
            this.#color.iris = newColorIris;
            this.#area?.queue_repaint();
        }

        // Update eyelid color
        if (JSON.stringify(this.#color.eyelid) !== JSON.stringify(newColorEyelid)) {
            this.#color.eyelid = newColorEyelid;
            this.#area?.queue_repaint();
        }

        // Update refresh rate if changed
        if (this.#refreshRate !== newRefreshRate) {
            this.#refreshRate = newRefreshRate;
            this.#eyeRedrawInterval = clearInterval(this.#eyeRedrawInterval);
            this.#eyeRedrawInterval = setInterval(
                this.#updateEyeFrame.bind(this),
                1000 / this.#refreshRate
            );
        }
    }
    //#endregion

    //#region Blink method
    blink() {
        const totalFrames = Math.ceil(this.#refreshRate * (BLINK_DURATION / 1000));
        const halfFrames = totalFrames / 2;

        this.#eyelidLevelInterval = clearInterval(this.#eyelidLevelInterval);
        this.#blinking = true;
        let currentFrame = 0;
        this.#eyelidLevelInterval = setInterval(() => {
            currentFrame++;

            // Compute eyelid level
            this.#eyelidLevel = currentFrame <= halfFrames
                ? currentFrame / halfFrames // Closing
                : 1 - ((currentFrame - halfFrames) / halfFrames); // Opening

            // Finishing
            if (currentFrame >= totalFrames) {
                this.#eyelidLevel = 0;
                this.#blinking = false;
                this.#area.queue_repaint(); // Ensure that blinking animation ends with eyelid completely opened
                this.#eyelidLevelInterval = clearInterval(this.#eyelidLevelInterval);
            }
        }, 1000 / this.#refreshRate);
    }
    //#endregion

    //#region Destroy method
    destroy() {
        // Disconnect repaint signal
        this.#area.disconnect(this.#repaintHandler);

        // Stop blinking
        this.randomBlinkTimeout = clearTimeout(this.randomBlinkTimeout);
        this.#eyelidLevelInterval = clearInterval(this.#eyelidLevelInterval);

        // Stop periodic redraw
        this.#eyeRedrawInterval = clearInterval(this.#eyeRedrawInterval);

        // Destroy drawing
        this.#area.destroy();
        this.#area = null;

        // Disconnect settings
        this.#settings.disconnectObject(this);
        this.#settings = null;

        // Destroy popups
        this.#menuItems.forEach((menuItem) => menuItem.destroy());
        this.#menuItems.length = 0;

        // Drop tracker
        this.#mouseTracker.disconnectObject(this);
        this.#mouseTracker = null;

        // Destroy the button
        super.destroy();
    }
    //#endregion
});

//#region Creating eyes
/**
 * Creates Eye instances and adds them to the panel based on extension settings.
 *
 * @param {EyeOnCursorExtension} extension - The extension instance.
 */
export function spawnEyes(extension) {
    // Remove current eyes
    destroyEyes(extension.eyeArray);

    if (!extension.settings.get_boolean('eye-active'))
        return; // Stop here if eyes are disabled

    const count = extension.settings.get_int('eye-count');
    const index = extension.settings.get_int('eye-index');
    const position = extension.settings.get_string('eye-position');
    const domain = extension.metadata['gettext-domain'];

    for (let i = 0; i < count; i++) {
        const eye = new Eye(extension);
        Main.panel.addToStatusArea(`${domain}-${i}`, eye, index, position);
        extension.eyeArray.push(eye);
    }
}
//#endregion

//#region Destroying eyes
/**
 * Destroys any Eye instances present in the panel.
 *
 * @param {Eye[]} eyeArray - The array that stores created Eye instances.
 */
export function destroyEyes(eyeArray) {
    eyeArray?.forEach((eye) => eye.destroy());
    eyeArray.length = 0;
}
//#endregion

//#region Helper functions
/**
 * Parses an `rgb(r, g, b)` color string and returns an object containing RGB components.
 *
 * @param {string} rgbString - The color string (color value 0-255).
 * @returns {object} The object containing the 'red', 'green', and 'blue' values (0–1)
 */
function parseRGB(rgbString) {
    const [red, green, blue] = rgbString.match(/[\d.]+/g).map((value) => value / 255);
    return {
        red,
        green,
        blue,
    };
}
//#endregion
