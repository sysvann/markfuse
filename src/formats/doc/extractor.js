/**
 * @file Legacy DOC extractor for MarkFuse with plain-text fallback output.
 * Copyright (c) 2026 blestvann
 * Author: blestvann <blestvann@gmail.com>
 * SPDX-License-Identifier: MIT
 *
 * DOC fallback extractor with plain-text output.
 */
const WordExtractor = require('word-extractor');
const fs = require('fs');

/**
 * Extract plain text from a legacy DOC file and write Markdown output.
 *
 * @param {string} inputPath - Path to the .doc source file.
 * @param {string} outputPath - Path to the generated .md file.
 * @returns {Promise<{success: boolean, warning?: string}>}
 */
async function extractDoc(inputPath, outputPath) {
  const extractor = new WordExtractor();
  const doc = await extractor.extract(inputPath);
  const text = doc.getBody();
  const lines = text.split('\n');
  const paragraphs = [];
  let currentParagraph = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
    } else {
      currentParagraph.push(trimmed);
    }
  }

  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(' '));
  }

  const markdown = paragraphs.join('\n\n');
  fs.writeFileSync(outputPath, markdown, 'utf-8');

  return {
    success: true,
    warning: 'Warning: .doc currently supports plain-text extraction only. Convert to .docx for better layout preservation.'
  };
}

module.exports = { extractDoc };
