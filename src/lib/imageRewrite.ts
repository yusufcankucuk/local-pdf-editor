import * as mupdf from "mupdf";
import type { ContentRemoval } from "./contentTypes";

type Token = { start: number; end: number; value: string; name: boolean };
// PDF content syntax, not JavaScript: skip comments, strings and hex strings so
// a printed "/Photo Do" can never be mistaken for an image invocation.
function tokens(bytes: Uint8Array): Token[] {
  const result: Token[] = [];
  const decoder = new TextDecoder("latin1");
  const space = (c: number) => [0, 9, 10, 12, 13, 32].includes(c);
  const delimiter = (c: number) =>
    space(c) || [40, 41, 60, 62, 91, 93, 123, 125, 47, 37].includes(c);
  for (let i = 0; i < bytes.length;) {
    const start = i,
      c = bytes[i];
    if (space(c)) {
      i++;
      continue;
    }
    if (c === 37) {
      while (i < bytes.length && bytes[i] !== 10 && bytes[i] !== 13) i++;
      continue;
    }
    if (c === 40) {
      let depth = 1;
      i++;
      while (i < bytes.length && depth) {
        if (bytes[i] === 92) {
          i += 2;
          continue;
        }
        if (bytes[i] === 40) depth++;
        if (bytes[i] === 41) depth--;
        i++;
      }
      if (depth) throw new Error("Eksik PDF metin dizgesi.");
      result.push({ start, end: i, value: "", name: false });
      continue;
    }
    if (c === 60 && bytes[i + 1] !== 60) {
      i++;
      while (i < bytes.length && bytes[i] !== 62) i++;
      i++;
      result.push({ start, end: i, value: "", name: false });
      continue;
    }
    const name = c === 47;
    if (name) i++;
    if (!name && delimiter(c)) {
      i++;
      if ((c === 60 || c === 62) && bytes[i] === c) i++;
    } else {
      while (i < bytes.length && !delimiter(bytes[i])) i++;
    }
    const raw = decoder.decode(bytes.subarray(start + (name ? 1 : 0), i));
    const value = name
      ? raw.replace(/#([a-f\d]{2})/gi, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16)),
        )
      : raw;
    // Inline image boundaries can contain arbitrary binary data. Do not guess
    // their extent or change a different object by using a shifted ordinal.
    if (!name && value === "BI")
      throw new Error(
        "Satır içi görsel içeren bu sayfa henüz nesne bazında düzenlenemiyor.",
      );
    result.push({ start, end: i, value, name });
  }
  return result;
}
function copyDictionary(pdf: mupdf.PDFDocument, original: mupdf.PDFObject) {
  const copy = pdf.newDictionary();
  if (original.isDictionary())
    original.forEach((value, key) => copy.put(key, value));
  return copy;
}
function streamBytes(object: mupdf.PDFObject): Uint8Array {
  if (object.isArray()) {
    const parts: Uint8Array[] = [];
    object.forEach((value) => parts.push(streamBytes(value)));
    const output = new Uint8Array(
      parts.reduce((total, part) => total + part.length + 1, 0),
    );
    let position = 0;
    for (const part of parts) {
      output.set(part, position);
      position += part.length;
      output[position++] = 10;
    }
    return output;
  }
  const stream = object.readStream();
  try {
    return stream.asUint8Array().slice();
  } finally {
    stream.destroy();
  }
}
export function removeImageDraws(
  pdf: mupdf.PDFDocument,
  index: number,
  removals: ContentRemoval[],
) {
  const expected = new Map(removals.map((r) => [r.imageIndex!, r]));
  const removed = new Set(expected.keys()),
    matched = new Set<number>();
  let ordinal = 0,
    sequence = 0;
  function rewrite(
    bytes: Uint8Array,
    resources: mupdf.PDFObject,
    depth: number,
    matrix: mupdf.Matrix,
  ): { bytes: Uint8Array; resources: mupdf.PDFObject; changed: boolean } {
    if (depth > 24 || bytes.length > 20_000_000)
      throw new Error("PDF görsel yapısı işleme sınırını aşıyor.");
    if (
      resources.get("Pattern").isDictionary() &&
      resources.get("Pattern").length
    )
      throw new Error(
        "Desen içindeki görseller henüz nesne bazında düzenlenemiyor.",
      );
    const lexed = tokens(bytes),
      patches: { start: number; end: number; replacement: Uint8Array }[] = [];
    const objects = resources.get("XObject"),
      newObjects = copyDictionary(pdf, objects);
    let ctm = matrix;
    const stack: mupdf.Matrix[] = [];
    const changedNames = new Set<string>();
    for (let i = 0; i < lexed.length; i++) {
      const token = lexed[i],
        name = lexed[i - 1];
      if (!token.name && token.value === "q") {
        stack.push(ctm);
        continue;
      }
      if (!token.name && token.value === "Q") {
        ctm = stack.pop() ?? matrix;
        continue;
      }
      if (!token.name && token.value === "cm" && i >= 6) {
        const values = lexed.slice(i - 6, i).map((t) => Number(t.value));
        if (values.every(Number.isFinite))
          ctm = mupdf.Matrix.concat(values as mupdf.Matrix, ctm);
        continue;
      }
      if (!name) continue;
      if (token.name || token.value !== "Do" || !name.name) continue;
      const object = objects.get(name.value),
        subtype = object.get("Subtype").asName();
      if (subtype === "Image") {
        const at = ordinal++;
        if (removed.has(at)) {
          const bounds = mupdf.Rect.transform([0, 0, 1, 1], ctm),
            edit = expected.get(at)!,
            rect = edit.rect;
          if (bounds.some((value, i) => Math.abs(value - rect[i]) > 0.1))
            throw new Error("Görselin kaynak konumu doğrulanamadı.");
          changedNames.add(name.value);
          matched.add(at);
          let paint = "";
          const replacement = edit.replacement;
          if (replacement) {
            const { x, y, width, height, opacity, data } = replacement;
            if (
              ![x, y, width, height, opacity].every(Number.isFinite) ||
              width <= 0 ||
              height <= 0 ||
              opacity < 0 ||
              opacity > 1
            )
              throw new Error("Geçersiz görsel boyutu.");
            if (Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2]) < 1e-8)
              throw new Error("Görsel dönüşümü düzenlenemiyor.");
            let imageName = name.value;
            let desired: mupdf.Matrix;
            if (data) {
              if (
                !data.startsWith("data:image/png;base64,") ||
                data.length > 40_000_000
              )
                throw new Error("Geçersiz görsel verisi.");
              const image = new mupdf.Image(
                Uint8Array.from(atob(data.split(",")[1]), (c) =>
                  c.charCodeAt(0),
                ),
              );
              try {
                if (image.getWidth() * image.getHeight() > 40_000_000)
                  throw new Error("Görsel çok büyük.");
                do {
                  imageName = `PdfEditorImageEdit${++sequence}`;
                } while (!newObjects.get(imageName).isNull());
                newObjects.put(imageName, pdf.addImage(image));
              } finally {
                image.destroy();
              }
              desired = [width, 0, 0, height, x, y];
            } else {
              const sx = width / (rect[2] - rect[0]),
                sy = height / (rect[3] - rect[1]);
              desired = mupdf.Matrix.concat(ctm, [
                sx,
                0,
                0,
                sy,
                x - sx * rect[0],
                y - sy * rect[1],
              ]);
            }
            const local = mupdf.Matrix.concat(
              desired,
              mupdf.Matrix.invert(ctm),
            );
            let alpha = "";
            if (opacity !== 1) {
              const states = copyDictionary(pdf, resources.get("ExtGState"));
              let stateName: string;
              do {
                stateName = `PdfEditorAlpha${++sequence}`;
              } while (!states.get(stateName).isNull());
              states.put(stateName, pdf.newDictionary());
              states.get(stateName).put("ca", opacity);
              states.get(stateName).put("CA", opacity);
              // This resource copy belongs only to this rewritten invocation.
              resources = copyDictionary(pdf, resources);
              resources.put("ExtGState", states);
              alpha = `/${stateName} gs `;
            }
            // Retain the original XObject, masks and paint order when its data is unchanged.
            paint = `q ${alpha}${local.join(" ")} cm /${imageName} Do Q`;
          }
          patches.push({
            start: name.start,
            end: token.end,
            replacement: new TextEncoder().encode(paint),
          });
        }
      } else if (subtype === "Form") {
        const formResources = object.get("Resources");
        const child = rewrite(
          streamBytes(object),
          formResources.isDictionary() ? formResources : resources,
          depth + 1,
          mupdf.Matrix.concat(
            object.get("Matrix").isArray()
              ? (object.get("Matrix").asJS() as mupdf.Matrix)
              : mupdf.Matrix.identity,
            ctm,
          ),
        );
        if (child.changed) {
          changedNames.add(name.value);
          const dictionary = copyDictionary(pdf, object.resolve());
          dictionary.delete("Length");
          dictionary.delete("Filter");
          dictionary.delete("DecodeParms");
          dictionary.put("Resources", child.resources);
          let fresh: string;
          do {
            fresh = `PdfEditorImageEdit${++sequence}`;
          } while (!newObjects.get(fresh).isNull());
          newObjects.put(fresh, pdf.addStream(child.bytes, dictionary));
          patches.push({
            start: name.start,
            end: token.end,
            replacement: new TextEncoder().encode(`/${fresh} Do`),
          });
        }
      }
    }
    if (!patches.length) return { bytes, resources, changed: false };
    const output = new Uint8Array(
      bytes.length +
        patches.reduce(
          (delta, p) => delta + p.replacement.length - (p.end - p.start),
          0,
        ),
    );
    let from = 0,
      to = 0;
    for (const patch of patches) {
      const prefix = bytes.subarray(from, patch.start);
      output.set(prefix, to);
      to += prefix.length;
      output.set(patch.replacement, to);
      to += patch.replacement.length;
      from = patch.end;
    }
    output.set(bytes.subarray(from), to);
    const references = new Set<string>();
    const remainingTokens = tokens(output);
    for (let i = 1; i < remainingTokens.length; i++)
      if (
        !remainingTokens[i].name &&
        remainingTokens[i].value === "Do" &&
        remainingTokens[i - 1].name
      )
        references.add(remainingTokens[i - 1].value);
    for (const name of changedNames)
      if (!references.has(name)) newObjects.delete(name);
    const newResources = copyDictionary(pdf, resources);
    newResources.put("XObject", newObjects);
    return { bytes: output, resources: newResources, changed: true };
  }
  const page = pdf.findPage(index);
  const result = rewrite(
    streamBytes(page.get("Contents")),
    page.getInheritable("Resources"),
    0,
    mupdf.Matrix.identity,
  );
  if (matched.size !== removed.size)
    throw new Error("Seçilen görsel kaynak PDF akışında doğrulanamadı.");
  // Publish only after every requested draw matched. Shared forms/resources
  // are copied per changed invocation, so sibling draws and pages survive.
  page.put("Contents", pdf.addStream(result.bytes, {}));
  page.put("Resources", result.resources);
}
