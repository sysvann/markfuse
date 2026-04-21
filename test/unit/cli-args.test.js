const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs } = require('../../src/cli/args');

test('parseArgs handles convert with output', () => {
  const parsed = parseArgs(['convert', 'a.pdf', '-o', 'a.md']);
  assert.equal(parsed.command, 'convert');
  assert.equal(parsed.input, 'a.pdf');
  assert.equal(parsed.output, 'a.md');
});

test('parseArgs handles help and version flags', () => {
  const help = parseArgs(['--help']);
  assert.equal(help.showHelp, true);

  const version = parseArgs(['--version']);
  assert.equal(version.showVersion, true);
});

test('parseArgs handles formats and doctor commands', () => {
  const formats = parseArgs(['formats']);
  assert.equal(formats.command, 'formats');

  const doctor = parseArgs(['doctor']);
  assert.equal(doctor.command, 'doctor');
});

test('parseArgs keeps positional input when no explicit command is provided', () => {
  const parsed = parseArgs(['a.pdf', '-o', 'a.md']);
  assert.equal(parsed.command, null);
  assert.equal(parsed.input, 'a.pdf');
  assert.equal(parsed.output, 'a.md');
});
