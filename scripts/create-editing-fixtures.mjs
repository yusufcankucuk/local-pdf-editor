import { PDFDocument, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as mupdf from "mupdf";
import { readFile, writeFile } from "node:fs/promises";
const pdf = await PDFDocument.create();
pdf.registerFontkit(fontkit);
const font = await pdf.embedFont(
  await readFile("src/assets/NotoSans-Regular.ttf"),
);
const page = pdf.addPage([595, 842]);
page.drawText("Dijital belge — Çağrı Şahin", { x: 50, y: 780, size: 22, font });
page.drawText(
  "Bir paragraf birden fazla satirdan olusur.\nBu satir ayni paragrafta devam eder.\nMetin tek bir kutudan duzenlenmelidir.",
  { x: 50, y: 730, size: 18, lineHeight: 24, font },
);
page.drawText("Ikinci paragraf ayri secilmelidir.\nBu bolum korunacak.", {
  x: 50,
  y: 620,
  size: 18,
  lineHeight: 24,
  font,
});
const bytes = await pdf.save();
await writeFile("tests/fixtures/paragraphs.pdf", bytes);
const source = new mupdf.PDFDocument(bytes),
  sourcePage = source.loadPage(0);
const pixmap = sourcePage.toPixmap(
  mupdf.Matrix.scale(2, 2),
  mupdf.ColorSpace.DeviceRGB,
  false,
);
const scan = await PDFDocument.create();
const scanPage = scan.addPage([595, 842]);
scanPage.drawImage(await scan.embedPng(pixmap.asPNG()), {
  x: 0,
  y: 0,
  width: 595,
  height: 842,
});
await writeFile("tests/fixtures/scanned-text.pdf", await scan.save());
pixmap.destroy();
sourcePage.destroy();
source.destroy();
const images = await PDFDocument.create();
const imagePage = images.addPage([400, 500]);
const png = await images.embedPng(
  await readFile("tests/fixtures/replacement-image.png"),
);
imagePage.drawImage(png, { x: 70, y: 150, width: 120, height: 80 });
imagePage.drawImage(png, { x: 110, y: 180, width: 120, height: 80 });
imagePage.setCropBox(20, 30, 330, 420);
imagePage.setRotation(degrees(90));
await writeFile("tests/fixtures/overlapping-images.pdf", await images.save());
