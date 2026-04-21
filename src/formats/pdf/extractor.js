/**
 * @file PDF extractor and advanced Markdown converter for MarkFuse.
 * Copyright (c) 2026 blestvann
 * Author: blestvann <blestvann@gmail.com>
 * SPDX-License-Identifier: MIT
 *
 * PDF parser and advanced Markdown converter v2.
 * Supports headings, quotes, rules, lists, task lists, tables, code blocks, inline styles, and image extraction.
 */
const fs = require('fs');
const path = require('path');

let pdfjsLib = null;
let sharp = null;
let _sharpLoaded = false;

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsLib;
}

async function getSharp() {
  if (!_sharpLoaded) {
    _sharpLoaded = true;
    try {
      sharp = (await import('sharp')).default;
    } catch {
      sharp = null;
    }
  }
  return sharp;
}

class TextItem {

  constructor(item, viewport, styles) {
    this.text = item.str || '';
    this.x = Math.round(item.transform[4]);
    this.y = Math.round(viewport.height - item.transform[5]);
    this.width = item.width || 0;
    this.height = item.height || 0;
    this.fontSize = Math.abs(item.transform[0]) || 12;
    this.fontName = item.fontName || '';
    this.hasEOL = item.hasEOL || false;
    
    const style = styles[this.fontName] || {};
    this.fontFamily = style.fontFamily || 'sans-serif';
    this.isMonospace = this.fontFamily === 'monospace';
    this.isBold = /bold|black|heavy/i.test(this.fontName);
    this.isItalic = /italic|oblique/i.test(this.fontName);
  }
}

class Line {

  constructor(y) {
    this.y = y;
    this.items = [];
    this.hasGraphicMarker = false;
    this.graphicMarkerType = null;
  }
  
  addItem(item) {
    this.items.push(item);
  }
  
  sort() {
    this.items.sort((a, b) => a.x - b.x);
  }
  
  get text() {
    return this.items.map(i => i.text).join('');
  }
  
  get textWithoutEmpty() {
    return this.items.filter(i => i.text.trim()).map(i => i.text).join('');
  }
  
  get fontSize() {
    const validItems = this.items.filter(i => i.text.trim());
    if (validItems.length === 0) return 12;
    return Math.max(...validItems.map(i => i.fontSize));
  }
  
  get minX() {
    const validItems = this.items.filter(i => i.text.trim());
    if (validItems.length === 0) return 0;
    return Math.min(...validItems.map(i => i.x));
  }
  
  get maxX() {
    if (this.items.length === 0) return 0;
    return Math.max(...this.items.map(i => i.x + i.width));
  }
  
  get isMonospace() {
    const validItems = this.items.filter(i => i.text.trim());
    if (validItems.length === 0) return false;
    let monoChars = 0;
    let totalChars = 0;
    for (const item of validItems) {
      const len = item.text.length;
      totalChars += len;
      if (item.isMonospace) {
        monoChars += len;
      }
    }
    return totalChars > 0 && (monoChars / totalChars) >= 0.7;
  }
  
  get hasMonospace() {
    return this.items.some(i => i.isMonospace && i.text.trim());
  }

  get hasLeadingEmptyItem() {
    if (this.items.length < 2) return false;
    const first = this.items[0];
    return first.text === '' && first.width === 0;
  }
}

class GraphicMarkerDetector {

  constructor(viewport) {
    this.viewport = viewport;
    this.markers = [];
  }
  
  async analyze(page) {
    const pdfjs = await getPdfjs();
    const OPS = pdfjs.OPS;
    const opList = await page.getOperatorList();
    
    let currentTransform = [1, 0, 0, 1, 0, 0];
    const transformStack = [];
    
    for (let i = 0; i < opList.fnArray.length; i++) {
      const op = opList.fnArray[i];
      const args = opList.argsArray[i];
      
      if (op === OPS.save) {
        transformStack.push([...currentTransform]);
      } else if (op === OPS.restore) {
        if (transformStack.length > 0) {
          currentTransform = transformStack.pop();
        }
      } else if (op === OPS.transform) {
        currentTransform = this.multiplyTransform(currentTransform, args);
      } else if (op === OPS.constructPath) {
        this.analyzePath(args, currentTransform, i);
      }
    }
    const uniqueMarkers = [];
    for (const marker of this.markers) {
      const exists = uniqueMarkers.some(m => 
        Math.abs(m.x - marker.x) < 5 && Math.abs(m.y - marker.y) < 5
      );
      if (!exists) {
        uniqueMarkers.push(marker);
      }
    }
    
    return uniqueMarkers;
  }
  
  multiplyTransform(t1, t2) {
    return [
      t1[0] * t2[0] + t1[2] * t2[1],
      t1[1] * t2[0] + t1[3] * t2[1],
      t1[0] * t2[2] + t1[2] * t2[3],
      t1[1] * t2[2] + t1[3] * t2[3],
      t1[0] * t2[4] + t1[2] * t2[5] + t1[4],
      t1[1] * t2[4] + t1[3] * t2[5] + t1[5]
    ];
  }

  transformPoint(x, y, transform) {
    return {
      x: transform[0] * x + transform[2] * y + transform[4],
      y: transform[1] * x + transform[3] * y + transform[5]
    };
  }
  
  analyzePath(args, transform, opIndex) {
    if (!args || args.length < 3) return;
    
    const pathType = args[0];
    const pathData = args[1];
    const bbox = args[2];
    
    if (!bbox || typeof bbox !== 'object') return;
    const minX = bbox[0] || bbox['0'];
    const minY = bbox[1] || bbox['1'];
    const maxX = bbox[2] || bbox['2'];
    const maxY = bbox[3] || bbox['3'];
    
    if (minX === undefined || minY === undefined || maxX === undefined || maxY === undefined) return;
    const corners = [
      this.transformPoint(minX, minY, transform),
      this.transformPoint(maxX, minY, transform),
      this.transformPoint(minX, maxY, transform),
      this.transformPoint(maxX, maxY, transform)
    ];
    let tMinX = Infinity, tMinY = Infinity, tMaxX = -Infinity, tMaxY = -Infinity;
    for (const c of corners) {
      tMinX = Math.min(tMinX, c.x);
      tMaxX = Math.max(tMaxX, c.x);
      tMinY = Math.min(tMinY, c.y);
      tMaxY = Math.max(tMaxY, c.y);
    }
    
    const width = tMaxX - tMinX;
    const height = Math.abs(tMaxY - tMinY);
    const centerX = (tMinX + tMaxX) / 2;
    const centerY = this.viewport.height - (tMinY + tMaxY) / 2;
    if (width > 8 && width < 50 && height > 8 && height < 50 && Math.abs(width - height) < 10) {
      if (pathType === 22 || pathType === 28 || pathType === 20) {
        const hasCheckmark = this.hasCheckmarkInPath(pathData, pathType);
        
        this.markers.push({
          type: hasCheckmark ? 'checkbox-checked' : 'checkbox-unchecked',
          x: Math.round(centerX),
          y: Math.round(centerY),
          width: Math.round(width),
          height: Math.round(height),
          pathType
        });
      }
    }
    if (width > 3 && width < 10 && height > 3 && height < 10 && Math.abs(width - height) < 3) {
      if (pathType === 22) {
        this.markers.push({
          type: 'bullet',
          x: Math.round(centerX),
          y: Math.round(centerY),
          width: Math.round(width),
          height: Math.round(height),
          pathType
        });
      }
    }
  }
  
  countPathPoints(pathData) {
    let count = 0;
    for (const item of pathData) {
      if (typeof item === 'object' && item !== null) {
        count += Object.keys(item).length / 2;
      }
    }
    return count;
  }
  
  hasCheckmarkInPath(pathData, pathType) {
    if (pathType === 20) return true;
    return false;
  }
}

class PageAnalyzer {

  constructor(pageWidth, pageHeight) {
    this.pageWidth = pageWidth;
    this.pageHeight = pageHeight;
    this.lines = [];
    this.baseFontSize = 12;
    this.baseIndent = 15;
    this.graphicMarkers = [];
    this.links = [];
  }
  
  addTextItem(item) {
    let line = this.lines.find(l => Math.abs(l.y - item.y) <= 3);
    if (!line) {
      line = new Line(item.y);
      this.lines.push(line);
    }
    line.addItem(item);
  }
  
  setGraphicMarkers(markers) {
    this.graphicMarkers = markers;
  }
  
  setLinks(links) {
    this.links = links;
  }
  
  analyze() {
    this.lines.sort((a, b) => a.y - b.y);
    this.lines.forEach(l => l.sort());
    const fontSizes = {};
    for (const line of this.lines) {
      for (const item of line.items) {
        if (!item.text.trim()) continue;
        const size = Math.round(item.fontSize);
        fontSizes[size] = (fontSizes[size] || 0) + 1;
      }
    }
    
    let maxCount = 0;
    for (const [size, count] of Object.entries(fontSizes)) {
      if (count > maxCount) {
        maxCount = count;
        this.baseFontSize = parseInt(size);
      }
    }
    for (const marker of this.graphicMarkers) {
      const line = this.lines.find(l => Math.abs(l.y - marker.y) <= 8);
      if (line) {
        line.hasGraphicMarker = true;
        line.graphicMarkerType = marker.type;
      }
    }
  }
}

class MarkdownConverter {

  constructor() {
    this.baseFontSize = 12;
  }
  
  detectHeadingLevel(fontSize) {
    const ratio = fontSize / this.baseFontSize;
    if (ratio >= 1.9) return 1;
    if (ratio >= 1.5) return 2;
    if (ratio >= 1.3) return 3;
    return 0;
  }

  detectListType(line, baseIndent, context = {}) {
    const text = line.textWithoutEmpty.trim();
    const lineX = line.minX;
    const xOffset = lineX - baseIndent;
    const indent = Math.max(0, Math.floor((xOffset - 20) / 24));
    const orderedMatch = text.match(/^(\d+)\.\s*(.*)$/);
    if (orderedMatch) {
      return { type: 'ordered', indent, number: parseInt(orderedMatch[1]), content: orderedMatch[2] };
    }
    const unorderedMatch = text.match(/^[-*•●○]\s+(.*)$/);
    if (unorderedMatch) {
      return { type: 'unordered', indent, content: unorderedMatch[1] };
    }
    const taskMatch = text.match(/^(?:\[([x ])\]|[☐☑✓✗□■])\s*(.*)$/i);
    if (taskMatch) {
      const checked = taskMatch[1] ? taskMatch[1].toLowerCase() === 'x' : 
                      (text.startsWith('☑') || text.startsWith('✓') || text.startsWith('■'));
      return { type: 'task', indent, checked, content: taskMatch[2] || '' };
    }
    if (line.hasGraphicMarker) {
      if (line.graphicMarkerType === 'checkbox-checked') {
        return { type: 'task', indent, checked: true, content: text };
      } else if (line.graphicMarkerType === 'checkbox-unchecked') {
        return { type: 'task', indent, checked: false, content: text };
      } else if (line.graphicMarkerType === 'bullet') {
        return { type: 'unordered', indent, content: text };
      }
    }
    if (line.hasLeadingEmptyItem && xOffset >= 20) {
      if (context.prevListType === 'task' && Math.abs(lineX - context.prevIndent) < 10) {
        return { type: 'task', indent, checked: false, content: text };
      }
      if (context.prevListType === 'unordered' && Math.abs(lineX - context.prevIndent) < 10) {
        return { type: 'unordered', indent, content: text };
      }
    }
    
    return null;
  }
  
  detectBlockquote(text) {
    const match = text.match(/^>\s*(.*)$/);
    if (match) return match[1];
    if (text.match(/^[💡📝⚠️ℹ️🔔📌🚨✨🎯💭🔍📢]\s*/)) return text;
    return null;
  }
  
  isHorizontalRule(text) {
    const trimmed = text.trim();
    return /^[-_*]{3,}$/.test(trimmed) || /^[─━═]{3,}$/.test(trimmed);
  }

  detectTableRegion(lines, startIndex) {
    if (startIndex >= lines.length) return null;
    
    const line = lines[startIndex];
    const items = line.items.filter(i => i.text.trim());
    
    if (items.length < 2) return null;
    
    const getColumnPositions = (lineItems) => {
      const positions = [];
      let lastEnd = -1000;
      
      for (const item of lineItems) {
        if (!item.text.trim()) continue;
        if (item.x - lastEnd > 30) {
          positions.push(item.x);
        }
        lastEnd = item.x + item.width;
      }
      return positions;
    };
    
    const basePositions = getColumnPositions(items);
    if (basePositions.length < 2) return null;
    
    const tableRows = [{ line, positions: basePositions }];
    
    for (let i = startIndex + 1; i < lines.length; i++) {
      const nextLine = lines[i];
      const nextItems = nextLine.items.filter(it => it.text.trim());
      if (nextItems.length < 2) break;
      
      const nextPositions = getColumnPositions(nextItems);
      if (nextPositions.length < 2) break;
      
      let aligned = 0;
      for (const pos of basePositions) {
        if (nextPositions.some(np => Math.abs(np - pos) < 25)) {
          aligned++;
        }
      }
      
      if (aligned >= 2) {
        tableRows.push({ line: nextLine, positions: nextPositions });
      } else {
        break;
      }
    }
    
    if (tableRows.length < 2) return null;
    const allPositions = new Set();
    for (const row of tableRows) {
      row.positions.forEach(p => {
        let merged = false;
        for (const existing of allPositions) {
          if (Math.abs(existing - p) < 25) {
            merged = true;
            break;
          }
        }
        if (!merged) allPositions.add(p);
      });
    }
    
    const sortedPositions = [...allPositions].sort((a, b) => a - b);
    
    const extractRowData = (lineItems, colPositions) => {
      const validItems = lineItems.filter(i => i.text.trim());
      const cells = new Array(colPositions.length).fill('');
      
      for (const item of validItems) {
        let colIdx = 0;
        for (let i = 0; i < colPositions.length; i++) {
          if (i === colPositions.length - 1 || item.x < (colPositions[i] + colPositions[i + 1]) / 2) {
            colIdx = i;
            break;
          }
          if (item.x >= colPositions[i]) {
            colIdx = i;
          }
        }
        cells[colIdx] = (cells[colIdx] + ' ' + item.text).trim();
      }
      
      return cells;
    };
    
    const data = tableRows.map(row => extractRowData(row.line.items, sortedPositions));
    
    return {
      rowCount: tableRows.length,
      data
    };
  }

  detectCodeBlockRegion(lines, startIndex) {
    if (startIndex >= lines.length) return null;
    
    const line = lines[startIndex];
    if (!line.isMonospace) return null;
    
    const codeLines = [];
    let endIndex = startIndex;
    for (let i = startIndex; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine.isMonospace) break;
      
      codeLines.push({
        text: currentLine.text,
        y: currentLine.y,
        indent: currentLine.minX
      });
      endIndex = i;
    }
    
    if (codeLines.length === 0) return null;
    const blocks = [];
    let currentBlock = { lines: [], lang: '' };
    let prevY = codeLines[0].y;
    let currentLang = '';
    
    for (let i = 0; i < codeLines.length; i++) {
      const codeLine = codeLines[i];
      const text = codeLine.text.trim();
      const langComment = this.detectLanguageComment(text);
      const yGap = codeLine.y - prevY;
      const isNewLangBlock = langComment && langComment !== currentLang;
      const isPageBreak = yGap > 500 || yGap < -100;
      const isNewBlock = i > 0 && isNewLangBlock && !isPageBreak;
      
      if (isNewBlock && currentBlock.lines.length > 0) {
        blocks.push(currentBlock);
        currentBlock = { lines: [], lang: '' };
        currentLang = '';
      }
      if (langComment) {
        currentLang = langComment;
        currentBlock.lang = langComment;
      } else if (!currentBlock.lang && !currentLang) {
        const detectedLang = this.detectCodeLanguage(text);
        if (detectedLang) {
          currentLang = detectedLang;
          currentBlock.lang = detectedLang;
        }
      }
      
      currentBlock.lines.push(text);
      prevY = codeLine.y;
    }
    
    if (currentBlock.lines.length > 0) {
      blocks.push(currentBlock);
    }
    
    return {
      endIndex,
      blocks
    };
  }
  
  detectLanguageComment(text) {
    if (text.match(/^\/\/.*JavaScript|^\/\*.*JavaScript/i)) return 'javascript';
    if (text.match(/^#.*Python/i)) return 'python';
    if (text.match(/^\/\/.*TypeScript/i)) return 'typescript';
    if (text.match(/^#.*Ruby/i)) return 'ruby';
    if (text.match(/^\/\/.*Java\b/i)) return 'java';
    if (text.match(/^\/\/.*C\+\+|^\/\/.*cpp/i)) return 'cpp';
    if (text.match(/^\/\/.*Go\b/i)) return 'go';
    if (text.match(/^#.*Bash|^#.*Shell/i)) return 'bash';
    return null;
  }
  
  detectCodeLanguage(text) {
    if (text.match(/^(const|let|var|function|=>|async\s+function)/)) return 'javascript';
    if (text.match(/^(def\s|class\s.*:|import\s.*from|if\s.*:$|for\s.*:$)/)) return 'python';
    if (text.match(/^(interface|type\s+\w+\s*=|:\s*(string|number|boolean))/)) return 'typescript';
    if (text.match(/^(func\s|package\s|import\s*\()/)) return 'go';
    if (text.match(/^(public\s+class|private\s|protected\s)/)) return 'java';
    return '';
  }

  isSameParagraph(line1, line2, baseIndent) {
    if (Math.abs(line1.fontSize - line2.fontSize) > 2) return false;
    if (line1.isMonospace || line2.isMonospace) return false;
    if (Math.abs(line1.minX - line2.minX) > 15) return false;
    const lineHeight = line1.fontSize * 1.5;
    const yGap = line2.y - line1.y;
    if (yGap < 0 || yGap > lineHeight * 2.5) return false;
    const text1 = line1.textWithoutEmpty.trim();
    if (text1.match(/[。？！：.?!:]$/)) return false;
    const text2 = line2.textWithoutEmpty.trim();
    if (text2.match(/^(\d+\.|[-*•●○]|\[[ x]\])/)) return false;
    if (text2.match(/^>/)) return false;
    
    return true;
  }

  detectParagraphRegion(lines, startIndex, baseIndent) {
    if (startIndex >= lines.length) return null;
    
    const firstLine = lines[startIndex];
    const paragraphLines = [firstLine];
    let endIndex = startIndex;
    
    for (let i = startIndex + 1; i < lines.length; i++) {
      const currentLine = lines[i];
      const text = currentLine.textWithoutEmpty.trim();
      
      if (!text) break;
      if (this.detectHeadingLevel(currentLine.fontSize) > 0) break;
      if (currentLine.isMonospace) break;
      if (this.isHorizontalRule(text)) break;
      if (this.detectBlockquote(text)) break;
      if (currentLine.hasGraphicMarker) break;
      if (text.match(/^(\d+\.|[-*•●○]|\[[ x]\])/)) break;
      const prevLine = paragraphLines[paragraphLines.length - 1];
      if (!this.isSameParagraph(prevLine, currentLine, baseIndent)) break;
      
      paragraphLines.push(currentLine);
      endIndex = i;
    }
    
    if (paragraphLines.length === 1) return null;
    
    return {
      lines: paragraphLines,
      endIndex
    };
  }

  convertPage(analyzer, isLastPage = false, headerFooterFilter = null) {
    const lines = analyzer.lines;
    const links = analyzer.links || [];
    const result = [];
    this.baseFontSize = analyzer.baseFontSize;
    
    let skipUntil = -1;
    let listContext = { prevListType: null, prevIndent: 0 };
    
    for (let i = 0; i < lines.length; i++) {
      if (i < skipUntil) continue;
      
      const line = lines[i];
      const text = line.textWithoutEmpty.trim();
      
      if (!text) continue;
      if (headerFooterFilter && headerFooterFilter.detector) {
        const { detector, headerPatterns, footerPatterns } = headerFooterFilter;
        if (detector.shouldFilter(line, headerPatterns, footerPatterns)) {
          continue;
        }
      }
      const headingLevel = this.detectHeadingLevel(line.fontSize);
      if (headingLevel > 0) {
        result.push('');
        const processedText = this.processInlineStyles(line.items, links);
        result.push('#'.repeat(headingLevel) + ' ' + processedText);
        result.push('');
        listContext = { prevListType: null, prevIndent: 0 };
        continue;
      }
      if (line.isMonospace) {
        const codeResult = this.detectCodeBlockRegion(lines, i);
        if (codeResult) {
          for (const block of codeResult.blocks) {
            result.push('```' + (block.lang || ''));
            result.push(...block.lines);
            result.push('```');
            result.push('');
          }
          skipUntil = codeResult.endIndex + 1;
          listContext = { prevListType: null, prevIndent: 0 };
          continue;
        }
      }
      if (this.isHorizontalRule(text)) {
        result.push('');
        result.push('---');
        result.push('');
        listContext = { prevListType: null, prevIndent: 0 };
        continue;
      }
      const blockquote = this.detectBlockquote(text);
      if (blockquote) {
        result.push('');
        result.push('> ' + blockquote);
        result.push('');
        listContext = { prevListType: null, prevIndent: 0 };
        continue;
      }
      const listItem = this.detectListType(line, analyzer.baseIndent, listContext);
      if (listItem) {
        const indent = '  '.repeat(listItem.indent);
        switch (listItem.type) {
          case 'ordered':
            result.push(`${indent}${listItem.number}. ${listItem.content}`);
            break;
          case 'unordered':
            result.push(`${indent}- ${listItem.content}`);
            break;
          case 'task':
            result.push(`${indent}- [${listItem.checked ? 'x' : ' '}] ${listItem.content}`);
            break;
        }
        listContext = { prevListType: listItem.type, prevIndent: line.minX };
        continue;
      }
      if (!listContext.prevListType) {
        const table = this.detectTableRegion(lines, i);
        if (table && table.rowCount >= 2) {
          this.outputTable(table.data, result);
          skipUntil = i + table.rowCount;
          continue;
        }
      }
      const paragraph = this.detectParagraphRegion(lines, i, analyzer.baseIndent);
      if (paragraph) {
        const mergedItems = [];
        for (const pLine of paragraph.lines) {
          mergedItems.push(...pLine.items);
        }
        const processedText = this.processInlineStyles(mergedItems, links);
        result.push(processedText);
        skipUntil = paragraph.endIndex + 1;
        listContext = { prevListType: null, prevIndent: 0 };
        continue;
      }
      const processedText = this.processInlineStyles(line.items, links);
      result.push(processedText);
      listContext = { prevListType: null, prevIndent: 0 };
    }
    
    return result;
  }
  
  processInlineStyles(items, links = []) {
    let result = '';
    let currentStyle = { code: false, bold: false, italic: false };
    let buffer = '';
    let bufferItems = [];
    
    const flushBuffer = (newStyle) => {
      if (!buffer) {
        bufferItems = [];
        return;
      }
      
      let text = buffer;
      const linkUrl = this.findLinkForItems(bufferItems, links);
      if (currentStyle.code) {
        text = '`' + text.trim() + '`';
      } else {
        if (currentStyle.bold && currentStyle.italic) {
          text = '***' + text.trim() + '***';
        } else if (currentStyle.bold) {
          text = '**' + text.trim() + '**';
        } else if (currentStyle.italic) {
          text = '*' + text.trim() + '*';
        }
      }
      if (linkUrl && !currentStyle.code) {
        text = `[${text.trim()}](${linkUrl})`;
      }
      
      result += text;
      buffer = '';
      bufferItems = [];
    };
    
    for (const item of items) {
      const text = item.text;
      if (!text) continue;
      const itemStyle = {
        code: item.isMonospace,
        bold: item.isBold && !item.isMonospace,
        italic: item.isItalic && !item.isMonospace
      };
      const styleChanged = 
        itemStyle.code !== currentStyle.code ||
        itemStyle.bold !== currentStyle.bold ||
        itemStyle.italic !== currentStyle.italic;
      
      if (styleChanged) {
        flushBuffer(itemStyle);
        currentStyle = itemStyle;
      }
      
      buffer += text;
      bufferItems.push(item);
    }
    flushBuffer({ code: false, bold: false, italic: false });
    result = this.convertUrlsToLinks(result);
    
    return result;
  }

  findLinkForItems(items, links) {
    if (!items.length || !links.length) return null;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const item of items) {
      minX = Math.min(minX, item.x);
      maxX = Math.max(maxX, item.x + item.width);
      minY = Math.min(minY, item.y);
      maxY = Math.max(maxY, item.y + item.height);
    }
    for (const link of links) {
      const overlapX = minX < link.x2 + 5 && maxX > link.x1 - 5;
      const overlapY = minY < link.y2 + 5 && maxY > link.y1 - 5;
      
      if (overlapX && overlapY) {
        return link.url;
      }
    }
    
    return null;
  }

  convertUrlsToLinks(text) {
    const urlPattern = /(?<!\[.*?\]\()(?<!\()(https?:\/\/[^\s\)\]]+)/g;
    
    return text.replace(urlPattern, (url) => {
      let cleanUrl = url;
      const trailingPunct = /[.,;:!?。，；：！？]+$/;
      const match = cleanUrl.match(trailingPunct);
      let trailing = '';
      if (match) {
        trailing = match[0];
        cleanUrl = cleanUrl.slice(0, -trailing.length);
      }
      
      return `[${cleanUrl}](${cleanUrl})${trailing}`;
    });
  }
  
  outputTable(tableData, result) {
    if (tableData.length === 0) return;
    
    const maxCols = Math.max(...tableData.map(row => row.length));
    const normalizedRows = tableData.map(row => {
      while (row.length < maxCols) row.push('');
      return row.map(cell => (cell || '').trim());
    });
    
    result.push('');
    result.push('| ' + normalizedRows[0].join(' | ') + ' |');
    result.push('| ' + normalizedRows[0].map(() => '---').join(' | ') + ' |');
    
    for (let i = 1; i < normalizedRows.length; i++) {
      result.push('| ' + normalizedRows[i].join(' | ') + ' |');
    }
    
    result.push('');
  }
}

class LinkExtractor {

  constructor(viewport) {
    this.viewport = viewport;
  }
  
  async extractLinks(page) {
    const links = [];
    
    try {
      const annotations = await page.getAnnotations();
      
      for (const annot of annotations) {
        if (annot.subtype === 'Link' && annot.url) {
          const rect = annot.rect;
          if (rect && rect.length === 4) {
            const x1 = rect[0];
            const y1 = this.viewport.height - rect[3];
            const x2 = rect[2];
            const y2 = this.viewport.height - rect[1];
            
            links.push({
              url: annot.url,
              x1: Math.round(x1),
              y1: Math.round(y1),
              x2: Math.round(x2),
              y2: Math.round(y2)
            });
          }
        }
      }
    } catch (err) {
    }
    
    return links;
  }
}

class ImageExtractor {

  constructor(outputDir, baseName) {
    this.outputDir = outputDir;
    this.baseName = baseName;
    this.imageCount = 0;
    this.assetsDir = path.join(outputDir, 'assets', baseName);
  }
  
  async ensureAssetsDir() {
    if (!fs.existsSync(this.assetsDir)) {
      fs.mkdirSync(this.assetsDir, { recursive: true });
    }
  }
  
  async extractImages(page, pageNum) {
    const images = [];
    const sharpLib = await getSharp();
    
    if (!sharpLib) {
      return images;
    }
    
    try {
      const opList = await page.getOperatorList();
      const pdfjs = await getPdfjs();
      const OPS = pdfjs.OPS;
      
      for (let i = 0; i < opList.fnArray.length; i++) {
        const op = opList.fnArray[i];
        
        if (op === OPS.paintImageXObject || op === OPS.paintJpegXObject) {
          const imgName = opList.argsArray[i][0];
          
          try {
            const img = await page.objs.get(imgName);
            
            if (img && img.data && img.width && img.height) {
              await this.ensureAssetsDir();
              
              this.imageCount++;
              const imgFileName = `image_${pageNum}_${this.imageCount}.png`;
              const imgPath = path.join(this.assetsDir, imgFileName);
              const relativePath = `assets/${this.baseName}/${imgFileName}`;
              
              const saved = await this.saveImageWithSharp(img, imgPath, sharpLib);
              
              if (saved) {
                images.push({
                  path: relativePath,
                  alt: `Image ${this.imageCount} from page ${pageNum}`
                });
              }
            }
          } catch (imgErr) {
          }
        }
      }
    } catch (err) {
    }
    
    return images;
  }
  
  async saveImageWithSharp(img, outputPath, sharpLib) {
    try {
      const { data, width, height } = img;

      const expectedRGBA = width * height * 4;
      const expectedRGB = width * height * 3;
      const expectedGray = width * height;

      let buffer;
      let channels;

      if (data.length === expectedRGBA) {
        buffer = Buffer.from(data);
        channels = 4;
      } else if (data.length === expectedRGB) {
        buffer = Buffer.from(data);
        channels = 3;
      } else if (data.length === expectedGray) {
        buffer = Buffer.from(data);
        channels = 1;
      } else {
        buffer = Buffer.from(data);
        channels = 3;
      }

      await sharpLib(buffer, {
        raw: { width, height, channels }
      }).png().toFile(outputPath);

      return true;
    } catch {
      return false;
    }
  }
}

class HeaderFooterDetector {

  constructor(pageHeight) {
    this.pageHeight = pageHeight;
    this.headerThreshold = pageHeight * 0.08;
    this.footerThreshold = pageHeight * 0.92;
  }

  analyzePages(pageAnalyzers) {
    if (pageAnalyzers.length < 2) {
      return { headerPatterns: [], footerPatterns: [] };
    }

    const headerTexts = [];
    const footerTexts = [];
    for (const { analyzer } of pageAnalyzers) {
      const pageHeaders = [];
      const pageFooters = [];

      for (const line of analyzer.lines) {
        const text = line.textWithoutEmpty.trim();
        if (!text) continue;
        if (line.y < this.headerThreshold) {
          pageHeaders.push({
            text: this.normalizeText(text),
            y: line.y,
            fontSize: line.fontSize
          });
        }
        else if (line.y > this.footerThreshold) {
          pageFooters.push({
            text: this.normalizeText(text),
            y: line.y,
            fontSize: line.fontSize
          });
        }
      }

      headerTexts.push(pageHeaders);
      footerTexts.push(pageFooters);
    }
    const headerPatterns = this.findRepeatingPatterns(headerTexts);
    const footerPatterns = this.findRepeatingPatterns(footerTexts);

    return { headerPatterns, footerPatterns };
  }

  normalizeText(text) {
    if (/^\d+$/.test(text)) return '__PAGE_NUMBER__';
    if (/^(page\s*\d+|\d+\s*\/\s*\d+|\u7B2C\s*\d+\s*\u9875)$/i.test(text)) return '__PAGE_NUMBER__';
    if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/.test(text)) return '__DATE__';
    return text;
  }

  findRepeatingPatterns(pageTexts) {
    const patterns = [];
    const textCounts = new Map();
    for (const pageItems of pageTexts) {
      const seenInPage = new Set();
      for (const item of pageItems) {
        if (!seenInPage.has(item.text)) {
          seenInPage.add(item.text);
          textCounts.set(item.text, (textCounts.get(item.text) || 0) + 1);
        }
      }
    }
    const threshold = Math.max(2, Math.floor(pageTexts.length * 0.5));

    for (const [text, count] of textCounts) {
      if (count >= threshold) {
        patterns.push(text);
      }
    }

    return patterns;
  }

  shouldFilter(line, headerPatterns, footerPatterns) {
    const text = this.normalizeText(line.textWithoutEmpty.trim());
    if (!text) return false;
    if (line.y < this.headerThreshold) {
      if (headerPatterns.includes(text)) return true;
      if (text === '__PAGE_NUMBER__' || text === '__DATE__') return true;
    }
    if (line.y > this.footerThreshold) {
      if (footerPatterns.includes(text)) return true;
      if (text === '__PAGE_NUMBER__' || text === '__DATE__') return true;
    }

    return false;
  }
}

async function extractPdf(inputPath, outputPath) {
  const pdfjs = await getPdfjs();
  
  const data = new Uint8Array(fs.readFileSync(inputPath));
  const doc = await pdfjs.getDocument({ data }).promise;
  
  const converter = new MarkdownConverter();
  const outputDir = path.dirname(outputPath);
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const imageExtractor = new ImageExtractor(outputDir, baseName);
  
  const allResults = [];
  const pageAnalyzers = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    
    const analyzer = new PageAnalyzer(viewport.width, viewport.height);
    const markerDetector = new GraphicMarkerDetector(viewport);
    const markers = await markerDetector.analyze(page);
    analyzer.setGraphicMarkers(markers);
    const linkExtractor = new LinkExtractor(viewport);
    const links = await linkExtractor.extractLinks(page);
    analyzer.setLinks(links);
    
    for (const item of textContent.items) {
      if (item.str !== undefined) {
        const textItem = new TextItem(item, viewport, textContent.styles);
        analyzer.addTextItem(textItem);
      }
    }
    
    analyzer.analyze();
    pageAnalyzers.push({ pageNum, page, analyzer, viewport });
  }
  let headerFooterFilter = null;
  if (pageAnalyzers.length > 0) {
    const firstViewport = pageAnalyzers[0].viewport;
    const hfDetector = new HeaderFooterDetector(firstViewport.height);
    const { headerPatterns, footerPatterns } = hfDetector.analyzePages(pageAnalyzers);
    
    if (headerPatterns.length > 0 || footerPatterns.length > 0) {
      headerFooterFilter = {
        detector: hfDetector,
        headerPatterns,
        footerPatterns
      };
    }
  }
  for (let i = 0; i < pageAnalyzers.length; i++) {
    const { pageNum, page, analyzer } = pageAnalyzers[i];
    const isLastPage = i === pageAnalyzers.length - 1;
    
    const pageResult = converter.convertPage(analyzer, isLastPage, headerFooterFilter);
    allResults.push(...pageResult);
    const images = await imageExtractor.extractImages(page, pageNum);
    for (const img of images) {
      allResults.push('');
      allResults.push(`![${img.alt}](${img.path})`);
    }
    
    if (!isLastPage) {
      allResults.push('');
    }
  }
  const cleanedResults = [];
  let prevEmpty = false;
  for (const line of allResults) {
    const isEmpty = line.trim() === '';
    if (isEmpty && prevEmpty) continue;
    cleanedResults.push(line);
    prevEmpty = isEmpty;
  }
  
  const markdown = cleanedResults.join('\n').trim() + '\n';
  fs.writeFileSync(outputPath, markdown, 'utf-8');
  
  return { 
    success: true,
    pages: doc.numPages,
    images: imageExtractor.imageCount
  };
}

module.exports = { extractPdf };
