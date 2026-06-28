// SPDX-FileCopyrightText: 2024-2026 Djinn Alexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {
    gettext as _,
    pgettext,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {EyeColorPicker, EyeResetRow} from './prefsWidgets.js';
//#endregion

/**
 * A page displaying the eye settings.
 *
 * @param {Gio.Settings} settings - The settings object for this extension.
 */
export const EyesPage = GObject.registerClass(
class EyePage extends Adw.PreferencesPage {
    constructor(settings, extensionDir) {
        super({
            icon_name: 'view-reveal-symbolic',
            name: 'eyes',
            title: _('Eyes'),
        });

        //#region Count
        const globalGroup = new Adw.PreferencesGroup();
        this.add(globalGroup);

        const countRow = new Adw.SpinRow({
            title: _('Count'),
            subtitle: _('Number of eyes to display'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 99,
                step_increment: 1,
            }),
        });
        settings.bind('eye-count', countRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        countRow.set_tooltip_text(_('Displaying more eyes may impact performance.'));
        globalGroup.add(countRow);
        //#endregion

        //#region Per-eye groups
        // Load schemas from the extension's compiled schema file
        const schemaSource = Gio.SettingsSchemaSource.new_from_directory(
            extensionDir.get_child('schemas').get_path(),
            Gio.SettingsSchemaSource.get_default(),
            false
        );
        // Recursive lookup into parent sources
        const eyeSchema = schemaSource.lookup('org.gnome.shell.extensions.eye-on-cursor.eye', true);
        let eyeGroups = this.#createEyeGroups(eyeSchema, countRow.value);

        countRow.adjustment.connect('value-changed', (widget) => {
            // Destroy groups
            eyeGroups.forEach((eyeGroup) => this.remove(eyeGroup));
            eyeGroups.length = 0;

            // Recreate groups
            eyeGroups = this.#createEyeGroups(eyeSchema, widget.value);
        });
        //#endregion
    }

    //#region Create eye group
    #createEyeGroups(schema, count) {
        const eyeGroupsArray = [];

        for (let i = 1; i <= count; i++) {
            const eyeID = `${String(i).padStart(2, '0')}`;
            const eyeSettings = new Gio.Settings({
                settings_schema: schema,
                path: `/org/gnome/shell/extensions/eye-on-cursor/eyes/eye-${eyeID}/`,
            });
            const eyeKeys = [];
            const resetFunctions = [];

            const eyeGroup = new Adw.PreferencesGroup();
            const eyeDrawerRow = new Adw.ExpanderRow({
                title: pgettext(
                    '%s is the eye ID number (e.g. 01)',
                    'Eye #%s'
                ).replace('%s', eyeID),
            });
            eyeGroup.add(eyeDrawerRow);

            //#region Eye position
            eyeKeys.push('position');
            const positionLabelList = new Gtk.StringList();
            [_('Left'), _('Center'), _('Right')]
            .forEach((position) => positionLabelList.append(position));

            const positionRow = new Adw.ComboRow({
                title: _('Position'),
                subtitle: _('Where the eyes appear on the panel'),
                model: positionLabelList,
                selected: eyeSettings.get_enum('position'),
            });
            positionRow.connect('notify::selected', (widget) =>
                eyeSettings.set_enum('position', widget.selected)
            );
            eyeDrawerRow.add_row(positionRow);

            resetFunctions.push(
                () => {
                    const defValue = eyeSettings.get_default_value('position').deep_unpack();
                    const values = ['left', 'center', 'right']; // Values from position enum in schema
                    positionRow.set_selected(values.indexOf(defValue));
                }
            );
            //#endregion

            //#region Eye index
            eyeKeys.push('index');
            const indexRow = new Adw.SpinRow({
                title: _('Index'),
                subtitle: _('Order of the eyes among other items in the chosen panel section'),
                adjustment: new Gtk.Adjustment({
                    lower: -1,
                    upper: 100,
                    step_increment: 1,
                }),
            });
            eyeSettings.bind('index', indexRow, 'value', Gio.SettingsBindFlags.DEFAULT);
            eyeDrawerRow.add_row(indexRow);
            //#endregion

            //#region Eye width
            eyeKeys.push('width');
            const widthRow = new Adw.SpinRow({
                title: _('Width'),
                subtitle: _('Drawing space and padding around each eye'),
                adjustment: new Gtk.Adjustment({
                    lower: 20,
                    upper: 200,
                    step_increment: 1,
                }),
            });
            eyeSettings.bind('width', widthRow, 'value', Gio.SettingsBindFlags.DEFAULT);
            eyeDrawerRow.add_row(widthRow);
            //#endregion

            //#region Eye shape
            eyeKeys.push('shape');
            const shapeLabelList = new Gtk.StringList();
            [_('Natural'), _('Round'), _('Comic')].forEach((shape) => shapeLabelList.append(shape));

            const shapeRow = new Adw.ComboRow({
                title: _('Shape'),
                subtitle: _('Outline style used for the eyes'),
                model: shapeLabelList,
                selected: eyeSettings.get_enum('shape'),
            });
            shapeRow.connect('notify::selected', (widget) =>
                eyeSettings.set_enum('shape', widget.selected)
            );
            eyeDrawerRow.add_row(shapeRow);

            resetFunctions.push(
                () => {
                    const defValue = eyeSettings.get_default_value('shape').deep_unpack();
                    const values = ['natural', 'round', 'comic']; // Values from shape enum in schema
                    shapeRow.set_selected(values.indexOf(defValue));
                }
            );
            //#endregion

            //#region Eye outline mode
            eyeKeys.push('outline-mode');
            const lineModeRow = new Adw.SwitchRow({
                title: _('Sketch Mode'),
                subtitle: _('Only draw the outline'),
            });
            eyeSettings.bind('outline-mode', lineModeRow, 'active', Gio.SettingsBindFlags.DEFAULT);
            eyeDrawerRow.add_row(lineModeRow);
            //#endregion

            //#region Eye line width
            eyeKeys.push('line-width');
            const lineWidthRow = new Adw.SpinRow({
                title: _('Line Thickness'),
                subtitle: _('Thickness of the strokes in sketch mode'),
                adjustment: new Gtk.Adjustment({
                    lower: 0,
                    upper: 50,
                    step_increment: 1,
                }),
            });
            eyeSettings.bind('line-width', lineWidthRow, 'value', Gio.SettingsBindFlags.DEFAULT);
            eyeSettings
                .bind('outline-mode', lineWidthRow, 'sensitive', Gio.SettingsBindFlags.DEFAULT);
            eyeDrawerRow.add_row(lineWidthRow);
            //#endregion

            //#region Eye iris color
            ['color-iris', 'color-iris-enabled'].forEach((key) => eyeKeys.push(key));
            const colorRow = new Adw.ActionRow({
                title: _('Iris Color'),
                subtitle: _('Custom color for the iris'),
            });
            const irisColorPicker = new EyeColorPicker(
                eyeSettings,
                'color-iris',
                'color-iris-enabled'
            );
            colorRow.add_suffix(irisColorPicker);
            eyeDrawerRow.add_row(colorRow);

            resetFunctions.push(() => irisColorPicker.reset());
            // TODO Make sclera and pupil color into settings
            //#endregion

            //#region Eyelid color
            eyeKeys.push('color-eyelid');
            const colorEyelidRow = new Adw.ActionRow({
                title: _('Eyelid Color'),
                subtitle: _('Custom color for the eyelid'),
            });
            const eyelidColorPicker = new EyeColorPicker(eyeSettings, 'color-eyelid');
            colorEyelidRow.add_suffix(eyelidColorPicker);
            eyeDrawerRow.add_row(colorEyelidRow);

            resetFunctions.push(() => eyelidColorPicker.reset());
            //#endregion

            //#region Reset
            const resetRow = new EyeResetRow(
                pgettext(
                    '%s is the eye ID number (e.g. 01)',
                    'Reset settings for eye #%s?'
                ).replace('%s', eyeID),
                eyeSettings,
                eyeKeys,
                resetFunctions
            );
            eyeDrawerRow.add_row(resetRow);
            //#endregion

            this.add(eyeGroup);
            eyeGroupsArray.push(eyeGroup);
        }
        return eyeGroupsArray;
    }
    //#endregion
});
