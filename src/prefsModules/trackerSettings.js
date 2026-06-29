// SPDX-FileCopyrightText: 2024-2026 Djinn Alexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {EyeAboutRow} from './about.js';
import {EyeColorPicker, EyeKeybindingRow, EyeResetRow} from './prefsWidgets.js';
//#endregion

/**
 * A page displaying the tracker settings.
 *
 * @param {Gio.Settings} settings - The settings object for this extension.
 * @param {ExtensionMetadata} metadata - The metadata object from metadata.json.
 * @param {string} path - The filesystem path to the extension directory.
 */
export const TrackerPage = GObject.registerClass(
class TrackerPage extends Adw.PreferencesPage {
    constructor(settings, metadata, path) {
        super({
            icon_name: 'mouse-click-symbolic',
            name: 'tracker',
            title: _('Tracker'),
        });
        const trackerKeys = [];
        const resetFunctions = [];

        //#region Tracker drawing
        const drawingGroup = new Adw.PreferencesGroup({title: _('Appearance')});
        this.add(drawingGroup);

        //#region Tracker shape
        trackerKeys.push('tracker-shape');
        // Get list of shapes
        const shapeList = [];
        const shapeDirPath = GLib.build_filenamev([path, 'assets', 'trackers']);
        const shapeDir = Gio.file_new_for_path(shapeDirPath);
        const enumFiles = shapeDir.enumerate_children(
            'standard::name',
            Gio.FileQueryInfoFlags.NONE,
            null
        );
        try {
            let fileInfo;
            while ((fileInfo = enumFiles.next_file(null)) !== null) {
                const fileName = fileInfo.get_name();
                if (fileName.toLowerCase().endsWith('.svg'))
                    shapeList.push(fileName.replace('.svg', ''));
            }
        } finally {
            enumFiles.close(null);
        }
        shapeList.sort();

        const shapeRow = new Adw.ActionRow({
            title: _('Shape'),
            subtitle: _('Icon used for the tracker'),
            activatable: true,
        });

        const shapeRowLabel = new Gtk.Label({
            label: settings.get_string('tracker-shape').replaceAll('_', ' '),
            valign: Gtk.Align.CENTER,
        });
        shapeRow.add_suffix(shapeRowLabel);

        // Make shape picker
        const shapeWindow = new Adw.Dialog({
            title: _('Select a Tracker'),
            content_width: 400,
            content_height: 600,
        });

        const shapePicker = new Gtk.FlowBox({
            min_children_per_line: 3,
            activate_on_single_click: true,
            homogeneous: true,
            margin_top: 8,
            margin_bottom: 8,
            margin_start: 8,
            margin_end: 8,
            row_spacing: 4,
            column_spacing: 4,
        });

        shapeList.forEach((shape) => {
            const flowItem = new Gtk.FlowBoxChild();
            flowItem.shape = shape;
            flowItem.displayName = shape.replaceAll('_', ' ');

            const flowItemContent = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 4,
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
            });

            const filePath = GLib.build_filenamev([shapeDirPath, `${shape}.svg`]);
            const picture = Gtk.Picture.new_for_filename(filePath);
            picture.set_size_request(48, 48);
            picture.set_content_fit(Gtk.ContentFit.CONTAIN);

            const label = new Gtk.Label({
                label: flowItem.displayName,
                justify: Gtk.Justification.CENTER,
                wrap: true,
                xalign: 0.5,
            });

            flowItemContent.append(picture);
            flowItemContent.append(label);
            flowItem.set_child(flowItemContent);
            shapePicker.append(flowItem);
        });

        shapePicker.connect('child-activated', (flowBox, flowBoxChild) => {
            shapeRowLabel.set_label(flowBoxChild.displayName);
            settings.set_string('tracker-shape', flowBoxChild.shape);
            shapeWindow.close();
        });

        const scrolledWindow = new Gtk.ScrolledWindow();
        scrolledWindow.set_child(shapePicker);
        shapeWindow.set_child(scrolledWindow);

        shapeRow.connect('activated', () => shapeWindow.present(this));

        drawingGroup.add(shapeRow);

        resetFunctions.push(() => {
            shapeRowLabel.set_label(
                settings.get_default_value('tracker-shape').deep_unpack().replaceAll('_', ' ')
            );
        });
        //#endregion

        //#region Tracker size
        trackerKeys.push('tracker-size');
        const sizeRow = new Adw.SpinRow({
            title: _('Size'),
            subtitle: _('Diameter of the tracker in pixels'),
            adjustment: new Gtk.Adjustment({
                lower: 16,
                upper: 1024,
                step_increment: 16,
            }),
        });
        settings.bind('tracker-size', sizeRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        drawingGroup.add(sizeRow);
        //#endregion

        //#region Tracker main color
        ['tracker-color-main', 'tracker-color-main-enabled']
            .forEach((key) => trackerKeys.push(key));
        const colorMainRow = new Adw.ActionRow({
            title: _('Color'),
            subtitle: _('Custom color for the tracker'),
        });
        const colorMainPicker = new EyeColorPicker(
            settings,
            'tracker-color-main',
            'tracker-color-main-enabled'
        );
        colorMainRow.add_suffix(colorMainPicker);
        drawingGroup.add(colorMainRow);

        resetFunctions.push(() => colorMainPicker.reset());
        //#endregion

        //#region Tracker click colors
        const colorClickRow = new Adw.ActionRow({
            title: _('Colors on Click'),
            subtitle: _('Per-button click colors: left, middle, right'),
        });

        const colorClickPickers =
            ['tracker-color-left', 'tracker-color-middle', 'tracker-color-right'].map((key) => {
                trackerKeys.push(key);
                const colorPicker = new EyeColorPicker(settings, key);
                colorClickRow.add_suffix(colorPicker);
                resetFunctions.push(() => colorPicker.reset());
                return colorPicker;
            });
        colorClickPickers.slice(0, -1).forEach((colorPicker) => colorPicker.set_margin_end(0));

        const isWayland = Gdk.Display.get_default().constructor.name.includes('Wayland');
        if (isWayland)
            colorClickRow.set_tooltip_text(_('Click highlighting does not work in windows.'));

        drawingGroup.add(colorClickRow);
        //#endregion

        //#region Tracker opacity
        trackerKeys.push('tracker-opacity');
        const opacityRow = new Adw.SpinRow({
            title: _('Opacity'),
            subtitle: _('How transparent the tracker is'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 10,
            }),
        });
        settings.bind('tracker-opacity', opacityRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        drawingGroup.add(opacityRow);
        //#endregion

        //#region Tracker refresh rate
        trackerKeys.push('tracker-refresh-rate');
        const refreshRow = new Adw.SpinRow({
            title: _('Refresh Rate (Hz)'),
            subtitle: _('Frames per second'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 360,
                step_increment: 1,
            }),
        });
        settings.bind('tracker-refresh-rate', refreshRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        refreshRow.set_tooltip_text(_('Higher refresh rates may impact performance.'));
        drawingGroup.add(refreshRow);
        //#endregion
        //#endregion

        //#region Tracker keybinding
        trackerKeys.push('tracker-keybinding');
        const keybindingGroup = new Adw.PreferencesGroup({title: _('Keybinding')});
        this.add(keybindingGroup);

        const keybindingRow = new EyeKeybindingRow(
            settings,
            'tracker-keybinding',
            _('Toggle Tracker')
        );
        keybindingGroup.add(keybindingRow);

        resetFunctions.push(() => keybindingRow.resetKeybinding());
        //#endregion

        //#region Reset
        const resetGroup = new Adw.PreferencesGroup({title: _('Reset')});
        this.add(resetGroup);

        const resetRow = new EyeResetRow(
            _('Reset tracker settings?'),
            settings,
            trackerKeys,
            resetFunctions
        );
        resetGroup.add(resetRow);
        //#endregion

        //#region About
        const aboutGroup = new Adw.PreferencesGroup({title: _('Information')});
        this.add(aboutGroup);

        const aboutRow = new EyeAboutRow(metadata);
        aboutGroup.add(aboutRow);
        //#endregion
    }
});
