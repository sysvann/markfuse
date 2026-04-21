# MarkFuse Architecture (v0.1.0)

## Directory Layout

- `bin/`: CLI entry (`markfuse`)
- `src/index.js`: public API exports
- `src/cli/`: CLI parser and command handlers
- `src/core/`: conversion orchestration and error model
- `src/formats/`: format-specific extractors (`pdf/docx/doc`)
- `src/shared/`: shared utility helpers
- `test/unit`: unit tests
- `.github/workflows`: CI pipeline

## Conversion Flow

1. CLI/API receives input/output paths.
2. `src/core/converter.js` validates format and output destination.
3. Dispatches through `src/formats/index.js` extractor registry:
   - `src/formats/pdf/extractor.js`: structured PDF to Markdown conversion
   - `src/formats/docx/extractor.js`: Mammoth HTML pipeline to Markdown
   - `src/formats/doc/extractor.js`: plain-text fallback extraction
4. Returns normalized result shape with `outputPath`.
