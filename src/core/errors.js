/**
 * @file Error codes and custom error class for MarkFuse.
 * Copyright (c) 2026 blestvann
 * Author: blestvann <blestvann@gmail.com>
 * SPDX-License-Identifier: MIT
 */
const ErrorCodes = {
  SUCCESS: 0,
  FILE_NOT_FOUND: 1,
  UNSUPPORTED_FORMAT: 2,
  CONVERSION_FAILED: 3,
  OUTPUT_ERROR: 4
};

class MarkFuseError extends Error {

  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'MarkFuseError';
  }
}

function fileNotFound(filePath) {
  return new MarkFuseError(ErrorCodes.FILE_NOT_FOUND, `Input file not found: ${filePath}`);
}

function unsupportedFormat(ext) {
  return new MarkFuseError(
    ErrorCodes.UNSUPPORTED_FORMAT,
    `Unsupported format: ${ext}. Supported formats: .pdf, .docx, .doc`
  );
}

function conversionFailed(detail) {
  return new MarkFuseError(ErrorCodes.CONVERSION_FAILED, `Conversion failed: ${detail}`);
}

function outputError(filePath) {
  return new MarkFuseError(
    ErrorCodes.OUTPUT_ERROR,
    `Cannot write output file: ${filePath}. Check permissions.`
  );
}

module.exports = {
  ErrorCodes,
  MarkFuseError,
  fileNotFound,
  unsupportedFormat,
  conversionFailed,
  outputError
};
