/**
 * @file Shared text helpers.
 * Copyright (c) 2026 blestvann
 * Author: blestvann <blestvann@gmail.com>
 * SPDX-License-Identifier: MIT
 */

/**
 * Normalize line endings to LF.
 *
 * @param {string} value - Input text.
 * @returns {string}
 */
function normalizeLineEndings(value) {
  return String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

module.exports = { normalizeLineEndings };
