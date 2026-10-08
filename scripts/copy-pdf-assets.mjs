import { cp, mkdir } from "node:fs/promises";

// PDF.js assets are served locally; no CDN or document upload is needed.
await mkdir("public/pdf-assets", { recursive: true });
for (const directory of ["cmaps", "standard_fonts", "wasm"]) {
  await cp(
    `node_modules/pdfjs-dist/${directory}`,
    `public/pdf-assets/${directory}`,
    { recursive: true },
  );
}

// Bundle OCR code and language weights too; the runtime never contacts a CDN.
await mkdir("public/ocr-assets/lang", { recursive: true });
await cp(
  "node_modules/tesseract.js/dist/worker.min.js",
  "public/ocr-assets/worker.min.js",
);
for (const variant of ["lstm", "simd-lstm", "relaxedsimd-lstm"]) {
  for (const extension of ["wasm.js", "wasm"]) {
    const name = `tesseract-core-${variant}.${extension}`;
    await cp(
      `node_modules/tesseract.js-core/${name}`,
      `public/ocr-assets/${name}`,
    );
  }
}
for (const language of ["tur", "eng"]) {
  await cp(
    `node_modules/@tesseract.js-data/${language}/4.0.0_best_int/${language}.traineddata.gz`,
    `public/ocr-assets/lang/${language}.traineddata.gz`,
  );
}

await cp(
  "node_modules/tesseract.js-core/LICENSE",
  "public/ocr-assets/Core-LICENSE.txt",
);

await cp(
  "node_modules/tesseract.js/LICENSE.md",
  "public/ocr-assets/Tesseract-LICENSE.txt",
);
