/**
 * @file Command-line argument parser for MarkFuse CLI.
 * Copyright (c) 2026 blestvann
 * Author: blestvann <blestvann@gmail.com>
 * SPDX-License-Identifier: MIT
 */
function parseArgs(args) {
  const result = {
    command: null,
    input: null,
    output: null,
    format: null,
    showHelp: false,
    showVersion: false
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.showHelp = true;
    } else if (arg === '--version' || arg === '-v') {
      result.showVersion = true;
    } else if (arg === '-o' || arg === '--output') {
      result.output = args[i + 1];
      i += 1;
    } else if (arg === '-f' || arg === '--format') {
      result.format = args[i + 1];
      i += 1;
    } else if (arg === 'convert' || arg === 'formats' || arg === 'doctor') {
      result.command = arg;
    } else if (!arg.startsWith('-') && !result.input) {
      result.input = arg;
    }
  }

  return result;
}

module.exports = { parseArgs };
