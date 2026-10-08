// Device font bytes stay in memory. They are embedded only in the user's output PDF.
type Style = "Regular" | "Bold" | "Italic" | "BoldItalic";
type LocalFont = {
  id: string;
  label: string;
  family: string;
  variants: Partial<Record<Style, { bytes: Uint8Array; face: FontFace }>>;
};
const fonts = new Map<string, LocalFont>();
export const systemFamilies = ["Times New Roman", "Arial", "Georgia"];
export function localFonts() {
  return [...fonts.values()];
}
export function localFont(id?: string) {
  return id ? fonts.get(id) : undefined;
}
export function fontStyle(item: { bold?: boolean; italic?: boolean }): Style {
  return item.bold
    ? item.italic
      ? "BoldItalic"
      : "Bold"
    : item.italic
      ? "Italic"
      : "Regular";
}
export function previewFont(font?: string) {
  return (
    localFont(font)?.family ??
    (font === "serif"
      ? "PdfEditorSerif"
      : font === "mono"
        ? "PdfEditorMono"
        : "PdfEditorDocumentFont")
  );
}
export function availableStyle(
  font: string | undefined,
  bold: boolean,
  italic: boolean,
) {
  const loaded = localFont(font);
  return !loaded || !!loaded.variants[fontStyle({ bold, italic })];
}
export async function addLocalFont(bytes: Uint8Array) {
  if (bytes.length < 12)
    throw new Error("Geçerli bir TTF veya OTF font dosyası seçin.");
  if (bytes.length > 10_000_000)
    throw new Error(
      "En fazla 10 MB boyutunda TTF/OTF fontu ve 20 font ailesi kullanabilirsiniz.",
    );
  const signature = Array.from(bytes.subarray(0, 4)).join(",");
  if (!["0,1,0,0", "79,84,84,79"].includes(signature))
    throw new Error("Geçerli bir TTF veya OTF font dosyası seçin.");
  const { default: fontkit } = await import("@pdf-lib/fontkit");
  const parsed = fontkit.create(bytes);
  const embedding = (
    parsed as unknown as {
      "OS/2"?: {
        fsType?:
          | number
          | {
              noEmbedding?: boolean;
              noSubsetting?: boolean;
              bitmapOnly?: boolean;
            };
      };
    }
  )["OS/2"]?.fsType;
  if (
    (typeof embedding === "number" && !!(embedding & (2 | 256 | 512))) ||
    (typeof embedding === "object" &&
      (embedding.noEmbedding || embedding.noSubsetting || embedding.bitmapOnly))
  )
    throw new Error(
      "Bu font PDF içine gömme veya alt küme oluşturma izni vermiyor.",
    );
  const label = parsed.familyName?.trim().slice(0, 80);
  if (!label || !parsed.numGlyphs) throw new Error("Font okunamadı.");
  const subfamily = parsed.subfamilyName ?? "";
  const bold = /bold|black|heavy/i.test(subfamily),
    italic = /italic|oblique/i.test(subfamily);
  const style = fontStyle({ bold, italic });
  let loaded = [...fonts.values()].find((font) => font.label === label);
  if (!loaded && fonts.size >= 20)
    throw new Error("En fazla 20 font ailesi ekleyebilirsiniz.");
  const currentBytes = [...fonts.values()].reduce(
    (total, font) =>
      total +
      Object.values(font.variants).reduce(
        (sum, variant) => sum + variant.bytes.length,
        0,
      ),
    0,
  );
  if (currentBytes + bytes.length > 64_000_000)
    throw new Error(
      "Fontlar için 64 MB bellek sınırına ulaşıldı. Kullanmadığınız fontları eklemeyin.",
    );
  const id = loaded?.id ?? `local-${crypto.randomUUID()}`;
  const family = loaded?.family ?? `PdfEditorLocal_${id.replaceAll("-", "_")}`;
  const face = new FontFace(family, bytes.slice().buffer, {
    weight: bold ? "700" : "400",
    style: italic ? "italic" : "normal",
  });
  await face.load();
  if (!loaded) {
    loaded = { id, label, family, variants: {} };
    fonts.set(id, loaded);
  }
  const previous = loaded.variants[style];
  if (previous) document.fonts.delete(previous.face);
  document.fonts.add(face);
  loaded.variants[style] = { bytes: bytes.slice(), face };
  return loaded;
}
export async function loadSystemFamily(family: string) {
  if (!systemFamilies.includes(family))
    throw new Error("Font ailesi desteklenmiyor.");
  const api = window as unknown as {
    queryLocalFonts?: () => Promise<
      { family: string; blob: () => Promise<Blob> }[]
    >;
  };
  if (!api.queryLocalFonts)
    throw new Error(
      "Bu tarayıcı cihaz fontlarına erişemiyor. Font dosyası ekle ile TTF/OTF dosyanızı seçin.",
    );
  const device = await api.queryLocalFonts();
  const matches = device.filter((font) => font.family === family).slice(0, 4);
  if (!matches.length)
    throw new Error(
      `${family} cihazda bulunamadı. Font dosyası ekle ile yükleyebilirsiniz.`,
    );
  let result: LocalFont | undefined;
  for (const font of matches)
    result = await addLocalFont(
      new Uint8Array(await (await font.blob()).arrayBuffer()),
    );
  return result!;
}
export function localFontBytes(item: {
  font?: string;
  bold?: boolean;
  italic?: boolean;
}) {
  const font = localFont(item.font);
  if (!font) return undefined;
  const variant = font.variants[fontStyle(item)];
  if (!variant)
    throw new Error(
      `${font.label} için seçilen kalın/eğik font dosyası eksik.`,
    );
  return variant.bytes;
}
