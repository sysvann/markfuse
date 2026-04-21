/**
 * @file Core conversion dispatcher for MarkFuse.
 * Copyright (c) 2026 blestvann
 * Author: blestvann <blestvann@gmail.com>
 * SPDX-License-Identifier: MIT
 */
const path = require('path');
const fs = require('fs');
const { extractors } = require('../formats');
const { ensureDir } = require('../shared/fs');
const {
  fileNotFound,
  unsupportedFormat,
  outputError,
  conversionFailed
} = require('./errors');
const SUPPORTED_FORMATS = Object.keys(extractors);

/**
 * Convert a supported document into Markdown.
 *
 * @param {string} inputPath - Path to the source document.
 * @param {string} [outputPath] - Optional output markdown path.
 * @returns {Promise<{success: boolean, outputPath: string, warning?: string}>}
 */
async function convert(inputPath, outputPath) {
  const resolvedInputPath = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInputPath)) {
    throw fileNotFound(resolvedInputPath);
  }

  const ext = path.extname(resolvedInputPath).toLowerCase();
  if (!SUPPORTED_FORMATS.includes(ext)) {
    throw unsupportedFormat(ext);
  }
  if (!outputPath) {
    outputPath = resolvedInputPath.replace(/\.(pdf|docx?)$/i, '.md');
  } else {
    outputPath = path.resolve(outputPath);
  }
  const outputDir = path.dirname(outputPath);
  try {
    ensureDir(outputDir);
  } catch {
    throw outputError(outputPath);
  }
  let result;
  const extractor = extractors[ext];
  try {
    result = await extractor(resolvedInputPath, outputPath);
  } catch (error) {
    if (error && error.code) {
      throw error;
    }
    throw conversionFailed(error && error.message ? error.message : 'unknown error');
  }

  return {
    ...result,
    outputPath
  };
}

module.exports = { convert, SUPPORTED_FORMATS };
