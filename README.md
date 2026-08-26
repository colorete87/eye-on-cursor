<div align="center">

# Eye on Cursor

![Logo][logo]

**Let your desktop "keep an eye" on your mouse!**

[![Latest Release][badge-release]][latest-release]
[![Supported GNOME Versions: 46 to 50][badge-shell]][ego-page]
[![EGO Downloads][badge-downloads]][ego-page]
[![GNOME JavaScript][badge-gjs]][charts]
[![Pipeline status][badge-pipeline]][pipelines]
</div>

## Overview

**Eye on Cursor** is a fun and practical extension that gives your panel eyes that constantly follow your mouse. This quirky feature, combined with a highly customizable mouse tracker that highlights clicks, makes it easier than ever to monitor your mouse movements, ensuring your pointer gets all the attention it needs.

### Features

- **Eyes Follow Cursor:** As many eyes as you want in the panel to follow the cursor movements, providing a fun and interactive experience.
- **Customizable Mouse Tracker:** Highlights clicks and tracks mouse movements with customizable settings to fit your preferences.

<div align="center">

![Tracking][tracking] ![Biblically accurate][biblical]

![Tracker][tracker] ![Comic][comic] ![Blue Eyes][blue-eyes] ![Round][round]
</div>

## Installation

### From the GNOME Extensions Website (recommended)

[![EGO page][ego-button]][ego-page]

### From the Repository

> [!NOTE]
> If installed from the repository, the extension will not receive automatic updates from the GNOME Extensions Website. Check the [Changelog][changelog] to track changes between versions.

#### Option 1: Latest Release

Download and install the latest release:

```bash
curl -LO https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/releases/permalink/latest/downloads/eye-on-cursor.shell-extension.zip
gnome-extensions install -f eye-on-cursor.shell-extension.zip
```

#### Option 2: Source

Build from source:

```bash
git clone https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor.git
cd eye-on-cursor
make install
```

#### Enable

After installing the package, log out and back in, then enable the extension via **Extension Manager** or run:

```bash
gnome-extensions enable eye-on-cursor@djinnalexio.github.io
```

## Contributing

[Click here to submit an issue][issues]. For more, see [CONTRIBUTING.md][contributing].

### Known Issues

On **Wayland**, mouse clicks within application windows are not registered. Only clicks in the Shell (background, panel, etc.) are highlighted.

## License

GNU General Public License v3.0 or later. See [LICENSE][license].

## Acknowledgements

This extension is forked from [Eye and Mouse Extended][eye-and-mouse-extended] by [Alexey Lovchikov][alexey-lovchikov].

[logo]: ./src/assets/eye-on-cursor-logo.svg
[tracking]: ./images/tracking.gif
[biblical]: ./images/biblicallyAccurate.png
[tracker]: ./images/tracker.png
[comic]: ./images/comic.png
[blue-eyes]: ./images/blueEyes.png
[round]: ./images/round.png
[ego-button]: ./images/get-it-on-ego.svg
[license]: ./LICENSE
[changelog]: ./CHANGELOG.md
[contributing]: ./CONTRIBUTING.md
[latest-release]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/releases/permalink/latest
[ego-page]: https://extensions.gnome.org/extension/7036/eye-on-cursor/
[charts]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/graphs/main/charts
[pipelines]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/pipelines?ref=main
[badge-release]: https://img.shields.io/gitlab/v/release/39179?gitlab_url=https://gitlab.gnome.org&logo=git&color=e01b24
[badge-shell]: https://img.shields.io/badge/GNOME-46_--_50-3584e4?logo=gnome
[badge-downloads]: https://img.shields.io/gnome-extensions/dt/eye-on-cursor%40djinnalexio.github.io?logo=gnome&color=3584e4
[badge-gjs]: ./images/gjs-badge.svg
[badge-pipeline]: https://img.shields.io/gitlab/pipeline-status/DjinnAlexio/eye-on-cursor?gitlab_url=https://gitlab.gnome.org&branch=main&logo=gitlab
[issues]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/issues
[eye-and-mouse-extended]: https://extensions.gnome.org/extension/3139/eye-extended/
[alexey-lovchikov]: https://github.com/alexeylovchikov
