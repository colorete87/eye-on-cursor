# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog][keep-a-changelog],
and this project adheres to [Semantic Versioning][semver].

<!--
Types of changes:

- 'Added'        for new features.
- 'Changed'      for changes in existing functionality.
- 'Deprecated'   for soon-to-be removed features.
- 'Removed'      for now removed features.
- 'Fixed'        for any bug fixes.
- 'Security'     in case of vulnerabilities.

The 'release' and 'deploy' stages in `.gitlab-ci.yml` are triggered by pushing a version tag.
'release' creates a gitlab release and 'deploy' submits the extension zip file to
extensions.gnome.org (requires confirmation on gitlab).
The release description is pulled from the tag message. When ready, use the following command
to create the release version tag with the information from this file.

```
bash tools/make_version_tag.sh
```
-->

## [Unreleased]

## [3.0.3]

### Fixed

- use Adwaita Slate as fallback color

## [3.0.2] - 2026-07-03

### Added

- Per-eye configuration (position, appearance)
- Custom colors for sclera and pupil
- **Click** and **Synced Random** blink modes
- Support for accent color from custom themes

### Changed

- Some default settings and value ranges

## [2.4.1] - 2026-05-11

### Added

- Reset settings buttons

### Changed

- Switching to 'rgb(r,g,b)' color model
- Optimized eye drawing cycle
- Optimized tracker shape files
- Reduced default eye refresh rate to 24 fps
- Increased max blink interval to one hour

### Fixed

- Fixed tracker briefly appearing at out-of-date location when being re-enabled
- Fixed blinking animation not ending with eyelids completely opened

## [2.2.1] - 2026-03-24

### Added

- GNOME 50 support

## [2.1.1] - 2025-11-20

### Added

- More translations

### Fixed

- Fixed tracker not updating when changing shape or color

## [2.1.0] - 2025-10-25

### Added

- Accent color support for the tracker

## [2.0.0] - 2025-10-22

### Added

- GNOME 48 support
- New tracker shapes
- New Dropdown menu with icons for shape selection
- **Enable eyes** setting

### Changed

- Accent color now applies to the iris in outline mode

## [1.4.0] - 2025-02-15

### Changed

- Minimum eye count lowered to 0
- Minimum tracker size lowered to 16

## [1.3.2] - 2025-02-09

### Added

- GNOME 48 support
- Donation options

## [1.3.1] - 2024-08-28

### Added

- **Blink** feature

### Changed

- **Eyelid** shape label to **Natural**
- Reduced Max refresh rate

### Fixed

- Eyes now immediately switch to the tracker color

## [1.2.1] - 2024-08-02

### Fixed

- Eye object IDs are now sequential instead of random for compatibility with external programs

## [1.2.0] - 2024-08-02

### Added

- GNOME 47 support
- Accent color support
- Spanish translation

### Changed

- Prefs window default size
- **Submenu** setting label to **Interactivity**

## [1.1.1] - 2024-06-05

### Added

- **Outline** mode
- **Comic** eye shape
- French translation

### Changed

- **Refresh interval** option with **Refresh rate**

### Fixed

- Click animation
- Tracker now stays above UI elements
- Tracker now immediately appears at the current mouse position upon being enabled

## [1.0.1] - 2024-05-26

### Added

- GNOME 45 and 46 Support
- Multiple eye creation
- Option for eye menu
- Custom Iris color
- Keyboard shortcut for tracker

### Changed

- Trackers list
- Prefs window and settings list

### Removed

- Unsuited tracker shapes

### Fixed

- Centered trackers

## [0.0.1] - 2024-05-13

Forked from [Eye and Mouse Extended][eye-and-mouse-extended] by [Alexey Lovchikov][alexey-lovchikov].

[unreleased]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/compare/v3.0.3...HEAD
[3.0.3]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/compare/v3.0.2...v3.0.3
[3.0.2]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/compare/v2.4.1...v3.0.2
[2.4.1]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/compare/v2.2.1...v2.4.1
[2.2.1]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/compare/v2.1.1...v2.2.1
[2.1.1]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/compare/v2.1.0...v2.1.1
[2.1.0]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/compare/v2.0.0...v2.1.0
[2.0.0]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/compare/v1.4.0...v2.0.0
[1.4.0]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/compare/v1.3.2...v1.4.0
[1.3.2]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/compare/v1.3.1...v1.3.2
[1.3.1]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/compare/v1.2.1...v1.3.1
[1.2.1]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/compare/v1.2.0...v1.2.1
[1.2.0]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/compare/v1.1.1...v1.2.0
[1.1.1]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/compare/v1.0.1...v1.1.1
[1.0.1]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/compare/v0.0.1...v1.0.1
[0.0.1]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/tags/v0.0.1
[keep-a-changelog]: https://keepachangelog.com/en/1.1.0/
[semver]: https://semver.org/spec/v2.0.0.html
[eye-and-mouse-extended]: https://extensions.gnome.org/extension/3139/eye-extended/
[alexey-lovchikov]: https://github.com/alexeylovchikov
