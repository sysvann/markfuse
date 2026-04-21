/**
 * @file DOCX extractor for MarkFuse based on Mammoth + custom HTML-to-Markdown mapping.
 * Copyright (c) 2026 blestvann
 * Author: blestvann <blestvann@gmail.com>
 * SPDX-License-Identifier: MIT
 *
 * DOCX conversion using mammoth convertToHtml + custom HTML-to-Markdown mapping.
 * 
 * This pipeline preserves tables and ordered lists better than direct convertToMarkdown
 * and avoids over-escaping in generated Markdown.
 */
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

/**
 * Convert a DOCX document to Markdown using Mammoth HTML output.
 *
 * @param {string} inputPath - Path to the .docx source file.
 * @param {string} outputPath - Path to the generated .md file.
 * @returns {Promise<{success: boolean, images?: number}>}
 */
async function extractDocx(inputPath, outputPath) {
  const outputDir = path.dirname(outputPath);
  const baseName = path.basename(outputPath, '.md');
  const imagesDir = path.join(outputDir, `${baseName}_images`);

  let imageIndex = 0;
  let imagesCreated = false;

  const convertImage = (element) => {
    return element.read('base64').then((imageData) => {
      const ext = getImageExtension(element.contentType);
      imageIndex++;
      const imageName = `image_${imageIndex}${ext}`;

      if (!imagesCreated) {
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true });
        }
        imagesCreated = true;
      }

      const imagePath = path.join(imagesDir, imageName);
      fs.writeFileSync(imagePath, Buffer.from(imageData, 'base64'));

      const relativePath = `${baseName}_images/${imageName}`;
      return { src: relativePath };
    });
  };

  const options = {
    path: inputPath,
    convertImage: mammoth.images.imgElement(convertImage),
    styleMap: [
      "p[style-name='List Paragraph'] => p:fresh"
    ]
  };
  const result = await mammoth.convertToHtml(options);
  const markdown = htmlToMarkdown(result.value);
  fs.writeFileSync(outputPath, markdown, 'utf-8');

  return {
    success: true,
    images: imageIndex
  };
}

// HTML-to-Markdown conversion pipeline.
function htmlToMarkdown(html) {
  if (!html || !html.trim()) return '';
  html = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const lines = [];
  const blocks = splitIntoBlocks(html);

  for (const block of blocks) {
    const converted = convertBlock(block);
    if (converted !== null) {
      lines.push(converted);
    }
  }
  let result = lines.join('\n\n');
  result = result.replace(/\n{3,}/g, '\n\n').trim() + '\n';
  return result;
}

const BLOCK_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'table', 'blockquote'];
const BLOCK_OPEN_PATTERNS = Object.fromEntries(
  BLOCK_TAGS.map(tag => [tag, new RegExp(`<${tag}(\\s[^>]*)?>`, 'i')])
);

function splitIntoBlocks(html) {
  const blocks = [];
  let pos = 0;

  while (pos < html.length) {
    let earliest = -1;
    let earliestTag = null;
    let earliestMatchLen = 0;

    for (const tag of BLOCK_TAGS) {
      const sub = html.substring(pos);
      const m = sub.match(BLOCK_OPEN_PATTERNS[tag]);
      if (m) {
        const idx = pos + m.index;
        if (earliest === -1 || idx < earliest) {
          earliest = idx;
          earliestTag = tag;
          earliestMatchLen = m[0].length;
        }
      }
    }

    if (earliest === -1) break;
    const contentStart = earliest + earliestMatchLen;
    const closePos = findMatchingClose(html, earliestTag, contentStart);

    if (closePos === -1) {
      pos = contentStart;
      continue;
    }

    const blockEnd = closePos + earliestTag.length + 3; // `</tag>`.length
    blocks.push({
      tag: earliestTag.toLowerCase(),
      html: html.substring(earliest, blockEnd)
    });
    pos = blockEnd;
  }

  return blocks;
}

function convertBlock(block) {
  switch (block.tag) {
    case 'h1': return '# ' + extractInlineContent(stripTag(block.html, 'h1'));
    case 'h2': return '## ' + extractInlineContent(stripTag(block.html, 'h2'));
    case 'h3': return '### ' + extractInlineContent(stripTag(block.html, 'h3'));
    case 'h4': return '#### ' + extractInlineContent(stripTag(block.html, 'h4'));
    case 'h5': return '##### ' + extractInlineContent(stripTag(block.html, 'h5'));
    case 'h6': return '###### ' + extractInlineContent(stripTag(block.html, 'h6'));
    case 'p': return convertParagraph(block.html);
    case 'ul': return convertList(block.html, 'ul');
    case 'ol': return convertList(block.html, 'ol');
    case 'table': return convertTable(block.html);
    case 'blockquote': return convertBlockquote(block.html);
    default: return extractInlineContent(block.html);
  }
}

function convertParagraph(html) {
  const inner = stripTag(html, 'p');
  const content = extractInlineContent(inner);
  return content || null;
}

function convertList(html, type) {
  const items = parseListItems(html, type, 0);
  return items.join('\n');
}

function findMatchingClose(html, tag, startFrom) {
  const openTag = `<${tag}`;
  const closeTag = `</${tag}>`;
  let depth = 0;
  let pos = startFrom;

  while (pos < html.length) {
    const nextOpen = html.indexOf(openTag, pos);
    const nextClose = html.indexOf(closeTag, pos);

    if (nextClose === -1) return -1;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + openTag.length;
    } else {
      if (depth === 0) {
        return nextClose;
      }
      depth--;
      pos = nextClose + closeTag.length;
    }
  }
  return -1;
}

function parseListItems(html, parentType, depth) {
  const results = [];
  const indent = '  '.repeat(depth);
  let searchPos = 0;
  let itemIndex = 0;

  while (searchPos < html.length) {
    const liStart = html.indexOf('<li>', searchPos);
    if (liStart === -1) break;

    const contentStart = liStart + 4; // '<li>'.length
    const liClosePos = findMatchingClose(html, 'li', contentStart);
    if (liClosePos === -1) break;

    const liContent = html.substring(contentStart, liClosePos);
    searchPos = liClosePos + 5; // '</li>'.length
    itemIndex++;
    let nestedListHtml = null;
    let nestedListType = null;
    const ulPos = liContent.indexOf('<ul>');
    const olPos = liContent.indexOf('<ol>');

    let nestedPos = -1;
    if (ulPos !== -1 && (olPos === -1 || ulPos < olPos)) {
      nestedPos = ulPos;
      nestedListType = 'ul';
    } else if (olPos !== -1) {
      nestedPos = olPos;
      nestedListType = 'ol';
    }

    let textContent;
    if (nestedPos !== -1 && nestedListType) {
      textContent = liContent.substring(0, nestedPos).trim();
      const nestedClosePos = findMatchingClose(liContent, nestedListType, nestedPos + nestedListType.length + 2);
      if (nestedClosePos !== -1) {
        nestedListHtml = liContent.substring(nestedPos, nestedClosePos + nestedListType.length + 3);
      }
    } else {
      textContent = liContent.trim();
    }

    const text = extractInlineContent(textContent);
    const prefix = parentType === 'ol' ? `${itemIndex}.` : '-';
    results.push(`${indent}${prefix} ${text}`);
    if (nestedListHtml && nestedListType) {
      const nested = parseListItems(nestedListHtml, nestedListType, depth + 1);
      results.push(...nested);
    }
  }

  return results;
}

function convertTable(html) {
  const rows = [];
  const trPattern = /<tr>([\s\S]*?)<\/tr>/gi;
  let trMatch;

  while ((trMatch = trPattern.exec(html)) !== null) {
    const cells = [];
    const cellPattern = /<(?:td|th)(?:\s[^>]*)?>([\s\S]*?)<\/(?:td|th)>/gi;
    let cellMatch;

    while ((cellMatch = cellPattern.exec(trMatch[1])) !== null) {
      let cellContent = cellMatch[1]
        .replace(/<p>([\s\S]*?)<\/p>/gi, '$1')
        .trim();
      cells.push(extractInlineContent(cellContent));
    }
    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return null;
  const maxCols = Math.max(...rows.map(r => r.length));
  const normalizedRows = rows.map(row => {
    while (row.length < maxCols) row.push('');
    return row;
  });
  const lines = [];
  lines.push('| ' + normalizedRows[0].join(' | ') + ' |');
  lines.push('| ' + normalizedRows[0].map(() => '---').join(' | ') + ' |');
  for (let i = 1; i < normalizedRows.length; i++) {
    lines.push('| ' + normalizedRows[i].join(' | ') + ' |');
  }

  return lines.join('\n');
}

function convertBlockquote(html) {
  const inner = stripTag(html, 'blockquote');
  const blocks = splitIntoBlocks(inner);
  if (blocks.length > 0) {
    return blocks.map(b => '> ' + convertBlock(b)).join('\n> \n');
  }
  const text = extractInlineContent(inner);
  return '> ' + text;
}

function extractInlineContent(html) {
  if (!html) return '';

  let text = html;
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // <strong> → **text**
  text = text.replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**');

  // <em> → *text*
  text = text.replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*');

  // <s> / <del> → ~~text~~
  text = text.replace(/<(?:s|del)>([\s\S]*?)<\/(?:s|del)>/gi, '~~$1~~');
  text = text.replace(/<u>([\s\S]*?)<\/u>/gi, '$1');
  text = text.replace(/<sup>([\s\S]*?)<\/sup>/gi, '$1');
  text = text.replace(/<sub>([\s\S]*?)<\/sub>/gi, '$1');

  // <a href="url">text</a> → [text](url)
  text = text.replace(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // <img src="url" alt="text"/> → ![text](url)
  text = text.replace(/<img\s+src="([^"]*)"(?:\s+alt="([^"]*)")?[^>]*\/?>/gi, (_, src, alt) => {
    return `![${alt || ''}](${src})`;
  });

  // <code> → `text`
  text = text.replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`');
  text = text.replace(/<[^>]+>/g, '');
  text = decodeHtmlEntities(text);

  return text.trim();
}

function stripTag(html, tag) {
  const pattern = new RegExp(`^<${tag}(?:\\s[^>]*)?>([\\s\\S]*)<\\/${tag}>$`, 'i');
  const match = html.match(pattern);
  return match ? match[1] : html;
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function getImageExtension(contentType) {
  const map = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/bmp': '.bmp',
    'image/webp': '.webp',
    'image/svg+xml': '.svg'
  };
  return map[contentType] || '.png';
}

module.exports = { extractDocx };
