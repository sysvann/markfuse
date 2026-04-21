/**
 * @file Format registry for MarkFuse.
 * Copyright (c) 2026 blestvann
 * Author: blestvann <blestvann@gmail.com>
 * SPDX-License-Identifier: MIT
 */
const { extractPdf } = require('./pdf/extractor');
const { extractDocx } = require('./docx/extractor');
const { extractDoc } = require('./doc/extractor');

const extractors = {
  '.pdf': extractPdf,
  '.docx': extractDocx,
  '.doc': extractDoc
};

module.exports = { extractors };
