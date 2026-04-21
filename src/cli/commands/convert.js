/**
 * @file Convert command for MarkFuse CLI.
 * Copyright (c) 2026 blestvann
 * Author: blestvann <blestvann@gmail.com>
 * SPDX-License-Identifier: MIT
 */
const { convert, ErrorCodes, MarkFuseError } = require('../../index');

/**
 * Handle the `convert` command.
 *
 * @param {{input: string|null, output: string|null}} args - Parsed CLI args.
 * @returns {Promise<number>}
 */
async function runConvertCommand(args) {
  if (!args.input) {
    console.error('Missing input file path.');
    return ErrorCodes.FILE_NOT_FOUND;
  }

  try {
    const result = await convert(args.input, args.output);

    if (result.warning) {
      console.warn(result.warning);
    }

    console.log(`Converted: ${result.outputPath}`);
    return ErrorCodes.SUCCESS;
  } catch (error) {
    if (error instanceof MarkFuseError) {
      console.error(error.message);
      return error.code;
    }

    console.error(`Unexpected error: ${error.message}`);
    return ErrorCodes.CONVERSION_FAILED;
  }
}

module.exports = { runConvertCommand };
