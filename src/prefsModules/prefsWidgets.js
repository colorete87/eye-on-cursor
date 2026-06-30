// SPDX-FileCopyrightText: 2024-2026 Djinn Alexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
//#endregion

//#region Color picker widget
/**
 * A widget that contains a `Gtk.ColorDialogButton` connected to a provided color key and an
 * optional `Gtk.CheckButton` toggle if theme color is supported, allowing the user to override it
 * with a custom color.
 *
 * @param {Gio.Settings} settings - The settings object for this extension.
 * @param {string} colorKey - The settings key for this setting color string.
 * @param {string|null} enabledKey [enabledKey=null] - The settings key for the boolean that toggles
 * overriding the theme color with this user-set color.
 */
export const EyeColorPicker = GObject.registerClass(
class EyeColorPicker extends Gtk.Box {
    #settings;
    #key;
    #colorPicker;
    #rgba;

    constructor(settings, colorKey, enabledKey = null) {
        super({
            orientation: Gtk.Orientation.HORIZONTAL,
            margin_end: 8,
        });
        this.#settings = settings;
        this.#key = colorKey;

        this.#colorPicker = new Gtk.ColorDialogButton({
            dialog: new Gtk.ColorDialog({
                modal: true,
                with_alpha: false,
            }),
            valign: Gtk.Align.CENTER,
        });
        this.#rgba = new Gdk.RGBA();
        this.#rgba.parse(this.#settings.get_string(this.#key));
        this.#colorPicker.set_rgba(this.#rgba);

        this.#colorPicker.connect(
            'notify::rgba',
            (widget) => this.#settings.set_string(this.#key, widget.get_rgba().to_string())
        );

        if (enabledKey) {
            const colorToggle = new Gtk.CheckButton({
                margin_end: 8,
                valign: Gtk.Align.CENTER,
            });
            this.#settings.bind(
                enabledKey,
                colorToggle,
                'active',
                Gio.SettingsBindFlags.DEFAULT
            );
            this.#settings.bind(
                enabledKey,
                this.#colorPicker,
                'sensitive',
                Gio.SettingsBindFlags.DEFAULT
            );
            this.append(colorToggle);
        }
        this.append(this.#colorPicker);
    }

    reset() {
        this.#rgba.parse(this.#settings.get_default_value(this.#key).deep_unpack());
        this.#colorPicker.set_rgba(this.#rgba);
    }
});
//#endregion

//#region Keybinding row
/**
 * A row that allows users to set a keyboard shortcut.
 *
 * @param {Gio.Settings} settings - The settings object for this extension.
 * @param {string} key -  The settings key for this keybinding.
 * @param {string} shortcutName - The name of the shortcut and title of the row.
 */
export const EyeKeybindingRow = GObject.registerClass(
class EyeKeybindingRow extends Adw.ActionRow {
    #settings;
    #key;
    #label;
    #box;
    #resetButton;
    #captureWindow;

    constructor(settings, key, shortcutName) {
        super({
            title: shortcutName,
            subtitle: _('Set shortcut'),
            activatable: true,
        });

        this.#settings = settings;
        this.#key = key;

        // Display current keybinding
        this.#label = new Gtk.ShortcutLabel({
            disabled_text: _('New shortcut…'),
            valign: Gtk.Align.CENTER,
            accelerator: this.#settings.get_strv(this.#key)[0],
        });
        this.#box = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
        this.#box.append(this.#label);
        this.add_suffix(this.#box);

        // Button to reset keybinding
        this.#resetButton = new Gtk.Button({
            icon_name: 'edit-delete-symbolic',
            css_classes: ['destructive-action'],
            valign: Gtk.Align.CENTER,
        });
        this.#resetButton.connect('clicked', this.resetKeybinding.bind(this));
        this.add_suffix(this.#resetButton);

        // Hide reset button if no shortcut is set
        if (!this.#label.accelerator)
            this.#resetButton.visible = false;

        // Connect row activation to open capture window
        this.connect('activated', this.#openCaptureWindow.bind(this));

        // Connect change in accelerator to setting update
        this.#label.connect('notify::accelerator', (widget) =>
            this.#settings.set_strv(this.#key, [widget.accelerator])
            // Main.wm.addKeybinding takes string arrays, not strings
        );
    }

    //#region Keybinding row methods
    resetKeybinding() {
        this.#label.accelerator = '';
        this.#settings.reset(this.#key);
        this.#resetButton.visible = false;
    }

    #openCaptureWindow() {
        const controller = new Gtk.EventControllerKey();

        const content = new Adw.StatusPage({
            title: _('Set shortcut'),
            description: _('Press Esc to cancel or Backspace to disable the keyboard shortcut'),
            icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic',
        });

        this.#captureWindow = new Adw.Window({
            modal: true,
            transient_for: this.get_root(),
            width_request: 480,
            height_request: 320,
            content,
        });

        this.#captureWindow.add_controller(controller);
        controller.connect('key-pressed', this.#registerKey.bind(this));
        this.#captureWindow.present();
    }

    #registerKey(widget, keyval, keycode, state) {
        // Get default modifier mask (keys) that are currently pressed
        let mask = state & Gtk.accelerator_get_default_mod_mask();
        // Filter out CAPS LOCK
        mask &= ~Gdk.ModifierType.LOCK_MASK;

        // If Esc is pressed without modifiers, close capture window
        if (!mask && keyval === Gdk.KEY_Escape) {
            this.#captureWindow.destroy();
            return Gdk.EVENT_STOP;
        }

        // If Backspace is pressed, reset keybinding
        if (keyval === Gdk.KEY_BackSpace) {
            this.resetKeybinding();
            this.#captureWindow.destroy();
            return Gdk.EVENT_STOP;
        }

        // If the key combination is not acceptable, ignore it
        if (!this.#isValidBinding(mask, keycode, keyval) || !this.#isValidAccel(mask, keyval))
            return Gdk.EVENT_STOP;

        this.#label.accelerator = Gtk.accelerator_name_with_keycode(null, keyval, keycode, mask);
        this.#resetButton.visible = true;
        this.#captureWindow.destroy();
        return Gdk.EVENT_STOP;
    }
    //#endregion

    //#region Keybinding validation
    // See https://gitlab.gnome.org/GNOME/gnome-control-center/-/blob/main/panels/keyboard/keyboard-shortcuts.c
    #isValidBinding(mask, keycode, keyval) {
        if ((mask === 0 || mask === Gdk.ModifierType.SHIFT_MASK) && keycode !== 0) {
            if (
                this.#isKeyInRange(keyval, Gdk.KEY_a, Gdk.KEY_z) ||
                this.#isKeyInRange(keyval, Gdk.KEY_A, Gdk.KEY_Z) ||
                this.#isKeyInRange(keyval, Gdk.KEY_0, Gdk.KEY_9) ||
                this.#isKeyInRange(keyval, Gdk.KEY_kana_fullstop, Gdk.KEY_semivoicedsound) ||
                this.#isKeyInRange(keyval, Gdk.KEY_Arabic_comma, Gdk.KEY_Arabic_sukun) ||
                this.#isKeyInRange(keyval, Gdk.KEY_Serbian_dje, Gdk.KEY_Cyrillic_HARDSIGN) ||
                this.#isKeyInRange(keyval, Gdk.KEY_Greek_ALPHAaccent, Gdk.KEY_Greek_omega) ||
                this.#isKeyInRange(keyval, Gdk.KEY_hebrew_doublelowline, Gdk.KEY_hebrew_taf) ||
                this.#isKeyInRange(keyval, Gdk.KEY_Thai_kokai, Gdk.KEY_Thai_lekkao) ||
                this.#isKeyInRange(keyval, Gdk.KEY_Hangul_Kiyeog, Gdk.KEY_Hangul_J_YeorinHieuh) ||
                (keyval === Gdk.KEY_space && mask === 0) ||
                this.#isKeyvalForbidden(keyval)
            )
                return false;
        }
        return true;
    }

    #isKeyvalForbidden(keyval) {
        return [
            // Navigation keys
            Gdk.KEY_Home,
            Gdk.KEY_Left,
            Gdk.KEY_Up,
            Gdk.KEY_Right,
            Gdk.KEY_Down,
            Gdk.KEY_Page_Up,
            Gdk.KEY_Page_Down,
            Gdk.KEY_End,
            Gdk.KEY_Tab,

            // Return
            Gdk.KEY_KP_Enter,
            Gdk.KEY_Return,

            Gdk.KEY_Mode_switch,
        ].includes(keyval);
    }

    #isKeyInRange(keyval, start, end) {
        return keyval >= start && keyval <= end;
    }

    #isValidAccel(mask, keyval) {
        return Gtk.accelerator_valid(keyval, mask) || (keyval === Gdk.KEY_Tab && mask !== 0);
    }
    //#endregion
});
//#endregion

//#region Reset row
/**
 * A row that allows users to reset all the settings on a page.
 *
 * @param {string} heading - The heading of the alert dialog.
 * @param {Gio.Settings} settings - The settings object for this group of keys.
 * @param {string[]} keys - The array of keys to reset.
 * @param {Function[]} resetFunctions - The array of functions that update widget values with
 * default key values.
 */
export const EyeResetRow = GObject.registerClass(
class EyeResetRow extends Adw.ActionRow {
    constructor(heading, settings, keys, resetFunctions) {
        super({
            title: _('Reset Settings'),
            activatable: true,
            css_classes: ['error'],
        });
        this.get_child().set_halign(Gtk.Align.CENTER);
        this.get_child().add_css_class('heading');

        this.add_prefix(new Gtk.Image({icon_name: 'view-refresh-symbolic'}));

        const resetAlert = new Adw.AlertDialog({
            heading,
            body: _('Any related customizations will be lost.'),
        });

        resetAlert.add_response('close', _('Cancel'));
        resetAlert.add_response('reset', _('Reset'));
        resetAlert.set_default_response('close');
        resetAlert.set_response_appearance('reset', Adw.ResponseAppearance.DESTRUCTIVE);

        resetAlert.connect('response::reset', () => {
            resetFunctions.forEach((func) => func());
            keys.forEach((key) => settings.reset(key));
        });

        this.connect('activated', () => resetAlert.present(this));
    }
});
//#endregion
