# Contributing to Eye on Cursor

First off, thank you for taking the time to contribute to this project! ❤️

## Reporting Bugs & Opening Issues

If you want to **report a bug**, **ask a question**, or **offer a suggestion**, feel free to [submit an issue][issues].

## Submitting Fixes or Features

You can [submit a merge request][merge-requests] to provide **fixes**, **additional features**, or **translations**. If you have two unrelated fixes, please open two separate requests.

## Getting Started

If you are working on this project for the first time, here are some things to know.

### Using `make`

The `Makefile` in this project contains commands for packaging, installing and testing the extension, as well as ensuring code quality and style and updating translations. To use them, install the following dependencies:

- `make`
- `jq` to read values from `metadata.json`
- `gettext` to update and check translations
- `npm` to install and run the linter (`ESLint`) and the formatter (`Prettier`)
- on GNOME 49+, `mutter-devkit` to start a nested instance and test things (`mutter-dev-bin` on Debian-based systems)

Some useful commands:

- `make install`: pack and install the extension from source
- `make test`: start a nested GNOME Shell instance after installing the extension from source (GNOME 48 and earlier users should use `make test-legacy`)
- `make prefs`: open the preferences window after installing the extension from source
- `make check`: check code quality and style, and validate schemas and translations
- `make lint-fix` and `make format-fix`: apply automatic fixes for lint and formatting issues

### Translation Guide

Localization is handled by editing the `.po` files in `src/po/`, either manually or with a translation editor such as **[GTranslator][gtranslator]** or **[Poedit][poedit]**.

#### How to help

- Check the `src/po/` folder for your language's file (e.g., `fr.po`).
- If it doesn't exist, you can initialize a new one from the template either with a translation editor, or with the command:

  ```sh
  msginit --input=src/po/eye-on-cursor.pot --locale=<lang> --output-file=src/po/<lang>.po
  ```

- If the `.pot` template is out of date, run `make po-update` to regenerate it and merge the new strings into the existing `.po` files.
- Use `make po-stats` to see the completion of each language.
- To preview your translation, run `make test` and check the strings in the nested session (it uses your system language).
- To be credited in the "About" dialog, put your name in the translation of `translator-credits`, optionally followed by an `<email>` or a URL, one name per line.

### `Shexli` Static Analyzer (Optional)

You can install the **Shexli** static analyzer used by the GNOME extensions website locally.

```sh
python -m venv .venv # create a local python environment in the repo

source .venv/bin/activate # activate it

pip install -U shexli # install Shexli
```

With the `venv` active, you can now run:

```sh
make shexli # or `shexli path_to_zip`
```

## Credits

If you have contributed code, art, design or documentation, feel free to add yourself in the _Credits_ section in `src/lib/prefs/widgets.js`. Translators should use the `translator-credits` string instead (see the [Translation Guide](#translation-guide)).

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
