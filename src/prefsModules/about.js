// SPDX-FileCopyrightText: 2024-2026 Djinn Alexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {
    gettext as _,
    pgettext,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
//#endregion

//#region Credits
// Feel free to add your name and url in the relevant section below if you have contributed.

// Translators do not need to write in this file and must instead use the "translator_credits"
// string located in the translation files.
const artists = [];
const designers = [];
const developers = ['Djinn Alexio https://gitlab.gnome.org/DjinnAlexio'];
const documenters = [];

const copyright = '© 2024-2026 Djinn Alexio';
const developerName = 'Djinn Alexio';
const issueUrl = 'https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/issues';
// The string for `release_notes` supports paragraphs <p>, emphasis (italics) <em>, code <code>,
// and ordered <ol> and unordered <ul> lists with <li> list items.
const releaseNotes =
    '';
const supportUrl = '';
//#endregion

//#region About row
/**
 * A row that opens an AboutDialog window with information about the extension.
 *
 * @param {ExtensionMetadata} metadata - The metadata object from metadata.json.
 */
export const EyeAboutRow = GObject.registerClass(
class EyeAboutRow extends Adw.ActionRow {
    constructor(metadata) {
        super({
            title: _('About Eye on Cursor'),
            activatable: true,
        });

        // Add row icons
        this.add_prefix(new Gtk.Image({icon_name: 'help-about-symbolic'}));
        this.add_suffix(new Gtk.Image({icon_name: 'go-next-symbolic'}));

        //#region About dialog
        this.aboutWindow = new Adw.AboutDialog({
            application_icon: 'eye-on-cursor-logo',
            application_name: metadata.name,
            artists,
            comments: metadata.description,
            copyright,
            designers,
            developer_name: developerName,
            developers,
            documenters,
            issue_url: issueUrl,
            license_type: Gtk.License.GPL_3_0,
            release_notes: releaseNotes,
            release_notes_version: metadata['version-name'],
            support_url: supportUrl,
            translator_credits: pgettext('(USER)NAME EMAIL/URL', 'translator_credits'),
            version: metadata['version-name'],
            website: metadata.url,
        });

        this.aboutWindow.add_link(
            _('Extension Page'),
            'https://extensions.gnome.org/extension/7036/eye-on-cursor/'
        );
        this.aboutWindow.add_link(_('Donate'), 'https://www.paypal.com/paypalme/djinnalexio');
        this.aboutWindow.add_acknowledgement_section(
            _('Forked from'),
            ['Eye and Mouse Extended https://extensions.gnome.org/extension/3139/eye-extended/']
        );
        //#endregion

        this.connect('activated', () => this.aboutWindow.present(this));
    }
});
//#endregion
