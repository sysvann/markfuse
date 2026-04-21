#!/usr/bin/env node
/**
 * @file CLI entry for MarkFuse.
 * Copyright (c) 2026 blestvann
 * Author: blestvann <blestvann@gmail.com>
 * SPDX-License-Identifier: MIT
 */
const { runCli } = require('../src/cli');
const packageJson = require('../package.json');

async function main() {
  const exitCode = await runCli(process.argv.slice(2), packageJson.version);
  process.exit(exitCode);
}

main();
