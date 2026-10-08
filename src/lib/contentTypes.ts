import type { Overlay } from "../features/editor/model";
export type ContentRemoval = {
  id: string;
  kind: "text" | "image" | "scan";
  rect: [number, number, number, number];
  rects?: [number, number, number, number][];
  fillColors?: [number, number, number][];
  imageIndex?: number;
  replacement?: {
    x: number;
    y: number;
    width: number;
    height: number;
    data?: string;
    opacity: number;
  };
};
export type ContentTarget = {
  id: string;
  bounds: [number, number, number, number];
  hitRects?: [number, number, number, number][];
  pageRaster?: boolean;
  pageRasterData?: string;
  removal: ContentRemoval;
  overlay: Extract<Overlay, { kind: "text" | "image" }>;
};

// The same edits drive the source preview and the exported PDF.
export function imageRemovals(
  removals: ContentRemoval[] = [],
  overlays: Overlay[],
): ContentRemoval[] {
  return removals.map((removal) => {
    if (removal.kind !== "image") return removal;
    const image = overlays.find(
      (item) => item.kind === "image" && item.native?.id === removal.id,
    );
    return image?.kind === "image"
      ? {
          ...removal,
          replacement: {
            x: image.x,
            y: image.y,
            width: image.width,
            height: image.height,
            data: image.data === image.native?.data ? undefined : image.data,
            opacity: image.opacity ?? 1,
          },
        }
      : removal;
  });
}
