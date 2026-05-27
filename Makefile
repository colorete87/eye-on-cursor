# SPDX-FileCopyrightText: 2024-2026 Djinn Alexio
# SPDX-License-Identifier: GPL-3.0-or-later

EXTENSION_NAME := $(shell jq -r '.["gettext-domain"]' src/metadata.json)
EXTENSION_UUID := $(shell jq -r '.uuid' src/metadata.json)
EXTENSION_VERSION := $(shell jq -r '.["version-name"]' src/metadata.json)
PACK_NAME = $(EXTENSION_UUID).shell-extension.zip
COPYRIGHT_HOLDER = 'Djinn Alexio'
ISSUES_URL = https://gitlab.gnome.org/DjinnAlexio/$(EXTENSION_NAME)/-/issues

.PHONY: pack install uninstall enable disable prefs reset pot lint test	test-prefs test-settings \
	shexli usage

.DEFAULT_GOAL := usage

pack:
	# Packing extension into ./$(PACK_NAME)...
	gnome-extensions pack ./src -f --extra-source="../LICENSE" --extra-source="./assets" \
		--extra-source="./extensionModules" --extra-source="./prefsModules"

install: pack
	# Installing extension...
	gnome-extensions install $(PACK_NAME) -f
	# Log out of the session, then back in to use the extension. Enable it if it isn't already.

uninstall:
	# Uninstalling extension...
	gnome-extensions uninstall $(EXTENSION_UUID)

enable:
	# Enabling extension...
	gnome-extensions enable $(EXTENSION_UUID)

disable:
	# Disabling extension...
	gnome-extensions disable $(EXTENSION_UUID)

prefs:
	# Opening the Preferences dialog...
	gnome-extensions prefs $(EXTENSION_UUID)

reset:
	# Resetting extension dconf settings...
	rm -rf ~/.cache/$(EXTENSION_NAME)/
	dconf reset -f /org/gnome/shell/extensions/$(EXTENSION_NAME)/

pot:
	# Updating POT file...
	find src -iname "*.js" | xargs xgettext \
		--output=src/po/$(EXTENSION_NAME).pot \
		--from-code=UTF-8 \
		--package-name=$(EXTENSION_NAME)  \
		--package-version=$(EXTENSION_VERSION)  \
		--copyright-holder=$(COPYRIGHT_HOLDER) \
		--msgid-bugs-address=$(ISSUES_URL)

lint:
	# Running ESLint...
	npm run lint:fix

test: install
	# Launching a nested instance of GNOME Shell...
	bash ./tools/run_nested_shell.sh

test-prefs: install prefs
	# Monitoring Preferences window:
	journalctl -f -o cat /usr/bin/gjs

test-settings: install prefs
	# Monitoring dconf value changes:
	dconf watch /org/gnome/shell/extensions/$(EXTENSION_NAME)/

shexli: pack
	# submitting extension to Shexli reviewer:
	shexli $(PACK_NAME)

usage:
	# Usage : make <command>
	#
	# Commands:
	#   pack                    Pack the extension into a zip file
	#   install                 Pack and install the extension (default)
	#   uninstall               Uninstall the extension
	#   enable                  Enable the extension
	#   disable                 Disable the extension
	#   prefs                   Open the Preferences dialog
	#   reset                   Reset extension dconf settings
	#   pot                     Update the POT translation file
	#   lint                    Run ESLint
	#   test                    Install and launch a nested GNOME Shell instance
	#   test-prefs              Install, open Prefs, and monitor the window
	#   test-settings           Install, open Prefs, and monitor dconf value changes
	#   shexli                  Pack and run the Shexli analyzer
