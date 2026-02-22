const PDFJS_VERSION = "5.4.624";
const WORKER_SRC = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

let workerConfigured = false;

function configureWorker(pdfjs: typeof import("pdfjs-dist")) {
  if (workerConfigured) return;
  (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } })
    .GlobalWorkerOptions.workerSrc = WORKER_SRC;
  workerConfigured = true;
}

/**
 * Extracts full text from a PDF file. Client-side only; call from the browser
 * (e.g. Client Components or client-side handlers). Uses pdfjs-dist with a
 * dynamic import so the library runs only in the browser.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  configureWorker(pdfjs);

  const arrayBuffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(arrayBuffer);

  const loadingTask = pdfjs.getDocument(typedArray);
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const parts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => (item as { str?: string }).str ?? "")
      .join("");
    parts.push(pageText);
  }

  return parts.join("\n\n");
}
