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

import { EyeColorPicker, EyeResetRow } from './widgets.js';
//#endregion

//#region Eye Group
/**
 * An `Adw.PreferencesGroup` containing an `Adw.ExpanderRow` containing the settings for an eye.
 * @param {Gio.SettingsSchema} schema - The settings schema for an individual eye.
 * @param {string} schemaPathRoot - The GSettings path under which eyes settings are stored.
 * @param {number} index - The position of this eye among all eyes.
 */
const EyeSettingsGroup = GObject.registerClass(
    class EyeSettingsGroup extends Adw.PreferencesGroup {
        constructor(schema, schemaPathRoot, index) {
            super();

            const eyeID = String(index).padStart(2, '0');
            const eyeName = `eye-${eyeID}`;
            this.settings = new Gio.Settings({
                settings_schema: schema,
                path: `${schemaPathRoot}${eyeName}/`,
            });
            this.resetFunctions = [];

            const eyeDrawerRow = new Adw.ExpanderRow({
                title: pgettext('%s is the eye ID number (e.g. 01)', 'Eye #%s').format(eyeID),
            });
            this.add(eyeDrawerRow);

            //#region Label
            const nicknameEntry = new Gtk.Entry({
                placeholder_text: _('Label'),
                valign: Gtk.Align.CENTER,
                max_width_chars: 24,
                buffer: new Gtk.EntryBuffer({ text: this.settings.get_string('label') }),
            });
            this.settings.bind(
                'label',
                nicknameEntry.buffer,
                'text',
                Gio.SettingsBindFlags.DEFAULT
            );
            eyeDrawerRow.add_suffix(nicknameEntry);
            //#endregion

            //#region Status
            const activeRow = new Adw.SwitchRow({
                title: _('Show Eye'),
                subtitle: _('Show this eye on the panel'),
            });
            this.settings.bind('enabled', activeRow, 'active', Gio.SettingsBindFlags.DEFAULT);
            eyeDrawerRow.add_row(activeRow);
            //#endregion

            //#region Position
            const positionOptions = [
                {
                    label: _('Left'),
                    nick: 'left',
                },
                {
                    label: _('Center'),
                    nick: 'center',
                },
                {
                    label: _('Right'),
                    nick: 'right',
                },
            ];
            const positionLabelList = new Gtk.StringList();
            positionOptions.forEach((option) => positionLabelList.append(option.label));

            const positionRow = new Adw.ComboRow({
                title: _('Position'),
                subtitle: _('Where this eye appears on the panel'),
                model: positionLabelList,
                selected: this.settings.get_enum('position'),
            });
            positionRow.connect('notify::selected', (widget) =>
                this.settings.set_enum('position', widget.selected)
            );
            eyeDrawerRow.add_row(positionRow);

            this.resetFunctions.push(() => {
                const defValue = this.settings.get_default_value('position').deep_unpack();
                positionRow.set_selected(
                    positionOptions.findIndex((option) => option.nick === defValue)
                );
            });
            //#endregion

            //#region Index
            const indexRow = new Adw.SpinRow({
                title: _('Order'),
                subtitle: _('Position among other items in the same panel section'),
                adjustment: new Gtk.Adjustment({
                    lower: -1,
                    upper: 100,
                    step_increment: 1,
                }),
            });
            this.settings.bind('index', indexRow, 'value', Gio.SettingsBindFlags.DEFAULT);
            eyeDrawerRow.add_row(indexRow);
            //#endregion

            //#region Width
            const widthRow = new Adw.SpinRow({
                title: _('Width'),
                subtitle: _('Width of the eye area'),
                adjustment: new Gtk.Adjustment({
                    lower: 20,
                    upper: 200,
                    step_increment: 1,
                }),
            });
            this.settings.bind('width', widthRow, 'value', Gio.SettingsBindFlags.DEFAULT);
            eyeDrawerRow.add_row(widthRow);
            //#endregion

            //#region Shape
            const shapeOptions = [
                {
                    label: _('Natural'),
                    nick: 'natural',
                },
                {
                    label: _('Round'),
                    nick: 'round',
                },
                {
                    label: _('Comic'),
                    nick: 'comic',
                },
            ];
            const shapeLabelList = new Gtk.StringList();
            shapeOptions.forEach((option) => shapeLabelList.append(option.label));

            const shapeRow = new Adw.ComboRow({
                title: _('Shape'),
                subtitle: _('Eye outline style'),
                model: shapeLabelList,
                selected: this.settings.get_enum('shape'),
            });
            shapeRow.connect('notify::selected', (widget) =>
                this.settings.set_enum('shape', widget.selected)
            );
            eyeDrawerRow.add_row(shapeRow);

            this.resetFunctions.push(() => {
                const defValue = this.settings.get_default_value('shape').deep_unpack();
                shapeRow.set_selected(shapeOptions.findIndex((option) => option.nick === defValue));
            });
            //#endregion

            //#region Outline mode
            const lineModeRow = new Adw.SwitchRow({
                title: _('Sketch Mode'),
                subtitle: _('Only draw the outline'),
            });
            this.settings.bind(
                'outline-mode',
                lineModeRow,
                'active',
                Gio.SettingsBindFlags.DEFAULT
            );
            eyeDrawerRow.add_row(lineModeRow);
            //#endregion

            //#region Eye line width
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
            this.settings.bind('line-width', lineWidthRow, 'value', Gio.SettingsBindFlags.DEFAULT);
            this.settings.bind(
                'outline-mode',
                lineWidthRow,
                'sensitive',
                Gio.SettingsBindFlags.DEFAULT
            );
            eyeDrawerRow.add_row(lineWidthRow);
            //#endregion

            //#region Colors
            const colorDrawerRow = new Adw.ExpanderRow({ title: _('Colors') });
            eyeDrawerRow.add_row(colorDrawerRow);

            const colorGridRow = new Adw.ActionRow({ title: _('Custom colors') });

            const colorGrid = new Gtk.Grid({
                column_spacing: 16,
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
                row_spacing: 8,
                margin_top: 12,
                margin_bottom: 12,
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

            colorDefs.forEach(({ label, key, enabledKey }, i) => {
                const col = i % 2;
                const row = Math.floor(i / 2);

                const lbl = new Gtk.Label({
                    label,
                    valign: Gtk.Align.CENTER,
                    halign: Gtk.Align.END,
                });

                const picker = enabledKey
                    ? new EyeColorPicker(this.settings, key, enabledKey)
                    : new EyeColorPicker(this.settings, key);

                colorGrid.attach(lbl, col * 2, row * 2, 1, 1);
                colorGrid.attach(picker, col * 2 + 1, row * 2, 1, 1);

                this.resetFunctions.push(() => picker.reset());
            });

            colorGridRow.add_suffix(colorGrid);
            colorDrawerRow.add_row(colorGridRow);
            //#endregion

            //#region Reset
            const resetRow = new EyeResetRow(
                pgettext('%s is the eye ID number (e.g. 01)', 'Reset Eye #%s Settings?').format(
                    eyeID
                ),
                this.settings,
                this.settings.settings_schema.list_keys(),
                this.resetFunctions
            );
            eyeDrawerRow.add_row(resetRow);
            //#endregion
        }
    }
);
//#endregion

/**
 * A page displaying the eye settings.
 * @param {Gio.Settings} settings - The settings object for this extension.
 */
export const EyesPage = GObject.registerClass(
    class EyesPage extends Adw.PreferencesPage {
        #eyeGroups = [];

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
                subtitle: _('Number of eyes shown on the panel'),
                adjustment: new Gtk.Adjustment({
                    lower: 1,
                    upper: 99,
                    step_increment: 1,
                }),
            });
            settings.bind('eye-count', countRow, 'value', Gio.SettingsBindFlags.DEFAULT);
            countRow.set_tooltip_text(_('Displaying more eyes may impact performance'));
            globalGroup.add(countRow);
            //#endregion

            //#region Reset All
            const resetRow = new Adw.ActionRow({
                title: _('Reset…'),
                activatable: true,
                css_classes: ['error'],
            });

            resetRow.add_prefix(new Gtk.Image({ icon_name: 'view-refresh-symbolic' }));
            resetRow.get_child().set_halign(Gtk.Align.CENTER);
            resetRow.get_child().add_css_class('heading');

            const resetAlert = new Adw.AlertDialog({
                heading: _('Reset All Eye Settings?'),
                body: _('All customizations in this section will be lost'),
            });

            resetAlert.add_response('close', _('Cancel'));
            resetAlert.add_response('reset', _('Reset'));
            resetAlert.set_default_response('close');
            resetAlert.set_response_appearance('reset', Adw.ResponseAppearance.DESTRUCTIVE);

            resetAlert.connect('response::reset', () => {
                // Reset eye groups
                this.#eyeGroups.forEach((eyeGroup) => {
                    eyeGroup.resetFunctions.forEach((func) => func());
                    eyeGroup.settings.settings_schema
                        .list_keys()
                        .forEach((key) => eyeGroup.settings.reset(key));
                });

                // Reset count
                settings.reset('eye-count');
            });

            resetRow.connect('activated', () => resetAlert.present(this));
            globalGroup.add(resetRow);
            //#endregion

            //#region Eyes
            const eyeSchema = settings.get_child('eye').settings_schema;
            const eyeSchemaPathRoot = `${settings.settings_schema.get_path()}eyes/`;

            this.#createEyeGroups(eyeSchema, eyeSchemaPathRoot, countRow.value);

            countRow.adjustment.connect('value-changed', (widget) =>
                this.#createEyeGroups(eyeSchema, eyeSchemaPathRoot, widget.value)
            );
            //#endregion
        }

        //#region Create eye groups
        #createEyeGroups(schema, schemaPathRoot, count) {
            this.#eyeGroups.forEach((eyeGroup) => this.remove(eyeGroup));
            this.#eyeGroups.length = 0;

            for (let i = 1; i <= count; i++)
                this.#eyeGroups.push(new EyeSettingsGroup(schema, schemaPathRoot, i));
            this.#eyeGroups.forEach((eyeGroup) => this.add(eyeGroup));
        }
        //#endregion
    }
);
