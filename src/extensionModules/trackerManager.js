// SPDX-FileCopyrightText: 2020-2023 Eye and Mouse Extended Contributors
// SPDX-FileCopyrightText: 2024-2026 Djinn Alexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Atspi from 'gi://Atspi';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
//#endregion

//#region Constants
const CACHE_DIR_PERMISSIONS = 0o755; // 'rwx' permissions for user, 'r_x' for group and others
const CLICK_MIN_DEBOUNCE = 100; // Min highlighting duration after receiving BUTTON RELEASED signal
const CLICK_MAX_DEBOUNCE = 5000; // Max highlighting duration after receiving BUTTON PRESSED signal
const CLICK_RIPPLE_SCALE = 2; // Ripple animation expands to this multiple of the tracker size
const TRACKER_RAISE_DELAY = 20; // Delay before raising tracker above UI elements triggered by the click
const TRACKER_SETTINGS = [
    'tracker-shape',
    'tracker-size',
    'tracker-color-main-enabled',
    'tracker-color-main',
    'tracker-color-left',
    'tracker-color-middle',
    'tracker-color-right',
    'tracker-opacity',
    'tracker-refresh-rate',
];
//#endregion

// Enable async/await with asynchronous methods in platform libraries
Gio._promisify(Gio.File.prototype, 'load_contents_async');
Gio._promisify(Gio.File.prototype, 'replace_contents_async');

/**
 * An object that controls an icon that follows and reacts to the cursor.
 *
 * @param {Gio.Settings} settings - The settings object for this extension.
 * @param {ExtensionMetadata} metadata - The metadata object from metadata.json.
 * @param {string} path - The filesystem path to the extension directory.
 */
export const TrackerManager = GObject.registerClass(
    {
        Signals: {
            toggled: {},
            click: {},
        },
    },
class TrackerManager extends GObject.Object {
    enabled = false;
    currentColor;
    #settings;
    #trackersDir;
    #hasAccentColor;
    #mouseX = 0;
    #mouseY = 0;
    #activeClick;
    #clickResetPending = false;
    #clickMaxTimeout;
    #clickReleaseTimeout;
    #trackerPositionUpdater;
    #trackerRaiseTimeout;

    #shape;
    #size;
    #opacity;
    #refreshRate;
    #color = {
        useCustomMain: null,
        accent: null,
        main: null,
        left: null,
        middle: null,
        right: null,
    };

    #tracker;
    #cacheDir;
    #themeContext;

    #capturedEvent;
    #mouseListener;

    //#region Constructor
    constructor(settings, metadata, path) {
        super();

        // Get extension object properties
        this.#settings = settings;
        this.#trackersDir = GLib.build_filenamev([path, 'assets', 'trackers']);

        // Check if accent color variable exists (GNOME 47+)
        this.#hasAccentColor = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'})
            .list_keys()
            .includes('accent-color');

        // Initialize settings values
        this.#shape = this.#settings.get_string('tracker-shape');
        this.#size = this.#settings.get_int('tracker-size');
        this.#color.useCustomMain = this.#hasAccentColor
            ? this.#settings.get_boolean('tracker-color-main-enabled') : true;
        this.#color.main = this.#settings.get_string('tracker-color-main');
        this.#color.left = this.#settings.get_string('tracker-color-left');
        this.#color.middle = this.#settings.get_string('tracker-color-middle');
        this.#color.right = this.#settings.get_string('tracker-color-right');
        this.#opacity = this.#settings.get_int('tracker-opacity');
        this.#refreshRate = this.#settings.get_int('tracker-refresh-rate');

        // Connect change in settings to update method
        TRACKER_SETTINGS.forEach(
            (key) => this.#settings.connectObject(
                `changed::${key}`,
                this.#updateTrackerProperties.bind(this),
                this
            )
        );

        // Create the tracker object
        this.#tracker = new St.Icon({
            reactive: false,
            can_focus: false,
            track_hover: false,
        });
        this.#tracker.icon_size = this.#size;
        this.#tracker.opacity = Math.ceil(this.#opacity * 2.55); // Convert from 0-100 to 0-255 range

        // Get the cache directory for colored trackers
        const gettextDomain = metadata['gettext-domain'];
        this.#cacheDir =
            GLib.build_filenamev([GLib.get_user_cache_dir(), gettextDomain, 'trackers']);
        // Create the cache directory if it doesn't exist
        try {
            if (!GLib.file_test(this.#cacheDir, GLib.FileTest.IS_DIR))
                GLib.mkdir_with_parents(this.#cacheDir, CACHE_DIR_PERMISSIONS);
        } catch (e) {
            throw new Error(`Failed to create cache directory at ${this.#cacheDir}: ${e.message}`);
        }

        // Create tracker icons files in cache based on the initial settings
        this.#updateCacheTrackers(this.#shape, [
            this.#color.main,
            this.#color.left,
            this.#color.middle,
            this.#color.right,
        ]);

        // Use desktop accent color as default tracker color (GNOME 47+)
        if (this.#hasAccentColor) {
            this.#themeContext = St.ThemeContext.get_for_stage(global.stage);
            const [accent] = this.#themeContext.get_accent_color();
            this.#color.accent = `rgb(${accent['red']},${accent['green']},${accent['blue']})`;
            this.#updateCacheTrackers(this.#shape, [this.#color.accent]);

            // Connect change in accent color to tracker redraw
            this.#themeContext.connectObject(
                'changed',
                async () => {
                    const [accent] = this.#themeContext.get_accent_color();
                    this.#color.accent =
                        `rgb(${accent['red']},${accent['green']},${accent['blue']})`;
                    await this.#updateCacheTrackers(this.#shape, [this.#color.accent]);
                    this.#color.useCustomMain
                        ? this.#updateTrackerIcon(this.#shape, this.#color.main)
                        : this.#updateTrackerIcon(this.#shape, this.#color.accent);
                },
                this
            );
        }

        this.#color.useCustomMain
            ? this.currentColor = this.#color.main
            : this.currentColor = this.#color.accent;

        // Connect toggle tracker shortcut
        Main.wm.addKeybinding(
            'tracker-keybinding',
            this.#settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            this.toggleTracker.bind(this)
        );

        // Check if running on wayland (GNOME 50+ is Wayland only)
        const isWayland = Meta.is_wayland_compositor ? Meta.is_wayland_compositor() : true;

        // Connect mouse click events
        if (isWayland) {
            this.#capturedEvent = global.stage.connect(
                'captured-event',
                this.#onStageMouseEvent.bind(this)
            );
        } else {
            Atspi.init();
            this.#mouseListener = Atspi.EventListener.new(this.#onAtspiMouseEvent.bind(this));
            this.#mouseListener.register('mouse');
        }
    }
    //#endregion

    //#region Cache icons methods
    // Create cached tracker icons for a given shape and array of colors
    async #updateCacheTrackers(shape, colorArray) {
        const tasks = colorArray.map(async (color) => {
            // Get the cached tracker icon file for this shape and color
            const colorTag = color.replace(/[^\d,]/g, '');
            const cacheIconPath =
                GLib.build_filenamev([this.#cacheDir, `${shape}_${colorTag}.svg`]);
            const cacheIcon = Gio.File.new_for_path(cacheIconPath);

            // Get template shape
            const templatePath = GLib.build_filenamev([this.#trackersDir, `${shape}.svg`]);
            const template = Gio.File.new_for_path(templatePath);

            // Load template contents
            const [contents, etag_] = await template.load_contents_async(null);

            // Decode SVG contents
            const decoder = new TextDecoder();
            let decodedContents = decoder.decode(contents);

            // Replace color in SVG contents
            decodedContents = decodedContents.replace('#000', color);

            // Encode SVG contents back into bytes
            const encoder = new TextEncoder();
            const encodedContents = encoder.encode(decodedContents);

            // Fill cached icon file with modified contents
            await cacheIcon.replace_contents_async(
                encodedContents,
                null,
                false,
                Gio.FileCreateFlags.REPLACE_DESTINATION,
                null
            );
        });
        await Promise.all(tasks);
    }

    // Change tracker icon
    #updateTrackerIcon(shape, color) {
        const colorTag = color.replace(/[^\d,]/g, '');
        const trackerIconPath = GLib.build_filenamev([this.#cacheDir, `${shape}_${colorTag}.svg`]);
        this.#tracker.gicon = Gio.icon_new_for_string(trackerIconPath);
        this.currentColor = color;
    }
    //#endregion

    //#region Position updater
    #updateTrackerPosition() {
        // Get mouse coordinates
        let [newMouseX, newMouseY] = global.get_pointer();

        // Offset so that the tracker is aligned with the point of the cursor
        newMouseX -= this.#size / 2;
        newMouseY -= this.#size / 2;

        // Only update icon position if tracker is on screen AND mouse has moved
        if (
            this.#tracker.get_parent() &&
                (this.#mouseX !== newMouseX || this.#mouseY !== newMouseY)
        ) {
            this.#tracker.set_position(newMouseX, newMouseY);
            // Keep tracker on top of other UI elements
            Main.uiGroup.set_child_above_sibling(this.#tracker, null);
            [this.#mouseX, this.#mouseY] = [newMouseX, newMouseY];
        }
    }
    //#endregion

    //#region Tracker toggle
    toggleTracker() {
        this.emit('toggled');
        this.enabled ? this.#disableTracker() : this.#enableTracker();
    }

    #enableTracker() {
        this.enabled = true;

        // Start Updater
        this.#trackerPositionUpdater = setInterval(
            this.#updateTrackerPosition.bind(this),
            1000 / this.#refreshRate
        );

        // Add tracker to desktop
        Main.uiGroup.add_child(this.#tracker);
        this.#updateTrackerPosition(); // Needs tracker to be part of uiGroup
        this.#color.useCustomMain
            ? this.#updateTrackerIcon(this.#shape, this.#color.main)
            : this.#updateTrackerIcon(this.#shape, this.#color.accent);
    }

    #disableTracker() {
        this.enabled = false;

        // Clear timeouts
        this.#clickMaxTimeout = clearTimeout(this.#clickMaxTimeout);
        this.#clickReleaseTimeout = clearTimeout(this.#clickReleaseTimeout);
        this.#trackerRaiseTimeout = clearTimeout(this.#trackerRaiseTimeout);

        // Remove tracker from desktop
        if (this.#tracker && this.#tracker.get_parent() === Main.uiGroup)
            Main.uiGroup.remove_child(this.#tracker);

        this.#tracker.gicon = null;

        // Stop updating the tracker position
        this.#trackerPositionUpdater = clearInterval(this.#trackerPositionUpdater);
    }
    //#endregion

    //#region Button Press methods
    // Button press method
    #handleMouseButtonPress(button) {
        switch (button) {
            // Button presses
            case 1:
                this.#handleClick(button, this.#color.left);
                break;
            case 2:
                this.#handleClick(button, this.#color.middle);
                break;
            case 3:
                this.#handleClick(button, this.#color.right);
                break;
            default:
        }
    }

    // Using `global.stage` to monitor mouse clicks on Wayland (doesn't work on applications)
    #onStageMouseEvent(actor, event) {
        if (event.type() === Clutter.EventType.BUTTON_PRESS) {
            const button = event.get_button();
            this.#handleMouseButtonPress(button);
        } else if (event.type() === Clutter.EventType.BUTTON_RELEASE) {
            const button = event.get_button();
            this.#handleClickRelease(button);
        }
    }

    // Using `Atspi.EventListener` to monitor clicks on X11 (middle click is not registered)
    #onAtspiMouseEvent(event) {
        // Match button presses and releases
        const match = event.type.match(/mouse:button:(\d)([pr])/);
        if (match) {
            const button = parseInt(match[1], 10);
            const action = match[2];
            if (action === 'p')
                this.#handleMouseButtonPress(button);
            else if (action === 'r')
                this.#handleClickRelease(button);
        }
    }

    //#region Click highlighting
    #handleClick(button, color) {
        this.emit('click');

        if (!this.enabled)
            return;

        // Set the active button
        this.#activeClick = button;
        this.#clickResetPending = false;

        // Update the tracker icon with the new color
        this.#updateTrackerIcon(this.#shape, color);

        // Move the tracker on top of any new UI element that appears after click
        this.#trackerRaiseTimeout = clearTimeout(this.#trackerRaiseTimeout);
        this.#trackerRaiseTimeout = setTimeout(
            () => Main.uiGroup.set_child_above_sibling(this.#tracker, null),
            TRACKER_RAISE_DELAY
        );

        // Set a maximum timeout to revert the color
        this.#clickMaxTimeout = clearTimeout(this.#clickMaxTimeout);
        this.#clickMaxTimeout = setTimeout(this.#resetColor.bind(this), CLICK_MAX_DEBOUNCE);

        // Create an animated icon
        const colorTag = color.replace(/[^\d,]/g, '');
        const trackerIconPath =
            GLib.build_filenamev([this.#cacheDir, `${this.#shape}_${colorTag}.svg`]);
        let animatedIcon = new St.Icon({
            x: this.#tracker.x,
            y: this.#tracker.y,
            reactive: false,
            can_focus: false,
            track_hover: false,
            icon_size: this.#tracker.icon_size,
            opacity: this.#tracker.opacity,
            gicon: Gio.icon_new_for_string(trackerIconPath),
        });

        // Add animated icon to the UI group
        Main.uiGroup.add_child(animatedIcon);

        // Offset so that the animation is aligned with the point of the cursor
        const rippleOffset = (animatedIcon.icon_size * (CLICK_RIPPLE_SCALE - 1)) / 2;

        // Play ripple effect
        animatedIcon.ease({
            x: animatedIcon.x - rippleOffset,
            y: animatedIcon.y - rippleOffset,
            scale_x: CLICK_RIPPLE_SCALE,
            scale_y: CLICK_RIPPLE_SCALE,
            opacity: 0,
            duration: CLICK_MIN_DEBOUNCE * 2,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete() {
                Main.uiGroup.remove_child(animatedIcon);
                animatedIcon.destroy();
                animatedIcon = null;
            },
        });
    }

    #handleClickRelease(button) {
        // Debounce the release event
        this.#clickReleaseTimeout = clearTimeout(this.#clickReleaseTimeout);
        this.#clickReleaseTimeout = setTimeout(
            () => {
                // Only reset if no new click event has occurred in the meantime
                if (this.#activeClick === button && this.#clickResetPending)
                    this.#resetColor();
            },
            CLICK_MIN_DEBOUNCE
        );
        this.#clickResetPending = true;
    }

    #resetColor() {
        // Reset the tracker icon to the main color
        this.#color.useCustomMain
            ? this.#updateTrackerIcon(this.#shape, this.#color.main)
            : this.#updateTrackerIcon(this.#shape, this.#color.accent);
        this.#activeClick = null;
        this.#clickResetPending = false;

        // Clear timeout
        this.#clickMaxTimeout = clearTimeout(this.#clickMaxTimeout);
    }
    //#endregion
    //#endregion

    //#region Properties updater
    async #updateTrackerProperties() {
        // Get new settings
        const newShape = this.#settings.get_string('tracker-shape');
        const newSize = this.#settings.get_int('tracker-size');
        const newColorUseCustomMain = this.#hasAccentColor
            ? this.#settings.get_boolean('tracker-color-main-enabled') : true;
        const newColorMain = this.#settings.get_string('tracker-color-main');
        const newColorLeft = this.#settings.get_string('tracker-color-left');
        const newColorMiddle = this.#settings.get_string('tracker-color-middle');
        const newColorRight = this.#settings.get_string('tracker-color-right');
        const newOpacity = this.#settings.get_int('tracker-opacity');
        const newRefreshRate = this.#settings.get_int('tracker-refresh-rate');

        // Update tracker if shape or any color has changed
        if (
            this.#shape !== newShape ||
            this.#color.useCustomMain !== newColorUseCustomMain ||
            this.#color.main !== newColorMain ||
            this.#color.left !== newColorLeft ||
            this.#color.middle !== newColorMiddle ||
            this.#color.right !== newColorRight
        ) {
            this.#shape = newShape;
            this.#color.useCustomMain = newColorUseCustomMain;
            this.#color.main = newColorMain;
            this.#color.left = newColorLeft;
            this.#color.middle = newColorMiddle;
            this.#color.right = newColorRight;

            await this.#updateCacheTrackers(this.#shape, [
                this.#color.main,
                this.#color.left,
                this.#color.middle,
                this.#color.right,
            ]);
            if (this.#hasAccentColor)
                await this.#updateCacheTrackers(this.#shape, [this.#color.accent]);

            this.#color.useCustomMain
                ? this.#updateTrackerIcon(this.#shape, this.#color.main)
                : this.#updateTrackerIcon(this.#shape, this.#color.accent);
        }

        // Update size if changed
        if (this.#size !== newSize) {
            this.#size = newSize;
            this.#tracker.icon_size = this.#size;
        }

        // Update opacity if changed
        if (this.#opacity !== newOpacity) {
            this.#opacity = newOpacity;
            this.#tracker.opacity = Math.ceil(this.#opacity * 2.55);
        }

        // Update refresh rate if changed
        if (this.#refreshRate !== newRefreshRate && this.#trackerPositionUpdater) {
            this.#trackerPositionUpdater = clearInterval(this.#trackerPositionUpdater);
            this.#trackerPositionUpdater = setInterval(
                this.#updateTrackerPosition.bind(this),
                1000 / newRefreshRate
            );
            this.#refreshRate = newRefreshRate;
        }
    }
    //#endregion

    //#region Destroy method
    destroy() {
        // Disable tracker if active
        this.#disableTracker();

        // Disconnect mouse click events
        if (this.#capturedEvent) {
            global.stage.disconnect(this.#capturedEvent);
            this.#capturedEvent = null;
        }
        if (this.#mouseListener) {
            this.#mouseListener.deregister('mouse');
            this.#mouseListener = null;
        }

        // Disconnect settings
        this.#settings.disconnectObject(this);
        this.#settings = null;
        this.#themeContext?.disconnectObject(this);
        this.#themeContext = null;

        // Disconnect keybinding
        Main.wm.removeKeybinding('tracker-keybinding');

        // Destroy tracker
        this.#tracker.destroy();
        this.#tracker = null;
    }
    //#endregion
});
