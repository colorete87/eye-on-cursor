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
class EyesPage extends Adw.PreferencesPage {
    constructor(settings) {
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

        //#region Rows creation
        const eyeSchema = settings.get_child('eye').settings_schema;
        const eyeSchemaPathRoot = `${settings.settings_schema.get_path()}eyes/`;

        let eyeGroups = this.#createEyeGroups(eyeSchema, eyeSchemaPathRoot, countRow.value);

        countRow.adjustment.connect('value-changed', (widget) => {
            eyeGroups.forEach((eyeGroup) => this.remove(eyeGroup));
            eyeGroups = this.#createEyeGroups(eyeSchema, eyeSchemaPathRoot, widget.value);
        });
        //#endregion
    }

    //#region Eye group
    #createEyeGroups(schema, schemaPathRoot, count) {
        const eyeGroupsArray = [];

        for (let i = 1; i <= count; i++) {
            const eyeID = String(i).padStart(2, '0');
            const eyeName = `eye-${eyeID}`;
            const eyeSettings = new Gio.Settings({
                settings_schema: schema,
                path: `${schemaPathRoot}${eyeName}/`,
            });
            const eyeKeys = [];
            const resetFunctions = [];

            const eyeGroup = new Adw.PreferencesGroup();
            const eyeDrawerRow = new Adw.ExpanderRow({
                title: pgettext(
                    '%s is the eye ID number (e.g. 01)',
                    'Eye #%s'
                ).format(eyeID),
            });
            eyeGroup.add(eyeDrawerRow);

            //#region Position
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

            //#region Index
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

            //#region Width
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

            //#region Shape
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

            //#region Outline mode
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
                    upper: 5,
                    step_increment: 0.1,
                }),
                digits: 1,
            });
            eyeSettings.bind('line-width', lineWidthRow, 'value', Gio.SettingsBindFlags.DEFAULT);
            eyeSettings
                .bind('outline-mode', lineWidthRow, 'sensitive', Gio.SettingsBindFlags.DEFAULT);
            eyeDrawerRow.add_row(lineWidthRow);
            //#endregion

            //#region Colors
            const colorDrawerRow = new Adw.ExpanderRow({title: _('Colors')});
            eyeDrawerRow.add_row(colorDrawerRow);

            [
                'color-sclera',
                'color-sclera-enabled',
                'color-iris',
                'color-iris-enabled',
                'color-pupil',
                'color-eyelid',
            ].forEach((key) => eyeKeys.push(key));

            const colorGridRow = new Adw.ActionRow({subtitle: _('Custom colors')});

            const colorGrid = new Gtk.Grid({
                column_spacing: 16,
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
                row_spacing: 8,
                margin_top: 12,
                margin_bottom: 12,
                margin_end: 36,
            });

            const colorDefs = [
                {
                    label: _('Sclera'),
                    key: 'color-sclera',
                    enabledKey: 'color-sclera-enabled',
                },
                {
                    label: _('Pupil'),
                    key: 'color-pupil',
                },
                {
                    label: _('Iris'),
                    key: 'color-iris',
                    enabledKey: 'color-iris-enabled',
                },
                {
                    label: _('Eyelid'),
                    key: 'color-eyelid',
                },
            ];

            colorDefs.forEach(({label, key, enabledKey}, i) => {
                const col = i % 2;
                const row = Math.floor(i / 2);

                const lbl = new Gtk.Label({
                    label,
                    valign: Gtk.Align.CENTER,
                    halign: Gtk.Align.END,
                });

                const picker = enabledKey
                    ? new EyeColorPicker(eyeSettings, key, enabledKey)
                    : new EyeColorPicker(eyeSettings, key);

                colorGrid.attach(lbl, col * 2, row * 2, 1, 1);
                colorGrid.attach(picker, (col * 2) + 1, row * 2, 1, 1);

                resetFunctions.push(() => picker.reset());
            });

            colorGridRow.add_suffix(colorGrid);
            colorDrawerRow.add_row(colorGridRow);
            //#endregion

            //#region Reset
            const resetRow = new EyeResetRow(
                pgettext(
                    '%s is the eye ID number (e.g. 01)',
                    'Reset settings for eye #%s?'
                ).format(eyeID),
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
