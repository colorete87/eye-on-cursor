// SPDX-FileCopyrightText: 2020-2023 Eye and Mouse Extended Contributors
// SPDX-FileCopyrightText: 2024-2026 Djinn Alexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Clutter from 'gi://Clutter';
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
const EYE_CHILD_SETTINGS = [
    'shape',
    'outline-mode',
    'line-width',
    'width',
    'color-sclera',
    'color-sclera-enabled',
    'color-iris',
    'color-iris-enabled',
    'color-pupil',
    'color-eyelid',
];
const EYE_GLOBAL_SETTINGS = ['eye-reactive', 'eye-refresh-rate'];
const EYE_PANEL_SETTINGS = ['enabled', 'position', 'index'];
//#endregion

/**
 * An animated eye created in the panel that follows the pointer.
 *
 * @param {EyeOnCursorExtension} extension - The extension instance.
 * @param {Gio.Settings} eyeSettings - This eye's own settings, an instance of the
 * 'org.gnome.shell.extensions.eye-on-cursor.eye' child schema.
 * @param {string} id - This eye's ID.
 */
export const Eye = GObject.registerClass(
class Eye extends PanelMenu.Button {
    #globalSettings;
    #mouseTracker;

    #mouseX = 0;
    #mouseY = 0;
    #blinking;
    #eyelidLevel = 0;
    #eyelidLevelInterval;

    #shape;
    #lineMode;
    #lineWidth;
    #width;
    #refreshRate;
    #color = {
        useCustomSclera: null,
        sclera: null,
        useCustomIris: null,
        iris: null,
        pupil: null,
        eyelid: null,
        theme: null,
    };

    #area;
    #menuItems;
    #repaintHandler;
    #eyeRedrawInterval;

    //#region Constructor
    constructor(extension, eyeSettings, id) {
        super(0, _('Animated eye that follows the mouse'), false);

        this.#globalSettings = extension.settings;
        this.settings = eyeSettings;
        this.id = id;

        // Attach mouse tracker
        this.#mouseTracker = extension.mouseTracker;
        this.#mouseTracker.connectObject('toggled', this.blink.bind(this), this);
        this.#mouseTracker.connectObject('color-changed', () => this.#area.queue_repaint(), this);

        // Initialize settings values
        this.reactive = this.#globalSettings.get_boolean('eye-reactive'); // Inherited property
        this.#refreshRate = this.#globalSettings.get_int('eye-refresh-rate');

        this.#shape = this.settings.get_string('shape');
        this.#lineMode = this.settings.get_boolean('outline-mode');
        this.#lineWidth = this.settings.get_double('line-width');
        this.#width = this.settings.get_int('width');
        this.#color.useCustomSclera = this.settings.get_boolean('color-sclera-enabled');
        this.#color.sclera = this.#parseRGB(this.settings.get_string('color-sclera'));
        this.#color.useCustomIris = this.settings.get_boolean('color-iris-enabled');
        this.#color.iris = this.#parseRGB(this.settings.get_string('color-iris'));
        this.#color.pupil = this.#parseRGB(this.settings.get_string('color-pupil'));
        this.#color.eyelid = this.#parseRGB(this.settings.get_string('color-eyelid'));
        // TODO use foreground color as default eyelid to match it with contour

        this.onThemeChanged(extension.themeColor);

        // Connect change in global settings to update method
        EYE_GLOBAL_SETTINGS.forEach((key) =>
            this.#globalSettings.connectObject(
                `changed::${key}`,
                this.#updateEyeProperties.bind(this),
                this
            )
        );

        // Connect change in per-eye settings to update method
        EYE_CHILD_SETTINGS.forEach((key) =>
            this.settings.connectObject(
                `changed::${key}`,
                this.#updateEyeProperties.bind(this),
                this
            )
        );

        // Connect change in panel-related settings to button placement update
        EYE_PANEL_SETTINGS.forEach((key) =>
            this.settings.connectObject(`changed::${key}`, () => spawnEyes(extension), this)
        );

        // Add popups
        const trackerIconPath =
            GLib.build_filenamev([extension.path, 'assets', 'mouse-click-symbolic.svg']);

        this.#menuItems = [
            this.#createPopupMenuItem(
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

    #parseRGB(rgbString) {
        const [red, green, blue] = rgbString.match(/[\d.]+/g).map((value) => value / 255);
        return {
            red,
            green,
            blue,
        };
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

        // Get sclera color
        let scleraColor;
        if (!this.#color.useCustomSclera) {
            const fg = this.#area.get_theme_node().get_foreground_color();
            scleraColor = {
                red: fg.red / 255,
                green: fg.green / 255,
                blue: fg.blue / 255,
            };
        } else {
            scleraColor = this.#color.sclera;
        }

        // Get iris color
        let irisColor;
        if (this.#mouseTracker.enabled)
            irisColor = this.#parseRGB(this.#mouseTracker.currentColor);
        else if (!this.#color.useCustomIris)
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
            pupilColor: this.#color.pupil,
            eyelidLevel: this.#eyelidLevel,
            eyelidColor: this.#color.eyelid,
        };
        drawEye(area, options);
    }
    //#endregion

    //#region Properties updater
    #updateEyeProperties() {
        const newReactive = this.#globalSettings.get_boolean('eye-reactive');
        const newRefreshRate = this.#globalSettings.get_int('eye-refresh-rate');

        const newShape = this.settings.get_string('shape');
        const newLineMode = this.settings.get_boolean('outline-mode');
        const newLineWidth = this.settings.get_double('line-width');
        const newWidth = this.settings.get_int('width');
        const newColorUseCustomSclera = this.settings.get_boolean('color-sclera-enabled');
        const newColorSclera = this.#parseRGB(this.settings.get_string('color-sclera'));
        const newColorUseCustomIris = this.settings.get_boolean('color-iris-enabled');
        const newColorIris = this.#parseRGB(this.settings.get_string('color-iris'));
        const newColorPupil = this.#parseRGB(this.settings.get_string('color-pupil'));
        const newColorEyelid = this.#parseRGB(this.settings.get_string('color-eyelid'));

        // Update reactive property
        if (this.reactive !== newReactive)
            this.reactive = newReactive;

        // Update shape
        if (this.#shape !== newShape) {
            this.#shape = newShape;
            this.#area.queue_repaint();
        }

        // Update drawing mode
        if (this.#lineMode !== newLineMode) {
            this.#lineMode = newLineMode;
            this.#area.queue_repaint();
        }

        // Update line thickness
        if (this.#lineWidth !== newLineWidth) {
            this.#lineWidth = newLineWidth;
            this.#area.queue_repaint();
        }

        // Update width
        if (this.#width !== newWidth) {
            this.#width = newWidth;
            this.#area.set_width(this.#width);
        }

        // Update Sclera color
        if (
            this.#color.useCustomSclera !== newColorUseCustomSclera ||
            JSON.stringify(this.#color.sclera) !== JSON.stringify(newColorSclera)
        ) {
            this.#color.useCustomSclera = newColorUseCustomSclera;
            this.#color.sclera = newColorSclera;
            this.#area.queue_repaint();
        }

        // Update iris color
        if (
            this.#color.useCustomIris !== newColorUseCustomIris ||
            JSON.stringify(this.#color.iris) !== JSON.stringify(newColorIris)
        ) {
            this.#color.useCustomIris = newColorUseCustomIris;
            this.#color.iris = newColorIris;
            this.#area.queue_repaint();
        }

        // Update pupil color
        if (JSON.stringify(this.#color.pupil) !== JSON.stringify(newColorPupil)) {
            this.#color.pupil = newColorPupil;
            this.#area.queue_repaint();
        }

        // Update eyelid color
        if (JSON.stringify(this.#color.eyelid) !== JSON.stringify(newColorEyelid)) {
            this.#color.eyelid = newColorEyelid;
            this.#area.queue_repaint();
        }

        // Update refresh rate if changed
        if (this.#refreshRate !== newRefreshRate) {
            this.#refreshRate = newRefreshRate;
            if (this.#eyeRedrawInterval)
                clearInterval(this.#eyeRedrawInterval);
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

        if (this.#eyelidLevelInterval)
            clearInterval(this.#eyelidLevelInterval);
        this.#blinking = true;
        let currentFrame = 0;
        this.#eyelidLevel = 0;
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
                if (this.#eyelidLevelInterval)
                    clearInterval(this.#eyelidLevelInterval);
            }
        }, 1000 / this.#refreshRate);
    }
    //#endregion

    //#region Destroy method
    destroy() {
        // Disconnect repaint signal
        this.#area.disconnect(this.#repaintHandler);

        // Stop blinking
        if (this.#eyelidLevelInterval)
            clearInterval(this.#eyelidLevelInterval);

        // Stop periodic redraw
        if (this.#eyeRedrawInterval)
            clearInterval(this.#eyeRedrawInterval);

        // Destroy drawing
        this.#area.destroy();
        this.#area = null;

        // Disconnect settings
        this.#globalSettings.disconnectObject(this);
        this.#globalSettings = null;
        this.settings.disconnectObject(this);
        this.settings = null;

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

    if (!extension.settings.get_boolean('eye-enabled'))
        return; // Stop here if eyes are disabled

    const eyeSchema = extension.settings.get_child('eye').settings_schema;
    const eyeSchemaPathRoot = `${extension.settings.settings_schema.get_path()}eyes/`;

    // Create eye array
    const count = extension.settings.get_int('eye-count');
    for (let i = 1; i <= count; i++) {
        const eyeID = String(i).padStart(2, '0');
        const eyeName = `eye-${eyeID}`;
        const eyeSettings = new Gio.Settings({
            settings_schema: eyeSchema,
            path: `${eyeSchemaPathRoot}${eyeName}/`,
        });

        extension.eyeArray.push(new Eye(extension, eyeSettings, eyeName));
    }

    // Reverse order in LTR locales so that when adding eyes to the panel, index 0 appears leftmost
    const isLTR = Clutter.get_default_text_direction() === Clutter.TextDirection.LTR;

    (isLTR ? extension.eyeArray.slice().reverse() : extension.eyeArray).forEach((eye) => {
        if (eye.settings.get_boolean('enabled')) {
            Main.panel.addToStatusArea(
                eye.id,
                eye,
                eye.settings.get_int('index'),
                eye.settings.get_string('position'));
        }
    });
}
//#endregion

//#region Destroying eyes
/**
 * Destroys any Eye instances present in the panel.
 *
 * @param {Eye[]} eyeArray - The array that stores created Eye instances.
 */
export function destroyEyes(eyeArray) {
    eyeArray.forEach((eye) => eye.destroy());
    eyeArray.length = 0;
}
//#endregion
