import { PDFDocument, rgb, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as mupdf from "mupdf";
import { readFile, writeFile } from "node:fs/promises";
const doc = await PDFDocument.create();
doc.registerFontkit(fontkit);
const font = await doc.embedFont(
  await readFile("src/assets/NotoSerif-Regular.ttf"),
);
const page = doc.addPage([595, 842]);
page.drawRectangle({
  x: 0,
  y: 0,
  width: 595,
  height: 842,
  color: rgb(0.88, 0.86, 0.82),
});
page.drawText("STAJ DEFTERİ — ÖRNEK SAYFA", {
  font,
  size: 17,
  x: 50,
  y: 780,
  color: rgb(0.23, 0.23, 0.23),
});
for (let y = 755; y >= 495; y -= 26)
  page.drawLine({
    start: { x: 45, y },
    end: { x: 550, y },
    thickness: 0.6,
    color: rgb(0.55, 0.55, 0.55),
  });
for (const x of [45, 330, 550])
  page.drawLine({
    start: { x, y: 495 },
    end: { x, y: 755 },
    thickness: 0.6,
    color: rgb(0.55, 0.55, 0.55),
  });
page.drawText("Yapılan çalışmalar", {
  font,
  size: 12,
  x: 55,
  y: 734,
  color: rgb(0.25, 0.25, 0.25),
});
page.drawText("Gözlem ve sonuç", {
  font,
  size: 12,
  x: 340,
  y: 734,
  color: rgb(0.25, 0.25, 0.25),
});
page.drawText(
  "Bugün ölçüm cihazını kontrol ettim.\nÇağrı ile çalışma planını hazırladık.\nİş güvenliği kurallarını uyguladık.",
  {
    font,
    size: 10,
    x: 55,
    y: 708,
    lineHeight: 26,
    color: rgb(0.32, 0.32, 0.32),
  },
);
page.drawText(
  "Ölçüm tamamlandı.\nİkinci sütun korunmalıdır.\nİmza alanı değişmemelidir.",
  {
    font,
    size: 10,
    x: 340,
    y: 708,
    lineHeight: 26,
    color: rgb(0.32, 0.32, 0.32),
  },
);
page.drawText("Tarih: 08.10.2026", {
  font,
  size: 10,
  x: 55,
  y: 520,
  color: rgb(0.3, 0.3, 0.3),
});
page.drawText("Onay / İmza", {
  font,
  size: 10,
  x: 350,
  y: 520,
  color: rgb(0.3, 0.3, 0.3),
});
const original = new mupdf.PDFDocument(await doc.save()),
  p = original.loadPage(0);
const bitmap = p.toPixmap(
  mupdf.Matrix.scale(2, 2),
  mupdf.ColorSpace.DeviceRGB,
  false,
);
try {
  const scan = await PDFDocument.create(),
    s = scan.addPage([595, 842]);
  s.drawImage(await scan.embedPng(bitmap.asPNG()), {
    x: 0,
    y: 0,
    width: 595,
    height: 842,
  });
  await writeFile("tests/fixtures/scanned-notebook.pdf", await scan.save());
  const rotated = await PDFDocument.create();
  rotated.addPage([842, 595]).drawImage(await rotated.embedPng(bitmap.asPNG()), {
    x: 842, y: 0, width: 595, height: 842, rotate: degrees(90),
  });
  await writeFile("tests/fixtures/scanned-notebook-rotated.pdf", await rotated.save());
} finally {
  bitmap.destroy();
  p.destroy();
  original.destroy();
}
