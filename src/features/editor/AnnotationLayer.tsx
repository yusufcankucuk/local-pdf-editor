import { previewFont } from "../../lib/sessionFonts";
import { wrapText } from "../../lib/textLayout";
import { useEffect, useRef, useState } from "react";
import type { PageViewport } from "pdfjs-dist";
import { shapeEndpoints } from "./model";
import type { Overlay, Point } from "./model";

export type EditorTool =
  | "view"
  | "hand"
  | "text"
  | "highlight"
  | "rectangle"
  | "draw"
  | "image"
  | "signature"
  | "form"
  | "content";
export interface ToolSettings {
  text: string;
  font: string;
  size: number;
  color: string;
  thickness: number;
  image: string | null;
  imageRatio: number;
  shape: "rectangle" | "ellipse" | "triangle" | "line" | "arrow";
}

export function AnnotationLayer({
  viewport,
  overlays,
  tool,
  settings,
  selected,
  onSelect,
  onAdd,
  onUpdate,
  disabled = false,
  hidden = false,
}: {
  viewport: PageViewport;
  overlays: Overlay[];
  tool: EditorTool;
  settings: ToolSettings;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (overlay: Overlay) => void;
  onUpdate: (overlay: Overlay) => void;
  disabled?: boolean;
  hidden?: boolean;
}) {
  const [draft, setDraft] = useState<Overlay | null>(null);
  const gesture = useRef<{
    start: Point;
    overlay: Overlay;
    moving: boolean;
    resize?: string;
  } | null>(null);
  function point(event: React.PointerEvent<SVGSVGElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    const [x, y] = viewport.convertToPdfPoint(
      Math.max(0, Math.min(viewport.width, event.clientX - rect.left)),
      Math.max(0, Math.min(viewport.height, event.clientY - rect.top)),
    );
    return { x, y };
  }
  function finish() {
    if (!gesture.current) return;
    const value = draft ?? gesture.current.overlay;
    if (gesture.current.moving) {
      if (draft) onUpdate(value);
    } else if (
      value.kind === "draw"
        ? value.points.length > 1
        : "width" in value
          ? value.kind === "rectangle" &&
            (value.shape === "line" || value.shape === "arrow")
            ? Math.hypot(value.width, value.height) > 2
            : value.width > 2 && value.height > 2
          : true
    )
      onAdd(value);
    gesture.current = null;
    setDraft(null);
  }
  const visible = overlays.map((item) =>
    draft?.id === item.id ? draft : item,
  );
  if (draft && !overlays.some((item) => item.id === draft.id))
    visible.push(draft);
  return (
    <svg
      className={`annotation-overlay ${tool === "view" ? "select-overlays" : ["hand", "content", "form"].includes(tool) ? "hand-overlays" : "create-overlays"}`}
      width={viewport.width}
      height={viewport.height}
      style={{ visibility: hidden ? "hidden" : undefined }}
      aria-label="Sayfa ekleme alanı"
      tabIndex={disabled ? -1 : 0}
      onPointerDown={(event) => {
        if (
          disabled ||
          tool === "hand" ||
          tool === "form" ||
          tool === "content" ||
          event.button !== 0
        )
          return;
        const start = point(event);
        const id = (event.target as Element)
          .closest("[data-overlay-id]")
          ?.getAttribute("data-overlay-id");
        if (tool === "view") {
          if (!id) return;
          event.stopPropagation();
          event.currentTarget.focus({ preventScroll: true });
          onSelect(id);
          const overlay = overlays.find((item) => item.id === id)!;
          if (overlay.kind === "form") return;
          gesture.current = {
            start,
            overlay,
            moving: true,
            resize:
              (event.target as Element).getAttribute("data-resize") ??
              undefined,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const common = { id: crypto.randomUUID(), ...start };
        let overlay: Overlay;
        if (tool === "text") {
          if (!settings.text.trim()) return;
          onAdd({
            ...common,
            kind: "text",
            text: settings.text,
            font: settings.font,
            size: settings.size,
            color: settings.color,
          });
          return;
        }
        if (tool === "image" || tool === "signature") {
          if (!settings.image) return;
          const width = Math.min(
            180,
            viewport.viewBox[2] - viewport.viewBox[0],
          );
          const height = width / settings.imageRatio;
          onAdd({
            ...common,
            kind: "image",
            y: start.y - height,
            width,
            height,
            data: settings.image,
          });
          return;
        }
        if (tool === "draw")
          overlay = {
            ...common,
            kind: "draw",
            points: [start],
            color: settings.color,
            thickness: settings.thickness,
          };
        else
          overlay = {
            ...common,
            kind: tool,
            shape: tool === "rectangle" ? settings.shape : undefined,
            width: 0,
            height: 0,
            color: settings.color,
          };
        gesture.current = { start, overlay, moving: false };
        setDraft(overlay);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!gesture.current) return;
        const current = point(event);
        const { start, overlay, moving, resize } = gesture.current;
        if (resize && "width" in overlay) {
          const left = resize.includes("w")
            ? Math.min(current.x, overlay.x + overlay.width - 4)
            : overlay.x;
          const right = resize.includes("e")
            ? Math.max(current.x, overlay.x + 4)
            : overlay.x + overlay.width;
          const bottom = resize.includes("s")
            ? Math.min(current.y, overlay.y + overlay.height - 4)
            : overlay.y;
          const top = resize.includes("n")
            ? Math.max(current.y, overlay.y + 4)
            : overlay.y + overlay.height;
          setDraft({
            ...overlay,
            x: left,
            y: bottom,
            width: right - left,
            height: top - bottom,
          });
          return;
        }
        if (overlay.kind === "form") return;
        if (moving) {
          const dx = current.x - start.x,
            dy = current.y - start.y;
          setDraft(
            overlay.kind === "draw"
              ? {
                  ...overlay,
                  points: overlay.points.map((p) => ({
                    x: p.x + dx,
                    y: p.y + dy,
                  })),
                }
              : { ...overlay, x: overlay.x + dx, y: overlay.y + dy },
          );
        } else if (overlay.kind === "draw") {
          setDraft((previous) => {
            const points =
              previous?.kind === "draw" ? previous.points : overlay.points;
            const last = points[points.length - 1];
            if (
              points.length >= 5000 ||
              Math.hypot(current.x - last.x, current.y - last.y) < 1
            )
              return previous;
            return { ...overlay, points: [...points, current] };
          });
        } else if (
          overlay.kind === "highlight" ||
          overlay.kind === "rectangle"
        ) {
          setDraft({
            ...overlay,
            x: Math.min(start.x, current.x),
            y: Math.min(start.y, current.y),
            from: `${start.y <= current.y ? "s" : "n"}${start.x <= current.x ? "w" : "e"}` as
              "sw" | "se" | "nw" | "ne",
            width: Math.abs(current.x - start.x),
            height: Math.abs(current.y - start.y),
          });
        }
      }}
      onPointerUp={finish}
      onPointerCancel={() => {
        gesture.current = null;
        setDraft(null);
      }}
    >
      <OverlayGraphics
        viewport={viewport}
        overlays={visible}
        selected={selected}
      />
    </svg>
  );
}

export function OverlayGraphics({
  viewport,
  overlays,
  selected = null,
}: {
  viewport: PageViewport;
  overlays: Overlay[];
  selected?: string | null;
}) {
  const [, fontsChanged] = useState(0);
  useEffect(() => {
    const refresh = () => fontsChanged((value) => value + 1);
    document.fonts.addEventListener("loadingdone", refresh);
    return () => document.fonts.removeEventListener("loadingdone", refresh);
  }, []);
  const measure = useRef<CanvasRenderingContext2D | null>(null);
  if (!measure.current)
    measure.current = document.createElement("canvas").getContext("2d");
  function textLines(item: Extract<Overlay, { kind: "text" }>) {
    const family = previewFont(item.font);
    if (measure.current)
      measure.current.font = `${item.italic ? "italic" : "normal"} ${item.bold ? 700 : 400} ${item.size}px ${family}`;
    return wrapText(
      item.text,
      item.textWidth,
      (text) =>
        measure.current?.measureText(text).width ??
        text.length * item.size * 0.6,
    );
  }
  return (
    <g transform={`matrix(${viewport.transform.join(" ")})`}>
      {overlays.map((item) => (
        <g
          key={item.id}
          data-overlay-id={item.id}
          className={selected === item.id ? "overlay-selected" : undefined}
        >
          {item.kind === "text" && (
            <text
              transform={`translate(${item.x} ${item.y}) rotate(${item.rotation ?? 0}) scale(1 -1)`}
              fontWeight={item.bold ? 700 : 400}
              fontStyle={item.italic ? "italic" : "normal"}
              fontSize={item.size}
              fill={item.color}
              fontFamily={previewFont(item.font)}
            >
              {textLines(item).map((line, index) => (
                <tspan
                  key={index}
                  x={0}
                  dy={index === 0 ? 0 : (item.lineHeight ?? item.size * 1.3)}
                >
                  {line || " "}
                </tspan>
              ))}
            </text>
          )}
          {(item.kind === "highlight" || item.kind === "rectangle") && (
            <ShapeGraphics item={item} />
          )}
          {item.kind === "draw" && (
            <polyline
              points={item.points
                .map((point) => `${point.x},${point.y}`)
                .join(" ")}
              fill="none"
              stroke={item.color}
              strokeWidth={item.thickness}
            />
          )}
          {item.kind === "image" && item.native && (
            <rect
              data-native-image="true"
              stroke={selected === item.id ? "#7266bb" : "none"}
              strokeWidth={1 / viewport.scale}
              strokeDasharray={4 / viewport.scale}
              x={item.x}
              y={item.y}
              width={item.width}
              height={item.height}
              fill="transparent"
            />
          )}
          {item.kind === "image" && !item.native && (
            <image
              href={item.data}
              opacity={item.opacity ?? 1}
              transform={`translate(${item.x} ${item.y + item.height}) scale(1 -1)`}
              width={item.width}
              height={item.height}
            />
          )}
          {selected === item.id &&
            "width" in item &&
            ["sw", "se", "nw", "ne"].map((corner) => (
              <rect
                key={corner}
                className="resize-handle"
                data-resize={corner}
                x={
                  item.x +
                  (corner.includes("e") ? item.width : 0) -
                  5 / viewport.scale
                }
                y={
                  item.y +
                  (corner.includes("n") ? item.height : 0) -
                  5 / viewport.scale
                }
                width={10 / viewport.scale}
                height={10 / viewport.scale}
              />
            ))}
        </g>
      ))}
    </g>
  );
}

function ShapeGraphics({
  item,
}: {
  item: Extract<Overlay, { kind: "highlight" | "rectangle" }>;
}) {
  const style = {
    fill: item.kind === "highlight" ? item.color : "none",
    fillOpacity: item.kind === "highlight" ? 0.3 : 1,
    stroke: item.kind === "rectangle" ? item.color : "none",
    strokeWidth: 1.5,
  };
  if (item.shape === "ellipse")
    return (
      <ellipse
        {...style}
        cx={item.x + item.width / 2}
        cy={item.y + item.height / 2}
        rx={item.width / 2}
        ry={item.height / 2}
      />
    );
  if (item.shape === "triangle")
    return (
      <polygon
        {...style}
        points={`${item.x},${item.y} ${item.x + item.width},${item.y} ${item.x + item.width / 2},${item.y + item.height}`}
      />
    );
  if (item.shape === "line" || item.shape === "arrow") {
    const { start, end } = shapeEndpoints(item);
    const angle = Math.atan2(end.y - start.y, end.x - start.x),
      length = Math.min(12, Math.hypot(item.width, item.height) / 3);
    return (
      <g>
        <line {...style} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
        {item.shape === "arrow" &&
          [-0.5, 0.5].map((offset) => (
            <line
              key={offset}
              {...style}
              x1={end.x}
              y1={end.y}
              x2={end.x - length * Math.cos(angle + offset)}
              y2={end.y - length * Math.sin(angle + offset)}
            />
          ))}
      </g>
    );
  }
  return (
    <rect
      {...style}
      x={item.x}
      y={item.y}
      width={item.width}
      height={item.height}
    />
  );
}
