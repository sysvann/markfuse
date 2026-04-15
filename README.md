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

## Planned Format Support

- PDF
- DOCX
- DOC
- XLSX
- OCR for images and scanned documents

## Status

MarkFuse is in early development.

The first public version will focus on high-quality Markdown conversion for core document formats, with OCR and more advanced format support added incrementally.

## Philosophy

MarkFuse is AI-first, but not AI-dependent.

It aims to produce deterministic, structured Markdown that works well before any downstream LLM processing.

## Installation

Coming soon.

## CLI

Coming soon.

Expected usage:

```bash
markfuse convert file.pdf
markfuse convert report.docx
markfuse convert sheet.xlsx
```

## Website

Project site: https://markfuse.slog.im


## License

MIT
