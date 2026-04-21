/**
 * @file Doctor command for MarkFuse CLI.
 * Copyright (c) 2026 blestvann
 * Author: blestvann <blestvann@gmail.com>
 * SPDX-License-Identifier: MIT
 */
const { ErrorCodes } = require('../../index');

/**
 * Run basic runtime diagnostics.
 *
 * @returns {number}
 */
function runDoctorCommand() {
  const checks = [
    `node: ${process.version}`,
    'pdfjs-dist: installed',
    'mammoth: installed',
    'word-extractor: installed'
  ];

  let sharpStatus = 'sharp: not installed (optional)';
  try {
    require.resolve('sharp');
    sharpStatus = 'sharp: installed (optional)';
  } catch {
    sharpStatus = 'sharp: not installed (optional)';
  }

  checks.push(sharpStatus);
  console.log(checks.join('\n'));
  return ErrorCodes.SUCCESS;
}

module.exports = { runDoctorCommand };
