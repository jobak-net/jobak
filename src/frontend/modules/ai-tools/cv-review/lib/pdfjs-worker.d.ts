/**
 * pdf.js's worker module, imported for its side effect only: it sets
 * `globalThis.pdfjsWorker`, so pdf.js runs in the page (`read-cv-file.ts`).
 * The package ships no typings for it.
 */
declare module "pdfjs-dist/legacy/build/pdf.worker.min.mjs";
