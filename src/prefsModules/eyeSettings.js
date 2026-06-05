// SPDX-FileCopyrightText: 2024-2026 Djinn Alexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {EyeColorPicker, EyeKeybindingRow, EyeResetRow} from './prefsWidgets.js';
//#endregion

/**
 * A page displaying the eye settings.
 *
 * @param {Gio.Settings} settings - The settings object for this extension.
 */
export const EyePage = GObject.registerClass(
class EyePage extends Adw.PreferencesPage {
    constructor(settings) {
        super({
            title: _('Eyes'),
            icon_name: 'view-reveal-symbolic',
        });
        const resetFunctions = [];

        //#region Eye placement group
        const placementGroup = new Adw.PreferencesGroup({title: _('Layout')});
        this.add(placementGroup);

        //#region Eye activity
        const activeRow = new Adw.SwitchRow({
            title: _('Active'),
            subtitle: _('Enable the eyes'),
        });
        settings.bind('eye-active', activeRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        placementGroup.add(activeRow);
        //#endregion

        //#region Eye count
        const countRow = new Adw.SpinRow({
            title: _('Count'),
            subtitle: _('Number of eyes'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 100,
                step_increment: 1,
            }),
        });
        settings.bind('eye-count', countRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        countRow.set_tooltip_text(_('Displaying more eyes may reduce performance.'));
        placementGroup.add(countRow);
        //#endregion

        //#region Eye position
        const positionLabelList = new Gtk.StringList();
        [_('Left'), _('Center'), _('Right')]
            .forEach((position) => positionLabelList.append(position));

        const positionRow = new Adw.ComboRow({
            title: _('Position'),
            subtitle: _('Position of the eyes on the panel'),
            model: positionLabelList,
            selected: settings.get_enum('eye-position'),
        });
        positionRow.connect('notify::selected', (widget) =>
            settings.set_enum('eye-position', widget.selected)
        );
        placementGroup.add(positionRow);

        resetFunctions.push(
            () => {
                const defValue = settings.get_default_value('eye-position').deep_unpack();
                const values = ['left', 'center', 'right']; // Values from eye-position enum in schema
                positionRow.set_selected(values.indexOf(defValue));
            }
        );
        //#endregion

        //#region Eye index
        const indexRow = new Adw.SpinRow({
            title: _('Index'),
            subtitle: _('Index of the eyes on the panel segment'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 1,
            }),
        });
        settings.bind('eye-index', indexRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        placementGroup.add(indexRow);
        //#endregion

        //#region Eye width
        const widthRow = new Adw.SpinRow({
            title: _('Width'),
            subtitle: _('Drawing space and padding'),
            adjustment: new Gtk.Adjustment({
                lower: 20,
                upper: 1000,
                step_increment: 1,
            }),
        });
        settings.bind('eye-width', widthRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        placementGroup.add(widthRow);
        //#endregion

        //#region Eye reactivity
        const reactiveRow = new Adw.SwitchRow({
            title: _('Menu'),
            subtitle: _('Enable the eye menu'),
        });
        settings.bind('eye-reactive', reactiveRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        placementGroup.add(reactiveRow);
        //#endregion
        //#endregion

        //#region Eye drawing group
        const drawingGroup = new Adw.PreferencesGroup({title: _('Appearance')});
        this.add(drawingGroup);

        //#region Eye shape
        const shapeLabelList = new Gtk.StringList();
        [_('Natural'), _('Round'), _('Comic')].forEach((shape) => shapeLabelList.append(shape));

        const shapeRow = new Adw.ComboRow({
            title: _('Shape'),
            subtitle: _('Shape of the eyes'),
            model: shapeLabelList,
            selected: settings.get_enum('eye-shape'),
        });
        shapeRow.connect('notify::selected', (widget) =>
            settings.set_enum('eye-shape', widget.selected)
        );
        drawingGroup.add(shapeRow);

        resetFunctions.push(
            () => {
                const defValue = settings.get_default_value('eye-shape').deep_unpack();
                const values = ['natural', 'round', 'comic']; // Values from eye-shape enum in schema
                shapeRow.set_selected(values.indexOf(defValue));
            }
        );
        //#endregion

        //#region Eye outline mode
        const lineModeRow = new Adw.SwitchRow({
            title: _('Sketch Mode'),
            subtitle: _('Only draw the outline'),
        });
        settings.bind('eye-line-mode', lineModeRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        drawingGroup.add(lineModeRow);
        //#endregion

        //#region Eye line width
        const lineWidthRow = new Adw.SpinRow({
            title: _('Line Thickness'),
            subtitle: _('Thickness of the strokes in outline mode'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 50,
                step_increment: 1,
            }),
        });
        settings.bind('eye-line-width', lineWidthRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        lineWidthRow.set_tooltip_text(_('Displaying more eyes may reduce performance.'));
        drawingGroup.add(lineWidthRow);
        //#endregion

        //#region Eye iris color
        const colorRow = new Adw.ActionRow({ // TODO rename variables
            title: _('Iris Color'),
            subtitle: _('Custom color for the iris'),
        });
        const irisColorPicker = new EyeColorPicker(
            settings,
            'eye-color-iris',
            'eye-color-iris-enabled'
        );
        colorRow.add_suffix(irisColorPicker);
        drawingGroup.add(colorRow);

        resetFunctions.push(() => irisColorPicker.reset());
        // TODO Make sclera and pupil color into settings
        //#endregion

        //#region Eye refresh rate
        const refreshRow = new Adw.SpinRow({
            title: _('Refresh Rate (Hz)'),
            subtitle: _('Higher refresh rates may impact performance.'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 360,
                step_increment: 1,
            }),
        });
        settings.bind('eye-refresh-rate', refreshRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        drawingGroup.add(refreshRow);
        //#endregion
        //#endregion

        //#region Eye blink group
        const blinkGroup = new Adw.PreferencesGroup({title: _('Blinking')});
        this.add(blinkGroup);

        //#region Eyelid color
        const colorEyelidRow = new Adw.ActionRow({
            title: _('Eyelid Color'),
            subtitle: _('Custom color for the eyelid'),
        });
        const eyelidColorPicker = new EyeColorPicker(settings, 'eye-color-eyelid');
        colorEyelidRow.add_suffix(eyelidColorPicker);
        blinkGroup.add(colorEyelidRow);

        resetFunctions.push(() => () => eyelidColorPicker.reset());
        //#endregion

        //#region Blink mode
        const blinkModeList = new Gtk.StringList();
        [_('Manual'), _('Fixed'), _('Random')].forEach((mode) => blinkModeList.append(mode));
        // Each option enables the corresponding row
        const blinkModeRow = new Adw.ComboRow({
            title: _('Blink Mode'),
            subtitle: _('Choose how eyes blink'),
            model: blinkModeList,
            selected: settings.get_enum('eye-blink-mode'),
        });
        blinkModeRow.connect('notify::selected', (widget) =>
            settings.set_enum('eye-blink-mode', widget.selected)
        );
        blinkGroup.add(blinkModeRow);

        resetFunctions.push(
            () => {
                const defValue = settings.get_default_value('eye-blink-mode').deep_unpack();
                const values = ['manual', 'synced', 'unsynced'];// Values from eye-blink-mode enum in schema
                blinkModeRow.set_selected(values.indexOf(defValue));
            }
        );
        //#endregion

        //#region Blink keybinding
        const blinkKeybindingRow = new EyeKeybindingRow(
            settings,
            'eye-blink-keybinding',
            _('Manual Blink')
        );
        blinkGroup.add(blinkKeybindingRow);

        resetFunctions.push(() => blinkKeybindingRow.resetKeybinding());
        //#endregion

        //#region Blink interval
        const blinkIntervalRow = new Adw.SpinRow({
            title: _('Fixed Blink Interval'),
            subtitle: _('Duration in seconds between blinks'),
            adjustment: new Gtk.Adjustment({
                lower: 0.1,
                upper: 86400,
                step_increment: 0.1,
            }),
            digits: 1,
        });
        settings.bind(
            'eye-blink-interval',
            blinkIntervalRow,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );
        blinkGroup.add(blinkIntervalRow);
        //#endregion

        //#region Blink random interval range
        const blinkIntervalRangeRow = new Adw.ActionRow({
            title: _('Random Blink Interval'),
            subtitle: _('Range of durations in seconds between random blinks'),
        });

        const blinkIntervalRange = settings
                .get_value('eye-blink-interval-range')
                .deep_unpack();

        const MIN_GAP = 0.1;
        const minIntervalButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0.1,
                upper: blinkIntervalRange[1] - MIN_GAP,
                step_increment: 0.1,
            }),
            digits: 1,
            value: blinkIntervalRange[0],
        });
        const maxIntervalButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: blinkIntervalRange[0] + MIN_GAP,
                upper: 86400,
                step_increment: 0.1,
            }),
            digits: 1,
            value: blinkIntervalRange[1],
        });

        minIntervalButton.connect('value-changed',
            () => {
                // Update the minimum value of the max interval
                maxIntervalButton.adjustment.set_lower(minIntervalButton.get_value() + MIN_GAP);

                settings.set_value(
                    'eye-blink-interval-range',
                    new GLib.Variant(
                        'ad',
                        [minIntervalButton.get_value(), maxIntervalButton.get_value()])
                );
            });
        maxIntervalButton.connect('value-changed',
            () => {
                // Update the maximum value of the min interval
                minIntervalButton.adjustment.set_upper(maxIntervalButton.get_value() - MIN_GAP);

                settings.set_value(
                    'eye-blink-interval-range',
                    new GLib.Variant(
                        'ad',
                        [minIntervalButton.get_value(), maxIntervalButton.get_value()])
                );
            });

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_top: 4,
            margin_bottom: 4,
        });
        box.append(minIntervalButton);
        box.append(new Gtk.Label({label: _('to')}));
        box.append(maxIntervalButton);

        blinkIntervalRangeRow.add_suffix(box);
        blinkGroup.add(blinkIntervalRangeRow);

        resetFunctions.push(() => {
            const [min, max] =
                settings.get_default_value('eye-blink-interval-range').deep_unpack();
            minIntervalButton.adjustment.set_upper(max - MIN_GAP);
            maxIntervalButton.adjustment.set_lower(min + MIN_GAP);
            minIntervalButton.set_value(min);
            maxIntervalButton.set_value(max);
        });
        //#endregion
        //#endregion

        //#region Reset group
        const resetGroup = new Adw.PreferencesGroup();
        this.add(resetGroup);

        const resetRow = new EyeResetRow(
            'eye',
            settings,
            _('Reset all eye settings?'),
            resetFunctions
        );
        resetGroup.add(resetRow);
        //#endregion
    }
});
