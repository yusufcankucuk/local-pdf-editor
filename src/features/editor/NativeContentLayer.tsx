import { useEffect, useRef, useState } from "react";
import type { PageViewport } from "pdfjs-dist";
import type { ContentTarget } from "../../lib/contentTypes";
export function NativeContentLayer({
  targets,
  viewport,
  select,
  quiet = false,
  scanRegion,
  onRegion,
}: {
  targets: ContentTarget[];
  viewport: PageViewport;
  select: (target: ContentTarget) => void;
  quiet?: boolean;
  scanRegion?: ContentTarget;
  onRegion?: (bounds: [number, number, number, number]) => void;
}) {
  const selectingRegion = !!scanRegion || !!onRegion;
  const request = useRef(0);
  useEffect(() => {
    request.current++;
    return () => {
      request.current++;
    };
  }, [scanRegion, viewport]);
  const start = useRef<[number, number] | null>(null);
  const [region, setRegion] = useState<[number, number, number, number] | null>(
    null,
  );
  const [error, setError] = useState("");
  function location(
    event: React.PointerEvent<HTMLDivElement>,
  ): [number, number] {
    const rect = event.currentTarget.getBoundingClientRect();
    return [
      Math.max(0, Math.min(viewport.width, event.clientX - rect.left)),
      Math.max(0, Math.min(viewport.height, event.clientY - rect.top)),
    ];
  }
  async function crop(rect: [number, number, number, number]) {
    const a = viewport.convertToPdfPoint(rect[0], rect[1]),
      b = viewport.convertToPdfPoint(rect[2], rect[3]);
    if (onRegion) {
      const bounds: [number, number, number, number] = [
        Math.min(a[0], b[0]),
        Math.min(a[1], b[1]),
        Math.max(a[0], b[0]),
        Math.max(a[1], b[1]),
      ];
      if (bounds[2] - bounds[0] >= 4 && bounds[3] - bounds[1] >= 4)
        onRegion(bounds);
      return;
    }
    if (!scanRegion || scanRegion.overlay.kind !== "image") return;
    const source = scanRegion.overlay;
    const x = Math.max(source.x, Math.min(a[0], b[0])),
      y = Math.max(source.y, Math.min(a[1], b[1]));
    const width = Math.min(source.x + source.width, Math.max(a[0], b[0])) - x;
    const height = Math.min(source.y + source.height, Math.max(a[1], b[1])) - y;
    if (width < 4 || height < 4) return;
    const generation = ++request.current;
    try {
      const image = new Image();
      image.src = scanRegion.pageRasterData ?? source.data;
      await image.decode();
      const sx = image.naturalWidth / source.width,
        sy = image.naturalHeight / source.height;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(width * sx));
      canvas.height = Math.max(1, Math.ceil(height * sy));
      const context = canvas.getContext("2d");
      if (!context) throw new Error();
      context.drawImage(
        image,
        (x - source.x) * sx,
        (source.y + source.height - y - height) * sy,
        width * sx,
        height * sy,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const id = crypto.randomUUID(),
        bounds: [number, number, number, number] = [
          x,
          y,
          x + width,
          y + height,
        ];
      if (generation !== request.current) return;
      select({
        id,
        bounds,
        removal: { id, kind: "scan", rect: bounds },
        overlay: {
          id,
          kind: "image",
          x,
          y,
          width,
          height,
          data: canvas.toDataURL("image/png"),
        },
      });
    } catch {
      setError("Seçilen görsel alanı hazırlanamadı. Belge değiştirilmedi.");
    }
  }
  return (
    <div
      className={`native-targets ${quiet ? "quiet-targets" : ""}`}
      aria-label="PDF içeriği"
      style={
        selectingRegion
          ? {
              zIndex: 5,
              pointerEvents: "auto",
              cursor: "crosshair",
              touchAction: "none",
            }
          : undefined
      }
      onPointerDown={
        selectingRegion
          ? (event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              start.current = location(event);
              setRegion(null);
            }
          : undefined
      }
      onPointerMove={
        selectingRegion
          ? (event) => {
              if (start.current)
                setRegion([...start.current, ...location(event)]);
            }
          : undefined
      }
      onPointerUp={
        selectingRegion
          ? (event) => {
              if (!start.current) return;
              const rect: [number, number, number, number] = [
                ...start.current,
                ...location(event),
              ];
              start.current = null;
              setRegion(null);
              void crop(rect);
            }
          : undefined
      }
      onPointerCancel={() => {
        start.current = null;
        setRegion(null);
      }}
    >
      {error && <span role="alert">{error}</span>}
      {region && (
        <span
          className="scan-region-selection"
          style={{
            left: Math.min(region[0], region[2]),
            top: Math.min(region[1], region[3]),
            width: Math.abs(region[2] - region[0]),
            height: Math.abs(region[3] - region[1]),
          }}
        />
      )}
      {(selectingRegion ? [] : targets).flatMap((target) => {
        const areas =
          target.removal.kind === "scan"
            ? (target.hitRects ?? target.removal.rects ?? [target.bounds])
            : [target.bounds];
        return areas.map((area, index) => {
          const a = viewport.convertToViewportPoint(area[0], area[1]),
            b = viewport.convertToViewportPoint(area[2], area[3]);
          return (
            <button
              key={`${target.id}-${index}`}
              className={
                target.overlay.kind === "text" &&
                (target.overlay.ocrConfidence ?? 100) < 60
                  ? "uncertain-ocr"
                  : undefined
              }
              aria-label={
                target.overlay.kind === "text"
                  ? `${target.removal.kind === "scan" ? "Taranmış metni düzenle" : "PDF metnini düzenle"}: ${target.overlay.text.slice(0, 80)}`
                  : "PDF görselini düzenle"
              }
              title={
                target.overlay.kind === "text"
                  ? `${target.overlay.text}${target.overlay.ocrConfidence !== undefined ? ` · Tanıma güveni %${Math.round(target.overlay.ocrConfidence)}` : ""}`
                  : "Görseli taşı, boyutlandır, değiştir veya sil"
              }
              style={{
                left: Math.min(a[0], b[0]),
                top: Math.min(a[1], b[1]),
                width: Math.abs(b[0] - a[0]),
                height: Math.abs(b[1] - a[1]),
              }}
              onClick={() => select(target)}
            />
          );
        });
      })}
    </div>
  );
}
