import { localFontBytes } from "./sessionFonts";
import { imageRemovals } from "./contentTypes";
import { wrapText } from "./textLayout";
import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  degrees,
  rgb,
} from "pdf-lib";
import type { PDFFont } from "pdf-lib";
import { fontUrls, fontKey } from "./fonts";
import { eraseContent } from "./contentPdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { shapeEndpoints } from "../features/editor/model";
import type { EditorPage } from "../features/editor/model";
import fontUrl from "../assets/NotoSans-Regular.ttf?url";

export interface PageSource {
  file: File;
  pdf: PDFDocumentProxy;
}
function color(hex: string) {
  return rgb(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  );
}

export async function exportPdf(
  pages: EditorPage[],
  sources: Map<string, PageSource>,
): Promise<Uint8Array> {
  const output = await PDFDocument.create();
  const loaded = new Map<string, PDFDocument>();
  let font;
  const fonts = new Map<string, PDFFont>();
  let fontBytes: ArrayBuffer | undefined;
  if (
    pages.some((page) =>
      page.overlays.some(
        (overlay) => overlay.kind === "text" || overlay.kind === "form",
      ),
    )
  ) {
    const { default: fontkit } = await import("@pdf-lib/fontkit");
    output.registerFontkit(fontkit);
    const response = await fetch(fontUrl);
    if (!response.ok) throw new Error("Yerel yazı tipi yüklenemedi.");
    fontBytes = await response.arrayBuffer();
    font = await output.embedFont(fontBytes, {
      subset: true,
    });
  }
  for (const item of pages.flatMap((page) => page.overlays)) {
    if (item.kind !== "text" || fonts.has(fontKey(item))) continue;
    const key = fontKey(item);
    let bytes = localFontBytes(item);
    if (!bytes) {
      const response = await fetch(fontUrls[key]);
      if (!response.ok) throw new Error("Yerel yazı tipi yüklenemedi.");
      bytes = new Uint8Array(await response.arrayBuffer());
    }
    fonts.set(key, await output.embedFont(bytes, { subset: true }));
  }
  for (const entry of pages) {
    let page;
    if (entry.sourceId) {
      let source = loaded.get(entry.sourceId);
      if (!source) {
        const resource = sources.get(entry.sourceId);
        if (!resource) throw new Error("Kaynak belge bulunamadı.");
        source = await PDFDocument.load(await resource.file.arrayBuffer());
        const edits = pages
          .filter((page) => page.sourceId === entry.sourceId)
          .flatMap((page) => page.overlays)
          .filter((item) => item.kind === "form");
        if (edits.length) {
          const form = source.getForm();
          for (const edit of edits) {
            const field = form.getField(edit.name);
            if (field instanceof PDFTextField && typeof edit.value === "string")
              field.setText(edit.value);
            else if (
              field instanceof PDFCheckBox &&
              typeof edit.value === "boolean"
            ) {
              if (edit.value) field.check();
              else field.uncheck();
            } else if (
              (field instanceof PDFDropdown ||
                field instanceof PDFOptionList) &&
              typeof edit.value === "string"
            ) {
              if (edit.value) field.select(edit.value);
              else field.clear();
            }
          }
          if (fontBytes) {
            const { default: fontkit } = await import("@pdf-lib/fontkit");
            source.registerFontkit(fontkit);
            form.updateFieldAppearances(
              await source.embedFont(fontBytes, { subset: true }),
            );
          }
          form.flatten();
        }
        loaded.set(entry.sourceId, source);
      }
      let copySource = source;
      if (entry.removals?.length) {
        const bytes = await source.save();
        copySource = await PDFDocument.load(
          await eraseContent(
            bytes.slice().buffer,
            entry.sourcePage,
            imageRemovals(entry.removals, entry.overlays),
          ),
        );
      }
      [page] = await output.copyPages(copySource, [entry.sourcePage - 1]);
      output.addPage(page);
    } else {
      page = output.addPage([595, 842]);
    }
    page.setRotation(
      degrees((page.getRotation().angle + entry.rotation) % 360),
    );
    for (const item of entry.overlays) {
      if (item.kind === "text" && font) {
        const font = fonts.get(fontKey(item))!;
        const text = wrapText(item.text, item.textWidth, (text) =>
          font.widthOfTextAtSize(text, item.size),
        ).join("\n");
        page.drawText(text, {
          x: item.x,
          y: item.y,
          size: item.size,
          font: fonts.get(fontKey(item)),
          rotate: degrees(item.rotation ?? 0),
          ySkew: item.font === "mono" && item.italic ? degrees(12) : undefined,
          color: color(item.color),
          lineHeight: item.lineHeight ?? item.size * 1.3,
        });
      } else if (item.kind === "highlight" || item.kind === "rectangle") {
        const base = {
          color: item.kind === "highlight" ? color(item.color) : undefined,
          borderColor:
            item.kind === "rectangle" ? color(item.color) : undefined,
          borderWidth: 1.5,
          opacity: item.kind === "highlight" ? 0.3 : 1,
        };
        if (item.shape === "ellipse")
          page.drawEllipse({
            ...base,
            x: item.x + item.width / 2,
            y: item.y + item.height / 2,
            xScale: item.width / 2,
            yScale: item.height / 2,
          });
        else if (item.shape === "triangle")
          page.drawSvgPath(
            `M 0 0 L ${item.width} 0 L ${item.width / 2} ${-item.height} Z`,
            { ...base, x: item.x, y: item.y },
          );
        else if (item.shape === "line" || item.shape === "arrow") {
          const { start, end } = shapeEndpoints(item);
          page.drawLine({
            start,
            end,
            color: color(item.color),
            thickness: 1.5,
          });
          if (item.shape === "arrow") {
            const angle = Math.atan2(end.y - start.y, end.x - start.x),
              length = Math.min(12, Math.hypot(item.width, item.height) / 3);
            for (const offset of [-0.5, 0.5])
              page.drawLine({
                start: end,
                end: {
                  x: end.x - length * Math.cos(angle + offset),
                  y: end.y - length * Math.sin(angle + offset),
                },
                color: color(item.color),
                thickness: 1.5,
              });
          }
        } else
          page.drawRectangle({
            ...base,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
          });
      } else if (item.kind === "draw") {
        for (let index = 1; index < item.points.length; index++)
          page.drawLine({
            start: item.points[index - 1],
            end: item.points[index],
            thickness: item.thickness,
            color: color(item.color),
          });
      } else if (item.kind === "image" && !item.native) {
        const image = item.data.startsWith("data:image/png")
          ? await output.embedPng(item.data)
          : await output.embedJpg(item.data);
        page.drawImage(image, {
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          opacity: item.opacity ?? 1,
        });
      }
    }
  }
  return output.save();
}

export async function createBlankPdf(): Promise<File> {
  const pdf = await PDFDocument.create();
  pdf.addPage([595, 842]);
  const bytes = await pdf.save();
  return new File([bytes.slice().buffer], "Bos sayfa.pdf", {
    type: "application/pdf",
  });
}
