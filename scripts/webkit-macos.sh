#!/bin/sh
# Preserve Playwright's pinned launcher/default args; only suppress native AppKit
# window animations, which can block its worker pool while the display sleeps.
# https://github.com/microsoft/playwright/issues/42385
set -eu
exec "${OURFORM_PINNED_WEBKIT_EXECUTABLE:?Pinned WebKit executable is required}" "$@" -NSAutomaticWindowAnimationsEnabled NO
