# Contributing to Eye on Cursor

First off, thank you for taking the time to contribute to this project! ❤️

## Reporting Bugs & Opening Issues

If you want to **report a bug**, **ask a question**, or **offer a suggestion**, feel free to [submit an issue][issues].

## Submitting Fixes or Features

You can [submit a merge request][merge-requests] to provide **fixes**, **additional features**, or **translations**. If you have two unrelated fixes, please open two separate requests.

### Translation Guide

Localization is handled by editing the `.po` files in `src/po/`, either manually or with a translation editor such as **[GTranslator][gtranslator]** or **[Poedit][poedit]**.

#### How to help

- Check the `po/` folder for your language's file (e.g., `fr.po`).
- If it doesn't exist, you can initialize a new one from the `eye-on-cursor.pot` template.

#### Testing

You can test your translations by running `make install` to package and install the extension, then logging out and back in to see how the strings look in your system language.

## Getting Started

If you are working on this project for the first time, here are steps to set up your environment.

### Using `Makefile`

The `Makefile` contains commands for packaging, installing and testing the extension. To use them, install the following dependencies:

- `make`
- `gettext` to update the `pot` file
- `npm` to install and run `ESLint`
- for running tests on GNOME 49+:
  - `mutter-devkit` on Fedora-based systems
  - `mutter-dev-bin` on Debian-based systems

You can list the commands from the `Makefile` with `make usage`.

### Install the `ESLint` linter

This extension follows GNOME's code conventions and comes with an **ESLint** configuration file to keep code conformant. To use it, run:

```sh
npm install # installs the development packages listed in `package.json`
```

You can then run `ESlint` with:

```sh
make lint # or `npm run lint`
```

### Install the `Shexli` Static Analyzer

You can install the **Shexli** static analyzer locally to catch common packaging and review issues early.

```sh
python -m venv .venv # create a local python environment in the repo

source .venv/bin/activate # activate it

pip install -U shexli # install Shexli
```

You can then run it with:

```sh
make shexli # or `shexli path_to_zip`
```

## Credits

If you have contributed in any way, feel free to add yourself to the corresponding section in `src/prefsModules/about.js`.

## Resources

- [GNOME Shell Extensions Guide][extensions-guide]
- [GNOME Developer Documentation][dev-doc]
- [GNOME Shell Repository][shell-repo]

[issues]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/issues
[merge-requests]: https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/-/merge_requests
[extensions-guide]: https://gjs.guide/extensions/
[dev-doc]: https://developer.gnome.org/documentation/index.html
[shell-repo]: https://gitlab.gnome.org/GNOME/gnome-shell#gnome-shell
[poedit]: https://flathub.org/apps/net.poedit.Poedit
[gtranslator]: https://flathub.org/en/apps/org.gnome.Gtranslator
