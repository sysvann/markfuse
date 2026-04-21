/**
 * @file Integration test for document conversion.
 * Copyright (c) 2026 blestvann
 * Author: blestvann <blestvann@gmail.com>
 * SPDX-License-Identifier: MIT
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { convert, isSupported } = require('../../src/index');

const TMP_DIR = path.join(__dirname, '..', '..', '.tmp', 'test-output');

function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
}

function cleanup(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

test('convert rejects unsupported format', async () => {
  // Use package.json as a real file with unsupported extension
  const unsupported = path.join(__dirname, '..', '..', 'package.json');
  await assert.rejects(
    () => convert(unsupported),
    (err) => err.code === 2
  );
});

test('convert rejects missing file', async () => {
  await assert.rejects(
    () => convert('nonexistent.pdf'),
    (err) => err.code === 1
  );
});

test('convert DOCX produces markdown output', async () => {
  const fixture = path.join(__dirname, '..', 'fixtures', 'sample.docx');
  if (!fs.existsSync(fixture)) {
    return; // skip if fixture not available
  }

  ensureTmpDir();
  const outputPath = path.join(TMP_DIR, 'sample.md');
  cleanup(outputPath);

  const result = await convert(fixture, outputPath);

  assert.equal(result.success, true);
  assert.equal(fs.existsSync(outputPath), true);

  const content = fs.readFileSync(outputPath, 'utf-8');
  assert.ok(content.length > 0, 'Output should not be empty');

  cleanup(outputPath);
});

test('convert PDF produces markdown output', async () => {
  const fixture = path.join(__dirname, '..', 'fixtures', 'sample.pdf');
  if (!fs.existsSync(fixture)) {
    return; // skip if fixture not available
  }

  ensureTmpDir();
  const outputPath = path.join(TMP_DIR, 'sample-pdf.md');
  cleanup(outputPath);

  const result = await convert(fixture, outputPath);

  assert.equal(result.success, true);
  assert.equal(fs.existsSync(outputPath), true);

  const content = fs.readFileSync(outputPath, 'utf-8');
  assert.ok(content.length > 0, 'Output should not be empty');

  cleanup(outputPath);
});
