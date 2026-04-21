/**
 * @file Shared filesystem helpers.
 * Copyright (c) 2026 blestvann
 * Author: blestvann <blestvann@gmail.com>
 * SPDX-License-Identifier: MIT
 */
const fs = require('fs');

/**
 * Ensure the directory exists.
 *
 * @param {string} dirPath - Directory path.
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

module.exports = { ensureDir };
