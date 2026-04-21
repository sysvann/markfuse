[English](./README.md) | [简体中文](./README.zh-CN.md)

# MarkFuse

High-fidelity document-to-Markdown conversion for AI workflows.

MarkFuse turns PDFs, Office documents, and scanned files into clean, readable Markdown with better structure preservation than generic converters.

Built for RAG, knowledge ingestion, and long-form document workflows.
Also designed for direct use in Markdown note apps, without requiring an AI layer.

## Why MarkFuse

Most document-to-Markdown tools can extract text.

MarkFuse is built to preserve structure.

That means better:

- headings
- paragraphs
- lists
- tables
- code blocks
- task lists
- inline formatting
- readability for humans and LLMs

The goal is not just Markdown output, but Markdown that is actually usable in AI pipelines.

## Goals

- Produce cleaner and more readable Markdown
- Preserve document structure as faithfully as possible
- Work well for LLM ingestion, chunking, retrieval, and agent workflows
- Be directly usable in Markdown note apps for personal and team knowledge management
- Provide an extensible plugin-based architecture for more formats and OCR backends

## Format Support (v0.1.0)

- PDF
- DOCX
- DOC (plain-text fallback)

## Status

MarkFuse `v0.1.0` is available as the first open-source baseline.

Current focus is stable conversion quality for core document formats.
OCR and more advanced format support will be added incrementally.

## Philosophy

MarkFuse is AI-first, but not AI-dependent.

It aims to produce deterministic, structured Markdown that works well before any downstream LLM processing.

## Installation

Requirements:

- Node.js 18 or later

Install from npm:

```bash
npm install -g markfuse
```

Install from source:

```bash
git clone https://github.com/blestvann/markfuse.git
cd markfuse
npm install
npm link
```

Verify installation:

```bash
markfuse --help
markfuse --version
```

## Usage

### CLI

```bash
markfuse file.pdf
markfuse convert file.pdf
markfuse convert report.docx -o report.md
markfuse convert legacy.doc -o legacy.md
markfuse formats
markfuse doctor
```

`markfuse <input-file>` is shorthand for `markfuse convert <input-file>`.

If you run from source without `npm link`:

```bash
node bin/markfuse.js file.pdf
node bin/markfuse.js convert file.pdf
```

### API

```js
const markfuse = require('markfuse');

const result = await markfuse.convert('input.pdf', 'output.md');
console.log(result.outputPath);
```

## Website

Project site: https://markfuse.slog.im


## License

MIT
