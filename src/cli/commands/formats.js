/**
 * @file Formats command for MarkFuse CLI.
 * Copyright (c) 2026 blestvann
 * Author: blestvann <blestvann@gmail.com>
 * SPDX-License-Identifier: MIT
 */
const { SUPPORTED_FORMATS, ErrorCodes } = require('../../index');

/**
 * Print supported formats.
 *
 * @returns {number}
 */
function runFormatsCommand() {
  console.log(SUPPORTED_FORMATS.join('\n'));
  return ErrorCodes.SUCCESS;
}

module.exports = { runFormatsCommand };
