import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { PageViewport, PDFDocumentProxy, RenderTask } from "pdfjs-dist";

import { TextOverlay } from "./TextOverlay";

interface Props {
  pdf: PDFDocumentProxy;
  page: number;
  width: number;
  rotation?: number;
  thumbnail?: boolean;
  query?: string;
  occurrence?: number;
  displayPage?: number;
  renderOverlay?: (viewport: PageViewport) => ReactNode;
}

export function PdfCanvas({
  pdf,
  page,
  width,
  rotation = 0,
  thumbnail = false,
  query = "",
  occurrence = 0,
  displayPage = page,
  renderOverlay,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!thumbnail);
  const [error, setError] = useState(false);
  const [renderedPdf, setRenderedPdf] = useState<PDFDocumentProxy | null>(null);
  const [textViewport, setTextViewport] = useState<PageViewport | null>(null);
  const layout = useRef({ displayPage, width, rotation });

  useEffect(() => {
    if (!thumbnail || !hostRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150px" },
    );
    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, [thumbnail]);

  useEffect(() => {
    if (!visible) return;
    // Source-content previews keep the same coordinates. Preserve mounted
    // gesture controls while their underlying canvas is being repainted.
    if (
      layout.current.displayPage !== displayPage ||
      layout.current.width !== width ||
      layout.current.rotation !== rotation
    )
      setTextViewport(null);
    layout.current = { displayPage, width, rotation };
    let cancelled = false;
    let renderTask: RenderTask | undefined;
    setError(false);
    async function render() {
      try {
        const pdfPage = await pdf.getPage(page);
        if (cancelled || !canvasRef.current) return;
        const degrees = (pdfPage.rotate + rotation) % 360;
        const base = pdfPage.getViewport({ scale: 1, rotation: degrees });
        const scale = width / base.width;
        const ratio = Math.min(
          window.devicePixelRatio || 1,
          2,
          Math.sqrt(12_000_000 / (width * base.height * scale)),
        );
        const viewport = pdfPage.getViewport({
          scale: scale * ratio,
          rotation: degrees,
        });
        // Separate backing canvas prevents overlapping tasks during fast zoom changes.
        const backing = window.document.createElement("canvas");
        backing.width = Math.ceil(viewport.width);
        backing.height = Math.ceil(viewport.height);
        renderTask = pdfPage.render({ canvas: backing, viewport });
        await renderTask.promise;
        if (cancelled || !canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = backing.width;
        canvas.height = backing.height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${base.height * scale}px`;
        canvas.getContext("2d")?.drawImage(backing, 0, 0);
        setTextViewport(pdfPage.getViewport({ scale, rotation: degrees }));
        setRenderedPdf(pdf);
      } catch (cause) {
        if (
          !cancelled &&
          !(
            cause instanceof Error &&
            cause.name === "RenderingCancelledException"
          )
        )
          setError(true);
      }
    }
    void render();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, page, width, rotation, visible, displayPage]);

  return (
    <div
      ref={hostRef}
      className={`pdf-canvas ${thumbnail ? "thumbnail-canvas" : ""}`}
      style={{ width }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${displayPage}. sayfanın ${thumbnail ? "küçük resmi" : "önizlemesi"}`}
      />
      {!thumbnail && textViewport && (
        <TextOverlay
          pdf={pdf}
          page={page}
          viewport={textViewport}
          query={query}
          occurrence={occurrence}
        />
      )}
      {textViewport && (
        <div
          className="pdf-overlay-stack"
          style={{ visibility: renderedPdf === pdf ? undefined : "hidden" }}
        >
          {renderOverlay?.(textViewport)}
        </div>
      )}
      {error && <span className="canvas-error">Sayfa gösterilemedi.</span>}
    </div>
  );
}
