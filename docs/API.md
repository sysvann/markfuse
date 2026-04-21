# API Reference

## `convert(inputPath, outputPath?)`

Converts a supported document into Markdown.

**Parameters:**

- `inputPath` (string) — Path to the source document (.pdf, .docx, or .doc).
- `outputPath` (string, optional) — Output Markdown file path. Defaults to the same directory and name with `.md` extension.

**Returns:** `Promise<object>`

```js
{
  success: true,
  outputPath: '/absolute/path/to/output.md',
  warning: 'optional warning string',  // only for .doc fallback
  pages: 5,    // PDF only
  images: 2    // PDF only
}
```

**Errors:**

Throws `MarkFuseError` with one of the following codes:

| Code | Meaning |
|------|---------|
| 1 | FILE_NOT_FOUND — input file does not exist |
| 2 | UNSUPPORTED_FORMAT — file extension not supported |
| 3 | CONVERSION_FAILED — extraction error |
| 4 | OUTPUT_ERROR — cannot write to output path |

**Example:**

```js
const markfuse = require('markfuse');

try {
  const result = await markfuse.convert('report.pdf', 'output/report.md');
  console.log(result.outputPath);
} catch (err) {
  console.error(err.code, err.message);
}
```

## `isSupported(filePath)`

Check whether a file path has a supported extension.

**Parameters:**

- `filePath` (string) — File path or name to check.

**Returns:** `boolean`

```js
markfuse.isSupported('doc.pdf');   // true
markfuse.isSupported('img.png');   // false
```

## `getSupportedFormats()`

Returns a copy of the supported extension list.

**Returns:** `string[]`

```js
markfuse.getSupportedFormats();  // ['.pdf', '.docx', '.doc']
```

## `ErrorCodes`

Enum object for error code constants:

```js
const { ErrorCodes } = require('markfuse');
// ErrorCodes.SUCCESS === 0
// ErrorCodes.FILE_NOT_FOUND === 1
// ErrorCodes.UNSUPPORTED_FORMAT === 2
// ErrorCodes.CONVERSION_FAILED === 3
// ErrorCodes.OUTPUT_ERROR === 4
```

## `MarkFuseError`

Custom error class extending `Error`. Instances have a `.code` property matching `ErrorCodes`.
