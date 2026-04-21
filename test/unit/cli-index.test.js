const test = require('node:test');
const assert = require('node:assert/strict');
const { runCli, buildHelpText } = require('../../src/cli');
const { ErrorCodes } = require('../../src/index');

test('buildHelpText includes shorthand input usage', () => {
  const help = buildHelpText('0.1.0');
  assert.match(help, /markfuse <input> \[options\]/);
});

test('runCli treats positional input as convert command', async () => {
  const originalError = console.error;
  console.error = () => {};

  try {
    const code = await runCli(['missing-file.pdf'], '0.1.0');
    assert.equal(code, ErrorCodes.FILE_NOT_FOUND);
  } finally {
    console.error = originalError;
  }
});

test('runCli without command or input prints help and exits success', async () => {
  const originalLog = console.log;
  console.log = () => {};

  try {
    const code = await runCli([], '0.1.0');
    assert.equal(code, ErrorCodes.SUCCESS);
  } finally {
    console.log = originalLog;
  }
});
