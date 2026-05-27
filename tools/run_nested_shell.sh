#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Djinn Alexio
# SPDX-License-Identifier: GPL-3.0-or-later
set -euo pipefail

export G_MESSAGES_DEBUG='GNOME Shell'
export SHELL_DEBUG='all'

clear

if (( $(gnome-shell --version | awk '{print int($3)}') >= 49 )); then
    exec dbus-run-session gnome-shell --devkit
else
    export MUTTER_DEBUG_DUMMY_MODE_SPECS='960x540'
    exec dbus-run-session gnome-shell --nested
fi

sleep 1
echo
