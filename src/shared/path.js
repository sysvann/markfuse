/**
 * @file Shared path helpers.
 * Copyright (c) 2026 blestvann
 * Author: blestvann <blestvann@gmail.com>
 * SPDX-License-Identifier: MIT
 */
const path = require('path');

/**
 * Replace source extension with `.md`.
 *
 * @param {string} inputPath - Input file path.
 * @returns {string}
 */
function toMarkdownPath(inputPath) {
  return inputPath.replace(/\.(pdf|docx?)$/i, '.md');
}

module.exports = { toMarkdownPath, path };
