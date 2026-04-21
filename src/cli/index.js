/**
 * @file CLI dispatcher for MarkFuse.
 * Copyright (c) 2026 blestvann
 * Author: blestvann <blestvann@gmail.com>
 * SPDX-License-Identifier: MIT
 */
const { ErrorCodes, SUPPORTED_FORMATS } = require('../index');
const { parseArgs } = require('./args');
const { runConvertCommand } = require('./commands/convert');
const { runFormatsCommand } = require('./commands/formats');
const { runDoctorCommand } = require('./commands/doctor');

/**
 * Build CLI help text.
 *
 * @param {string} version - Package version string.
 * @returns {string}
 */
function buildHelpText(version) {
  return `
markfuse v${version}

Convert PDF/Office documents to high-fidelity Markdown.

Usage:
  markfuse <command> [options]
  markfuse <input> [options]

Commands:
  convert    Convert one document into Markdown
  formats    Print supported file formats
  doctor     Run environment diagnostics

Options:
  -o, --output    Output markdown path (default: same name in same folder)
  -f, --format    Force input format (reserved for future use)
  --version       Show version
  --help          Show help

Supported formats: ${SUPPORTED_FORMATS.join(', ')}

Examples:
  markfuse document.pdf
  markfuse convert document.pdf
  markfuse convert report.docx -o output.md
  markfuse formats
  markfuse doctor
`.trim();
}

/**
 * Run CLI and return process exit code.
 *
 * @param {string[]} argv - Raw argv slice.
 * @param {string} version - Package version string.
 * @returns {Promise<number>}
 */
async function runCli(argv, version) {
  const args = parseArgs(argv);

  if (args.showVersion) {
    console.log(version);
    return ErrorCodes.SUCCESS;
  }

  if (args.showHelp) {
    console.log(buildHelpText(version));
    return ErrorCodes.SUCCESS;
  }

  if (!args.command && args.input) {
    return runConvertCommand(args);
  }

  if (!args.command) {
    console.log(buildHelpText(version));
    return ErrorCodes.SUCCESS;
  }

  if (args.command === 'convert') {
    return runConvertCommand(args);
  }

  if (args.command === 'formats') {
    return runFormatsCommand();
  }

  if (args.command === 'doctor') {
    return runDoctorCommand();
  }

  console.log(buildHelpText(version));
  return ErrorCodes.SUCCESS;
}

module.exports = {
  buildHelpText,
  runCli
};
