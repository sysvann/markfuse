/**
 * @file Public API exports for MarkFuse.
 * Copyright (c) 2026 blestvann
 * Author: blestvann <blestvann@gmail.com>
 * SPDX-License-Identifier: MIT
 */
const path = require('path');
const { convert, SUPPORTED_FORMATS } = require('./core/converter');
const { ErrorCodes, MarkFuseError } = require('./core/errors');

function isSupported(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_FORMATS.includes(ext);
}

function getSupportedFormats() {
  return [...SUPPORTED_FORMATS];
}

module.exports = {
  convert,
  isSupported,
  getSupportedFormats,
  SUPPORTED_FORMATS,
  ErrorCodes,
  MarkFuseError
};
