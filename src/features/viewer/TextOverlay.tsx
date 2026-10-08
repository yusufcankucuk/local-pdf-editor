import { useEffect, useRef } from "react";
import { TextLayer } from "pdfjs-dist";
import type { PageViewport, PDFDocumentProxy } from "pdfjs-dist";
import { findTextMatches } from "../search/search";
import "./text-layer.css";

export function TextOverlay({
  pdf,
  page,
  viewport,
  query,
  occurrence,
}: {
  pdf: PDFDocumentProxy;
  page: number;
  viewport: PageViewport;
  query: string;
  occurrence: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    let cancelled = false;
    let layer: TextLayer | undefined;
    container.replaceChildren();
    container.style.setProperty("--total-scale-factor", String(viewport.scale));
    async function render() {
      try {
        const pdfPage = await pdf.getPage(page);
        const text = await pdfPage.getTextContent();
        if (cancelled || !container) return;
        layer = new TextLayer({ textContentSource: text, container, viewport });
        await layer.render();
        if (cancelled) return;
        const matches = findTextMatches(layer.textContentItemsStr, query);
        for (let run = 0; run < layer.textDivs.length; run++) {
          const portions = matches.filter((match) => match.run === run);
          if (!portions.length) continue;
          const div = layer.textDivs[run];
          const value = layer.textContentItemsStr[run];
          const content = window.document.createDocumentFragment();
          let offset = 0;
          for (const match of portions) {
            content.append(
              window.document.createTextNode(value.slice(offset, match.start)),
            );
            const mark = window.document.createElement("mark");
            mark.className = `search-highlight ${match.occurrence === occurrence ? "search-current" : ""}`;
            mark.textContent = value.slice(match.start, match.end);
            content.append(mark);
            offset = match.end;
          }
          content.append(window.document.createTextNode(value.slice(offset)));
          div.replaceChildren(content);
        }
        container
          .querySelector(".search-current")
          ?.scrollIntoView({ block: "nearest", inline: "nearest" });
      } catch {
        // Image-only or malformed text content must not interrupt the canvas preview.
        if (!cancelled) container?.replaceChildren();
      }
    }
    void render();
    return () => {
      cancelled = true;
      layer?.cancel();
      container.replaceChildren();
    };
  }, [pdf, page, viewport, query, occurrence]);
  return (
    <div
      ref={ref}
      className="textLayer"
      aria-label={`${page}. sayfanın metni`}
    />
  );
}
