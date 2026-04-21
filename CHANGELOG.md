# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-04-15

### Added
- Initial `markfuse` open-source package structure.
- Public API: `convert`, `isSupported`, `getSupportedFormats`.
- CLI command: `markfuse convert <input> [-o <output>]`.
- Conversion support for `.pdf`, `.docx`, and `.doc`.
- Basic automated tests for API and CLI argument parsing.
- 1.0-oriented directory scaffolding for `formats`, `ocr`, `plugins`, `shared`, and CI workflow.
- CLI commands: `markfuse formats` and `markfuse doctor`.
- Test layout scaffold: `test/unit`, `test/integration`, `test/fixtures`, and `test/snapshots`.

### Changed
- Moved format extractors from `src/extractors/` to `src/formats/{pdf,docx,doc}/`.
- Updated conversion dispatch to use `src/formats/index.js` registry.
- Refactored CLI entry to `src/cli/index.js` with command handlers in `src/cli/commands/`.
