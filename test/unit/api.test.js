const test = require('node:test');
const assert = require('node:assert/strict');
const { isSupported, getSupportedFormats, ErrorCodes, MarkFuseError } = require('../../src/index');

test('isSupported identifies known extensions', () => {
  assert.equal(isSupported('a.pdf'), true);
  assert.equal(isSupported('a.docx'), true);
  assert.equal(isSupported('a.doc'), true);
  assert.equal(isSupported('a.xlsx'), false);
});

test('getSupportedFormats returns immutable copy', () => {
  const formats = getSupportedFormats();
  assert.deepEqual(formats, ['.pdf', '.docx', '.doc']);

  formats.push('.txt');
  assert.deepEqual(getSupportedFormats(), ['.pdf', '.docx', '.doc']);
});

test('MarkFuseError carries code and message', () => {
  const error = new MarkFuseError(ErrorCodes.OUTPUT_ERROR, 'boom');
  assert.equal(error.code, ErrorCodes.OUTPUT_ERROR);
  assert.equal(error.message, 'boom');
});
