// SPDX-FileCopyrightText: 2026 Djinn Alexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { EyeResetRow } from './widgets.js';
//#endregion

/**
 * A page displaying the eye settings.
 * @param {Gio.Settings} settings - The settings object for this extension.
 */
export const EyeGlobalPage = GObject.registerClass(
    class EyeGlobalPage extends Adw.PreferencesPage {
        constructor(settings) {
            super({
                icon_name: 'preferences-system-symbolic',
                name: 'overview',
                title: _('Overview'),
            });
            const globalKeys = [];
            const resetFunctions = [];

            //#region General
            const generalGroup = new Adw.PreferencesGroup({ title: _('General') });
            this.add(generalGroup);

            //#region Eye status
            globalKeys.push('eye-enabled');
            const activeRow = new Adw.SwitchRow({
                title: _('Show Eyes'),
                subtitle: _('Show eyes on the panel'),
            });
            settings.bind('eye-enabled', activeRow, 'active', Gio.SettingsBindFlags.DEFAULT);
            generalGroup.add(activeRow);
            //#endregion

            //#region Eye reactivity
            globalKeys.push('eye-reactive');
            const reactiveRow = new Adw.SwitchRow({
                title: _('Context Menu'),
                subtitle: _('Click menu for the eyes'),
            });
            settings.bind('eye-reactive', reactiveRow, 'active', Gio.SettingsBindFlags.DEFAULT);
            generalGroup.add(reactiveRow);
            //#endregion

            //#region Eye refresh rate
            globalKeys.push('eye-refresh-rate');
            const refreshRow = new Adw.SpinRow({
                title: _('Refresh Rate (Hz)'),
                subtitle: _('Frames per second'),
                adjustment: new Gtk.Adjustment({
                    lower: 1,
                    upper: 360,
                    step_increment: 1,
                }),
            });
            settings.bind('eye-refresh-rate', refreshRow, 'value', Gio.SettingsBindFlags.DEFAULT);
            refreshRow.set_tooltip_text(_('Higher refresh rates may impact performance'));
            generalGroup.add(refreshRow);
            //#endregion
            //#endregion

            //#region Blink
            const blinkGroup = new Adw.PreferencesGroup({ title: _('Blinking') });
            this.add(blinkGroup);

            //#region Blink mode
            globalKeys.push('eye-blink-mode');
            const blinkModeOptions = [
                {
                    label: _('None'),
                    nick: 'none',
                },
                {
                    label: _('Click'),
                    nick: 'click',
                },
                {
                    label: _('Fixed'),
                    nick: 'fixed',
                },
                {
                    label: _('Random'),
                    nick: 'random',
                },
                {
                    label: _('Unsynced'),
                    nick: 'unsynced',
                },
            ];
            const blinkModeLabelList = new Gtk.StringList();
            blinkModeOptions.forEach((option) => blinkModeLabelList.append(option.label));

            const blinkModeRow = new Adw.ComboRow({
                title: _('Blink Mode'),
                subtitle: _('How blinking is triggered'),
                model: blinkModeLabelList,
                selected: settings.get_enum('eye-blink-mode'),
            });

            const isWayland = Gdk.Display.get_default().constructor.name.includes('Wayland');
            const clickTooltip = _('Click detection only works on the desktop.');
            if (isWayland && settings.get_string('eye-blink-mode') === 'click')
                blinkModeRow.set_tooltip_text(clickTooltip);

            blinkModeRow.connect('notify::selected', (widget) => {
                settings.set_enum('eye-blink-mode', widget.selected);
                if (isWayland && settings.get_string('eye-blink-mode') === 'click')
                    blinkModeRow.set_tooltip_text(clickTooltip);
                else blinkModeRow.set_tooltip_text('');
            });

            blinkGroup.add(blinkModeRow);

            resetFunctions.push(() => {
                const defValue = settings.get_default_value('eye-blink-mode').deep_unpack();
                blinkModeRow.set_selected(
                    blinkModeOptions.findIndex((option) => option.nick === defValue)
                );
            });
            //#endregion

            //#region Blink duration
            globalKeys.push('eye-blink-duration');
            const blinkDuration = new Adw.SpinRow({
                title: _('Blink Duration'),
                subtitle: _('Duration of a blink in milliseconds'),
                adjustment: new Gtk.Adjustment({
                    lower: 100,
                    upper: 1000,
                    step_increment: 10,
                }),
            });
            settings.bind(
                'eye-blink-duration',
                blinkDuration,
                'value',
                Gio.SettingsBindFlags.DEFAULT
            );
            blinkGroup.add(blinkDuration);
            //#endregion

            //#region Blink interval
            globalKeys.push('eye-blink-interval');
            const blinkIntervalRow = new Adw.SpinRow({
                title: _('Fixed Blink Interval'),
                subtitle: _('Time between blinks in seconds'),
                adjustment: new Gtk.Adjustment({
                    lower: 0.1,
                    upper: 3600,
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
            globalKeys.push('eye-blink-interval-range');
            const blinkIntervalRangeRow = new Adw.ActionRow({
                title: _('Blink Interval Range'),
                subtitle: _('Minimum and maximum time between blinks, in seconds'),
            });

            const blinkIntervalRange = settings.get_value('eye-blink-interval-range').deep_unpack();

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
                    upper: 3600,
                    step_increment: 0.1,
                }),
                digits: 1,
                value: blinkIntervalRange[1],
            });

            minIntervalButton.connect('value-changed', () => {
                // Update the minimum value of the max interval
                maxIntervalButton.adjustment.set_lower(minIntervalButton.get_value() + MIN_GAP);

                settings.set_value(
                    'eye-blink-interval-range',
                    new GLib.Variant('ad', [
                        minIntervalButton.get_value(),
                        maxIntervalButton.get_value(),
                    ])
                );
            });
            maxIntervalButton.connect('value-changed', () => {
                // Update the maximum value of the min interval
                minIntervalButton.adjustment.set_upper(maxIntervalButton.get_value() - MIN_GAP);

                settings.set_value(
                    'eye-blink-interval-range',
                    new GLib.Variant('ad', [
                        minIntervalButton.get_value(),
                        maxIntervalButton.get_value(),
                    ])
                );
            });

            const box = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 4,
                margin_top: 12,
                margin_bottom: 12,
            });
            box.append(minIntervalButton);
            box.append(new Gtk.Label({ label: _('to') }));
            box.append(maxIntervalButton);

            blinkIntervalRangeRow.add_suffix(box);
            blinkGroup.add(blinkIntervalRangeRow);

            resetFunctions.push(() => {
                const [min, max] = settings
                    .get_default_value('eye-blink-interval-range')
                    .deep_unpack();
                minIntervalButton.adjustment.set_upper(max - MIN_GAP);
                maxIntervalButton.adjustment.set_lower(min + MIN_GAP);
                minIntervalButton.set_value(min);
                maxIntervalButton.set_value(max);
            });
            //#endregion
            //#endregion

            this.onBlinkModeChanged(
                blinkModeOptions,
                blinkModeRow,
                blinkIntervalRow,
                blinkIntervalRangeRow
            );
            blinkModeRow.connect('notify::selected', (widget) =>
                this.onBlinkModeChanged(
                    blinkModeOptions,
                    widget,
                    blinkIntervalRow,
                    blinkIntervalRangeRow
                )
            );

            //#region Reset
            const resetGroup = new Adw.PreferencesGroup({ title: _('Reset') });
            this.add(resetGroup);

            const resetRow = new EyeResetRow(
                _('Reset Global Eye Settings?'),
                settings,
                globalKeys,
                resetFunctions
            );
            resetGroup.add(resetRow);
            //#endregion
        }

        onBlinkModeChanged(options, modeRow, blinkIntervalRow, blinkIntervalRangeRow) {
            blinkIntervalRow.set_sensitive(false);
            blinkIntervalRangeRow.set_sensitive(false);

            const mode = options[modeRow.selected].nick;
            switch (mode) {
                case 'fixed':
                    blinkIntervalRow.set_sensitive(true);
                    break;
                case 'random':
                case 'unsynced':
                    blinkIntervalRangeRow.set_sensitive(true);
                    break;
                case 'none':
                case 'click':
                default:
                    break;
            }
        }
    }
);
