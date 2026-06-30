import { createRequire } from "node:module"
import { createCanvas, type Canvas, type SKRSContext2D } from "@napi-rs/canvas"

/**
 * Server-side PDF page rasteriser (kundeavis pre-render). Uses pdfjs-dist v4 (the
 * app's direct dep) + @napi-rs/canvas, both imported STATICALLY here so Vercel's
 * file tracer ships the native canvas binary in the function. (The old approach
 * via `pdf-to-img` loaded canvas dynamically — the tracer missed it, so on Vercel
 * it failed with "Cannot find module '@napi-rs/canvas'" → "DOMMatrix is not
 * defined".) Returns JPEG buffers, ready to upload. Best-effort: callers treat a
 * throw / empty result as "fall back to client-side PDF rendering".
 */

interface CanvasAndContext {
  canvas: Canvas
  context: SKRSContext2D
}

class NodeCanvasFactory {
  create(width: number, height: number): CanvasAndContext {
    const canvas = createCanvas(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)))
    return { canvas, context: canvas.getContext("2d") }
  }
  reset(cc: CanvasAndContext, width: number, height: number): void {
    cc.canvas.width = Math.max(1, Math.ceil(width))
    cc.canvas.height = Math.max(1, Math.ceil(height))
  }
  destroy(cc: CanvasAndContext): void {
    cc.canvas.width = 0
    cc.canvas.height = 0
  }
}

export interface RenderPdfOptions {
  maxPages?: number
  scale?: number
  quality?: number
}

export async function renderPdfPagesToJpeg(
  pdfBytes: Uint8Array,
  opts: RenderPdfOptions = {},
): Promise<Buffer[]> {
  const { maxPages = 6, scale = 1.5, quality = 0.82 } = opts

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  try {
    const req = createRequire(import.meta.url)
    pdfjs.GlobalWorkerOptions.workerSrc = req.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")
  } catch {
    /* fall back to the main-thread fake worker */
  }

  const factory = new NodeCanvasFactory()
  const doc = await pdfjs.getDocument({
    data: pdfBytes,
    canvasFactory: factory,
    isEvalSupported: false,
  } as unknown as Parameters<typeof pdfjs.getDocument>[0]).promise

  const out: Buffer[] = []
  const total = Math.min(maxPages, doc.numPages)
  for (let p = 1; p <= total; p++) {
    const page = await doc.getPage(p)
    const viewport = page.getViewport({ scale })
    const cc = factory.create(viewport.width, viewport.height)
    await page.render({
      canvasContext: cc.context,
      viewport,
    } as unknown as Parameters<typeof page.render>[0]).promise
    out.push(cc.canvas.toBuffer("image/jpeg", quality))
  }
  return out
}
