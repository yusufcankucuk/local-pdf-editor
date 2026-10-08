import * as mupdf from "mupdf";
import { removeImageDraws } from "./imageRewrite.ts";
import type { ContentTarget, ContentRemoval } from "./contentTypes";
import type { Overlay } from "../features/editor/model";

function point(p: number[], m: mupdf.Matrix): [number, number] {
  return [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
}
function rgb(color: number[]) {
  const values =
    color.length === 1
      ? [color[0], color[0], color[0]]
      : color.length === 4
        ? [
            1 - Math.min(1, color[0] + color[3]),
            1 - Math.min(1, color[1] + color[3]),
            1 - Math.min(1, color[2] + color[3]),
          ]
        : color;
  return (
    "#" +
    values
      .slice(0, 3)
      .map((v) =>
        Math.round(Math.max(0, Math.min(1, v)) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function dataUrl(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return "data:image/png;base64," + btoa(binary);
}
export function readContentPage(
  pdf: mupdf.PDFDocument,
  index: number,
): ContentTarget[] {
  const page = pdf.loadPage(index);
  const text = page.toStructuredText("");
  const inverse = mupdf.Matrix.invert(page.getTransform());
  const targets: ContentTarget[] = [];
  let current: Extract<Overlay, { kind: "text" }> | null = null;
  let rect: mupdf.Rect = [0, 0, 0, 0];
  let supported = false;
  let imagePixels = 0;
  let imageIndex = 0;
  let block: ContentTarget[] = [];
  const flushParagraph = () => {
    if (!block.length) return;
    const first = block[0];
    if (first.overlay.kind !== "text") return;
    const bounds: mupdf.Rect = [
      Math.min(...block.map((t) => t.bounds[0])),
      Math.min(...block.map((t) => t.bounds[1])),
      Math.max(...block.map((t) => t.bounds[2])),
      Math.max(...block.map((t) => t.bounds[3])),
    ];
    const spacing =
      block.length > 1 && block[1].overlay.kind === "text"
        ? first.overlay.y - block[1].overlay.y
        : first.overlay.size * 1.3;
    targets.push({
      ...first,
      bounds,
      removal: { ...first.removal, rects: block.map((t) => t.removal.rect) },
      overlay: {
        ...first.overlay,
        text: block
          .map((t) => (t.overlay.kind === "text" ? t.overlay.text.trim() : ""))
          .join("\n"),
        textWidth: bounds[2] - bounds[0],
        lineHeight: spacing,
      },
    });
    block = [];
  };
  try {
    text.walk({
      beginTextBlock() {
        flushParagraph();
      },
      endTextBlock() {
        flushParagraph();
      },
      beginLine(bbox, _mode, direction) {
        rect = mupdf.Rect.transform(bbox, inverse);
        const delta = point(direction, [
          ...inverse.slice(0, 4),
          0,
          0,
        ] as mupdf.Matrix);
        supported = Math.abs(delta[1]) < 0.01 && delta[0] > 0;
        current = null;
      },
      onChar(c, origin, font, size, _quad, color) {
        if (!supported) return;
        if (!current) {
          const [x, y] = point(origin, inverse);
          current = {
            id: `native-text-${targets.length}-${block.length}`,
            kind: "text",
            x,
            y,
            text: "",
            size,
            font: font.isMono() ? "mono" : font.isSerif() ? "serif" : "sans",
            bold: font.isBold(),
            italic: font.isItalic(),
            color: rgb(color),
          };
        }
        current.text += c;
      },
      endLine() {
        if (current && current.text.trim()) {
          const previous = block.at(-1)?.overlay;
          if (
            previous?.kind === "text" &&
            (previous.size !== current.size ||
              previous.font !== current.font ||
              previous.bold !== current.bold ||
              previous.italic !== current.italic ||
              previous.color !== current.color ||
              previous.y - current.y < current.size * 0.7 ||
              previous.y - current.y > current.size * 1.8 ||
              Math.abs(previous.x - current.x) > current.size * 2)
          )
            flushParagraph();
          block.push({
            id: current.id,
            bounds: rect,
            removal: {
              id: current.id,
              kind: "text",
              rect: [
                rect[0],
                current.y + current.size * 0.2,
                rect[2],
                current.y + current.size * 0.45,
              ],
            },
            overlay: current,
          });
        }
      },
    });
    flushParagraph();
    const drawImage = (
      image: mupdf.Image,
      transform: mupdf.Matrix,
      alpha: number,
      maskColor?: { space: mupdf.ColorSpace; color: number[] },
    ) => {
      const ordinal = imageIndex++;
      const bounds = mupdf.Rect.transform(
        [0, 0, 1, 1],
        mupdf.Matrix.concat(transform, inverse),
      );
      const matrix = mupdf.Matrix.concat(transform, inverse);
      const pixels = image.getWidth() * image.getHeight();
      if (pixels > 40_000_000 || imagePixels + pixels > 64_000_000) return;
      const width = bounds[2] - bounds[0],
        height = bounds[3] - bounds[1];
      if (!Number.isFinite(width + height) || width < 0.01 || height < 0.01)
        return;
      imagePixels += pixels;
      // Render the original image transform into a transparent bounding box.
      // This preserves rotations, reflections and soft masks when it becomes editable.
      const density = Math.max(
        image.getWidth() / Math.hypot(matrix[0], matrix[1]),
        image.getHeight() / Math.hypot(matrix[2], matrix[3]),
      );
      const scale = Math.min(density, 2400 / width, 2400 / height);
      if (!Number.isFinite(scale) || scale <= 0) return;
      const pixmap = new mupdf.Pixmap(
        mupdf.ColorSpace.DeviceRGB,
        [0, 0, Math.ceil(width * scale), Math.ceil(height * scale)],
        true,
      );
      pixmap.clear(0);
      const device = new mupdf.DrawDevice(mupdf.Matrix.identity, pixmap);
      try {
        const drawTransform: mupdf.Matrix = [
          matrix[0] * scale,
          -matrix[1] * scale,
          matrix[2] * scale,
          -matrix[3] * scale,
          (matrix[4] - bounds[0]) * scale,
          (bounds[3] - matrix[5]) * scale,
        ];
        if (maskColor)
          device.fillImageMask(
            image,
            drawTransform,
            maskColor.space,
            maskColor.color as mupdf.Color,
            alpha,
          );
        else device.fillImage(image, drawTransform, alpha);
        const mask = image.getMask();
        if (mask) {
          const rawMask = mask.toPixmap();
          const grayMask = new mupdf.Pixmap(
            mupdf.ColorSpace.DeviceGray,
            rawMask.getBounds() as mupdf.Rect,
            false,
          );
          grayMask.getPixels().set(rawMask.getPixels());
          const maskImage = new mupdf.Image(grayMask);
          const renderedMask = new mupdf.Pixmap(
            mupdf.ColorSpace.DeviceGray,
            pixmap.getBounds() as mupdf.Rect,
            false,
          );
          renderedMask.clear(0);
          const maskDevice = new mupdf.DrawDevice(
            mupdf.Matrix.identity,
            renderedMask,
          );
          try {
            maskDevice.fillImage(maskImage, drawTransform, 1);
            maskDevice.close();
            const pixels = pixmap.getPixels(),
              alpha = renderedMask.getPixels();
            for (let i = 0; i < alpha.length; i++)
              for (let channel = 0; channel < 4; channel++)
                pixels[i * 4 + channel] = Math.round(
                  (pixels[i * 4 + channel] * alpha[i]) / 255,
                );
          } finally {
            maskDevice.destroy();
            renderedMask.destroy();
            maskImage.destroy();
            grayMask.destroy();
            rawMask.destroy();
            mask.destroy();
          }
        }
        device.close();
        const id = `native-image-${targets.length}`;
        targets.push({
          id,
          bounds,
          removal: { id, kind: "image", rect: bounds, imageIndex: ordinal },
          overlay: {
            id,
            kind: "image",
            x: bounds[0],
            y: bounds[1],
            width: bounds[2] - bounds[0],
            height: bounds[3] - bounds[1],
            data: dataUrl(pixmap.asPNG()),
          },
        });
      } finally {
        device.destroy();
        pixmap.destroy();
      }
    };
    let maskDepth = 0;
    const imageReader = new mupdf.Device({
      beginMask() {
        maskDepth++;
      },
      endMask() {
        maskDepth--;
      },
      fillImage(image, transform, alpha) {
        if (!maskDepth) drawImage(image, transform, alpha);
      },
      fillImageMask(image, transform, space, color, alpha) {
        if (!maskDepth) drawImage(image, transform, alpha, { space, color });
      },
    });
    try {
      page.runPageContents(imageReader, mupdf.Matrix.identity);
      imageReader.close();
    } finally {
      imageReader.destroy();
    }
    // A scan is one page-sized raster, not a collection of separate photos.
    {
      const pageBounds = mupdf.Rect.transform(page.getBounds(), inverse);
      const area =
        (pageBounds[2] - pageBounds[0]) * (pageBounds[3] - pageBounds[1]);
      for (const target of targets) {
        if (target.overlay.kind !== "image") continue;
        const [x0, y0, x1, y1] = target.bounds;
        if ((x1 - x0) * (y1 - y0) < area * 0.8) continue;
        target.pageRaster = true;
        const scale = Math.min(3, 2400 / (x1 - x0), 2400 / (y1 - y0));
        const pixmap = new mupdf.Pixmap(
          mupdf.ColorSpace.DeviceRGB,
          [0, 0, Math.ceil((x1 - x0) * scale), Math.ceil((y1 - y0) * scale)],
          false,
        );
        pixmap.clear(255);
        const device = new mupdf.DrawDevice(mupdf.Matrix.identity, pixmap);
        try {
          page.runPageContents(
            device,
            mupdf.Matrix.concat(inverse, [
              scale,
              0,
              0,
              -scale,
              -x0 * scale,
              y1 * scale,
            ]),
          );
          device.close();
          target.pageRasterData = dataUrl(pixmap.asPNG());
          if (!targets.some((item) => item.overlay.kind === "text"))
            target.overlay.data = target.pageRasterData;
        } finally {
          device.destroy();
          pixmap.destroy();
        }
      }
    }
    // Images first, text last: paragraphs stay clickable over background images.
    return targets.sort(
      (a, b) =>
        Number(a.overlay.kind === "text") - Number(b.overlay.kind === "text"),
    );
  } finally {
    text.destroy();
    page.destroy();
  }
}
export function eraseContentPage(
  pdf: mupdf.PDFDocument,
  index: number,
  removals: ContentRemoval[],
  singlePage = false,
) {
  const images = removals.filter(
    (r) =>
      r.kind === "image" &&
      r.imageIndex !== undefined &&
      !(
        r.replacement &&
        !r.replacement.data &&
        r.replacement.opacity === 1 &&
        Math.abs(r.replacement.x - r.rect[0]) < 1e-8 &&
        Math.abs(r.replacement.y - r.rect[1]) < 1e-8 &&
        Math.abs(r.replacement.width - (r.rect[2] - r.rect[0])) < 1e-8 &&
        Math.abs(r.replacement.height - (r.rect[3] - r.rect[1])) < 1e-8
      ),
  );
  if (images.length) removeImageDraws(pdf, index, images);
  const page = pdf.loadPage(index);
  try {
    for (const removal of removals) {
      if (removal.kind === "image" && removal.imageIndex !== undefined)
        continue;
      for (const rect of removal.rects ?? [removal.rect]) {
        const annotation = page.createAnnotation("Redact");
        annotation.setRect(mupdf.Rect.transform(rect, page.getTransform()));
        annotation.applyRedaction(
          0,
          removal.kind === "image"
            ? mupdf.PDFPage.REDACT_IMAGE_REMOVE
            : removal.kind === "scan"
              ? mupdf.PDFPage.REDACT_IMAGE_PIXELS
              : mupdf.PDFPage.REDACT_IMAGE_NONE,
          mupdf.PDFPage.REDACT_LINE_ART_NONE,
          removal.kind === "text" || removal.kind === "scan"
            ? mupdf.PDFPage.REDACT_TEXT_REMOVE
            : mupdf.PDFPage.REDACT_TEXT_NONE,
        );
      }
    }
    const patches: string[] = [];
    for (const removal of removals) {
      if (removal.kind !== "scan" || !removal.fillColors) continue;
      (removal.rects ?? [removal.rect]).forEach((rect, index) => {
        const color = removal.fillColors![index];
        if (
          !color ||
          color.length !== 3 ||
          color.some(
            (value) => !Number.isFinite(value) || value < 0 || value > 1,
          ) ||
          rect.some((value) => !Number.isFinite(value))
        )
          throw new Error("Geçersiz tarama arka planı.");
        patches.push(
          `q ${color.join(" ")} rg ${rect[0]} ${rect[1]} ${rect[2] - rect[0]} ${rect[3] - rect[1]} re f Q`,
        );
      });
    }
    if (patches.length) {
      const object = pdf.findPage(index),
        contents = object.get("Contents"),
        combined = pdf.newArray();
      combined.push(pdf.addStream("q", {}));
      if (contents.isArray()) contents.forEach((value) => combined.push(value));
      else if (!contents.isNull()) combined.push(contents);
      combined.push(pdf.addStream("Q\n" + patches.join("\n"), {}));
      object.put("Contents", combined);
    }
    let saved = pdf;
    if (singlePage) {
      saved = new mupdf.PDFDocument();
      saved.graftPage(0, pdf, index);
    }
    const buffer = saved.saveToBuffer("garbage=4,compress");
    if (singlePage) saved.destroy();
    try {
      return buffer.asUint8Array().slice();
    } finally {
      buffer.destroy();
    }
  } finally {
    page.destroy();
  }
}
