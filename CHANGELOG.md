# Changelog

## 2026-10-28

API version 1.1.0: HTML rendering and image uploads.

- The Python and TypeScript agents send a PNG, JPG or TIFF through `documents.upload` and an HTML
  file through `documents.create(html=...)`.
- The TypeScript agent installs the client from its GitHub repository until the package is on npm.
- The curl notes name the upload content types and the `html` input.
