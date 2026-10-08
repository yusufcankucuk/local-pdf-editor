import type { ContentRemoval } from "../../lib/contentTypes";

export interface Point {
  x: number;
  y: number;
}
export type Overlay =
  | { id: string; kind: "form"; name: string; value: string | boolean }
  | {
      id: string;
      kind: "text";
      x: number;
      y: number;
      text: string;
      font?: string;
      bold?: boolean;
      italic?: boolean;
      size: number;
      textWidth?: number;
      ocrConfidence?: number;
      rotation?: number;
      lineHeight?: number;
      color: string;
    }
  | {
      id: string;
      kind: "highlight" | "rectangle";
      shape?: "rectangle" | "ellipse" | "triangle" | "line" | "arrow";
      from?: "sw" | "se" | "nw" | "ne";
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
    }
  | {
      id: string;
      kind: "draw";
      points: Point[];
      color: string;
      thickness: number;
    }
  | {
      id: string;
      kind: "image";
      x: number;
      y: number;
      width: number;
      height: number;
      data: string;
      opacity?: number;
      native?: { id: string; data: string };
    };

export interface EditorPage {
  id: string;
  sourceId: string | null;
  sourcePage: number;
  rotation: number;
  removals?: ContentRemoval[];
  overlays: Overlay[];
}
export interface History {
  past: EditorPage[][];
  present: EditorPage[];
  future: EditorPage[][];
}
export type HistoryAction =
  { type: "commit"; pages: EditorPage[] } | { type: "undo" | "redo" };

export function historyReducer(state: History, action: HistoryAction): History {
  if (action.type === "undo") {
    if (!state.past.length) return state;
    return {
      past: state.past.slice(0, -1),
      present: state.past[state.past.length - 1],
      future: [state.present, ...state.future],
    };
  }
  if (action.type === "redo") {
    if (!state.future.length) return state;
    return {
      past: [...state.past, state.present],
      present: state.future[0],
      future: state.future.slice(1),
    };
  }
  if (
    !("pages" in action) ||
    !action.pages.length ||
    action.pages === state.present
  )
    return state;
  // ponytail: keep 100 edit snapshots; a command log can replace this if measured memory needs it.
  return {
    past: [...state.past, state.present].slice(-100),
    present: action.pages,
    future: [],
  };
}

export function movePage(
  pages: EditorPage[],
  from: number,
  to: number,
): EditorPage[] {
  if (
    from < 0 ||
    to < 0 ||
    from >= pages.length ||
    to >= pages.length ||
    from === to
  )
    return pages;
  const result = [...pages];
  const [page] = result.splice(from, 1);
  result.splice(to, 0, page);
  return result;
}

export function shapeEndpoints(item: {
  x: number;
  y: number;
  width: number;
  height: number;
  from?: "sw" | "se" | "nw" | "ne";
}) {
  const corner = item.from ?? "sw";
  const start = {
    x: item.x + (corner.endsWith("e") ? item.width : 0),
    y: item.y + (corner.startsWith("n") ? item.height : 0),
  };
  return {
    start,
    end: {
      x: item.x + item.width - (start.x - item.x),
      y: item.y + item.height - (start.y - item.y),
    },
  };
}

export function translateOverlay(
  overlay: Overlay,
  dx: number,
  dy: number,
): Overlay {
  if (overlay.kind === "form") return overlay;
  return overlay.kind === "draw"
    ? {
        ...overlay,
        points: overlay.points.map((point) => ({
          x: point.x + dx,
          y: point.y + dy,
        })),
      }
    : { ...overlay, x: overlay.x + dx, y: overlay.y + dy };
}
export function orderOverlay(
  overlays: Overlay[],
  id: string,
  direction: -1 | 1,
) {
  const index = overlays.findIndex((item) => item.id === id);
  const destination = index + direction;
  if (index < 0 || destination < 0 || destination >= overlays.length)
    return overlays;
  const next = [...overlays];
  [next[index], next[destination]] = [next[destination], next[index]];
  return next;
}
