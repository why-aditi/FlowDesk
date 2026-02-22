let workerConfigured = false;

function configureWorker(pdfjs: typeof import("pdfjs-dist")) {
  if (workerConfigured) return;
  (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } })
    .GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  workerConfigured = true;
}

/**
 * Extracts full text from a PDF file. Client-side only; call from the browser
 * (e.g. Client Components or client-side handlers). Uses pdfjs-dist with a
 * dynamic import so the library runs only in the browser.
 */
type PDFDocumentProxy = import("pdfjs-dist").PDFDocumentProxy;
type PDFDocumentLoadingTask = import("pdfjs-dist").PDFDocumentLoadingTask;

export async function extractTextFromPDF(file: File): Promise<string> {
  let pdf: PDFDocumentProxy | null = null;
  let loadingTask: PDFDocumentLoadingTask | null = null;

  try {
    const pdfjs = await import("pdfjs-dist");
    configureWorker(pdfjs);

    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);

    loadingTask = pdfjs.getDocument(typedArray);
    pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const parts: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const raw = textContent.items
        .map((item: { str?: string; hasEOL?: boolean }) => {
          const str = item.str ?? "";
          const hasEOL = item.hasEOL ?? false;
          return hasEOL ? str + "\n" : str + " ";
        })
        .join("");
      const pageText = raw.replace(/\s+/g, " ").trim();
      parts.push(pageText);
    }

    return parts.join("\n\n");
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to extract text from PDF: ${message}`);
  } finally {
    if (pdf != null) {
      await pdf.destroy();
    } else if (loadingTask != null) {
      await loadingTask.destroy();
    }
  }
}
