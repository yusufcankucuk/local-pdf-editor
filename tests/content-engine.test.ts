import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts, degrees } from "pdf-lib";
import * as mupdf from "mupdf";
import { readContentPage, eraseContentPage } from "../src/lib/contentEngine.ts";
async function fixture(rotation = 0) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([400, 500]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText("Original text", { x: 30, y: 440, size: 18, font });
  page.drawText("Keep this text", { x: 30, y: 400, size: 18, font });
  const image = await pdf.embedPng(
    Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=",
      ),
      (c) => c.charCodeAt(0),
    ),
  );
  page.drawImage(image, { x: 70, y: 150, width: 120, height: 80 });
  page.setRotation(degrees(rotation));
  return await pdf.save();
}
test("native text removal deletes text while preserving other text and image, including page rotation", async () => {
  for (const rotation of [0, 90, 180, 270]) {
    const doc = new mupdf.PDFDocument(await fixture(rotation));
    try {
      const targets = readContentPage(doc, 0);
      const target = targets.find(
        (t) => t.overlay.kind === "text" && t.overlay.text === "Original text",
      );
      assert.ok(target);
      const bytes = eraseContentPage(doc, 0, [target.removal]);
      const result = new mupdf.PDFDocument(bytes);
      try {
        const remaining = readContentPage(result, 0);
        assert.ok(
          !remaining.some(
            (t) =>
              t.overlay.kind === "text" &&
              t.overlay.text.includes("Original text"),
          ),
        );
        assert.ok(
          remaining.some(
            (t) =>
              t.overlay.kind === "text" &&
              t.overlay.text.includes("Keep this text"),
          ),
        );
        assert.equal(
          remaining.filter((t) => t.overlay.kind === "image").length,
          1,
        );
      } finally {
        result.destroy();
      }
    } finally {
      doc.destroy();
    }
  }
});
test("native image removal deletes the image object and preserves text", async () => {
  const doc = new mupdf.PDFDocument(await fixture());
  try {
    const image = readContentPage(doc, 0).find(
      (t) => t.overlay.kind === "image",
    );
    assert.ok(image);
    const result = new mupdf.PDFDocument(
      eraseContentPage(doc, 0, [image.removal]),
    );
    try {
      const remaining = readContentPage(result, 0);
      assert.equal(
        remaining.filter((t) => t.overlay.kind === "image").length,
        0,
      );
      assert.equal(
        remaining.filter((t) => t.overlay.kind === "text").length,
        2,
      );
    } finally {
      result.destroy();
    }
  } finally {
    doc.destroy();
  }
});

test("editing a large headline preserves the nearby line with overlapping font metrics", async () => {
  const { readFileSync } = await import("node:fs");
  const doc = new mupdf.PDFDocument(
    readFileSync("src/assets/studio-notes.pdf"),
  );
  try {
    const before = readContentPage(doc, 0);
    const selected = before.find(
      (t) => t.overlay.kind === "text" && t.overlay.text.startsWith("Room for"),
    );
    assert.ok(selected);
    const result = new mupdf.PDFDocument(
      eraseContentPage(doc, 0, [
        {
          ...selected.removal,
          rect: selected.removal.rects![0],
          rects: undefined,
        },
      ]),
    );
    try {
      const after = readContentPage(result, 0);
      assert.ok(
        after.some(
          (t) =>
            t.overlay.kind === "text" && t.overlay.text.includes("good ideas."),
        ),
      );
      assert.ok(
        !after.some(
          (t) =>
            t.overlay.kind === "text" && t.overlay.text.includes("Room for"),
        ),
      );
    } finally {
      result.destroy();
    }
  } finally {
    doc.destroy();
  }
});

test("single-page previews preserve cropped and rotated PDF coordinates", async () => {
  const editable = await PDFDocument.load(await fixture(90));
  editable.getPage(0).setCropBox(20, 30, 300, 420);
  editable.addPage([200, 200]);
  const doc = new mupdf.PDFDocument(await editable.save());
  try {
    const target = readContentPage(doc, 0).find(
      (t) => t.overlay.kind === "text" && t.overlay.text === "Original text",
    );
    assert.ok(target);
    const preview = new mupdf.PDFDocument(
      eraseContentPage(doc, 0, [target.removal], true),
    );
    try {
      assert.equal(preview.countPages(), 1);
      assert.ok(
        readContentPage(preview, 0).some(
          (t) =>
            t.overlay.kind === "text" && t.overlay.text === "Keep this text",
        ),
      );
      assert.ok(
        !readContentPage(preview, 0).some(
          (t) =>
            t.overlay.kind === "text" && t.overlay.text === "Original text",
        ),
      );
    } finally {
      preview.destroy();
    }
  } finally {
    doc.destroy();
  }
});

test("removing one image preserves a neighboring image", async () => {
  const pdf = await PDFDocument.load(await fixture());
  const page = pdf.getPage(0);
  const image = await pdf.embedPng(
    Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=",
      ),
      (c) => c.charCodeAt(0),
    ),
  );
  page.drawImage(image, { x: 240, y: 150, width: 100, height: 80 });
  const doc = new mupdf.PDFDocument(await pdf.save());
  try {
    const before = readContentPage(doc, 0);
    const images = before.filter((t) => t.overlay.kind === "image");
    assert.equal(images.length, 2);
    const after = new mupdf.PDFDocument(
      eraseContentPage(doc, 0, [images[0].removal]),
    );
    try {
      assert.equal(
        readContentPage(after, 0).filter((t) => t.overlay.kind === "image")
          .length,
        1,
      );
    } finally {
      after.destroy();
    }
  } finally {
    doc.destroy();
  }
});

test("transformed native images keep orientation and transparency when replaced", async () => {
  const bitmap = new mupdf.Pixmap(
    mupdf.ColorSpace.DeviceRGB,
    [0, 0, 64, 64],
    true,
  );
  const samples = bitmap.getPixels();
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const offset = (y * 64 + x) * 4;
      samples.set(
        x < 32
          ? y < 32
            ? [255, 0, 0, 255]
            : [0, 128, 0, 128]
          : y < 32
            ? [0, 0, 255, 255]
            : [0, 0, 0, 0],
        offset,
      );
    }
  const png = bitmap.asPNG().slice();
  bitmap.destroy();
  for (const angle of [0, 90, 35])
    for (const reflected of [false, true]) {
      const original = await PDFDocument.create();
      const page = original.addPage([400, 400]);
      page.drawImage(await original.embedPng(png), {
        x: 180,
        y: 130,
        width: reflected ? -100 : 100,
        height: 80,
        rotate: degrees(angle),
      });
      const doc = new mupdf.PDFDocument(await original.save());
      try {
        const target = readContentPage(doc, 0).find(
          (item) => item.overlay.kind === "image",
        );
        assert.ok(target);
        const overlay = target.overlay;
        assert.equal(overlay.kind, "image");
        if (overlay.kind !== "image") return;
        const replacement = await PDFDocument.load(
          eraseContentPage(doc, 0, [target.removal]),
        );
        replacement
          .getPage(0)
          .drawImage(await replacement.embedPng(overlay.data), {
            x: overlay.x,
            y: overlay.y,
            width: overlay.width,
            height: overlay.height,
          });
        const output = new mupdf.PDFDocument(await replacement.save());
        const beforePage = new mupdf.PDFDocument(await original.save());
        try {
          const aPage = beforePage.loadPage(0),
            bPage = output.loadPage(0);
          const a = aPage.toPixmap(
            mupdf.Matrix.identity,
            mupdf.ColorSpace.DeviceRGB,
            false,
          );
          const b = bPage.toPixmap(
            mupdf.Matrix.identity,
            mupdf.ColorSpace.DeviceRGB,
            false,
          );
          try {
            const ap = a.getPixels(),
              bp = b.getPixels();
            let difference = 0;
            for (let i = 0; i < ap.length; i++)
              difference += Math.abs(ap[i] - bp[i]);
            // Edge antialiasing may vary after extraction; orientation/alpha errors affect large regions.
            assert.ok(
              difference / ap.length < 1.5,
              `angle ${angle}, reflected ${reflected}: average pixel error ${difference / ap.length}`,
            );
          } finally {
            a.destroy();
            b.destroy();
            aPage.destroy();
            bPage.destroy();
          }
        } finally {
          output.destroy();
          beforePage.destroy();
        }
      } finally {
        doc.destroy();
      }
    }
});

test("digital paragraph groups its lines while keeping the next paragraph separate", async () => {
  const { readFileSync } = await import("node:fs");
  const pdf = new mupdf.PDFDocument(
    readFileSync("tests/fixtures/paragraphs.pdf"),
  );
  try {
    const before = readContentPage(pdf, 0);
    const paragraph = before.find(
      (t) =>
        t.overlay.kind === "text" && t.overlay.text.startsWith("Bir paragraf"),
    );
    assert.ok(paragraph);
    assert.equal(paragraph.removal.rects?.length, 3);
    const after = new mupdf.PDFDocument(
      eraseContentPage(pdf, 0, [paragraph.removal]),
    );
    try {
      const targets = readContentPage(after, 0);
      assert.ok(
        !targets.some(
          (t) =>
            t.overlay.kind === "text" && t.overlay.text.includes("Bu satir"),
        ),
      );
      assert.ok(
        targets.some(
          (t) =>
            t.overlay.kind === "text" &&
            t.overlay.text.includes("Ikinci paragraf"),
        ),
      );
    } finally {
      after.destroy();
    }
  } finally {
    pdf.destroy();
  }
});
test("deleting one overlapping image preserves the other draw, mask, crop and rotation", async () => {
  const { readFileSync } = await import("node:fs");
  const pdf = new mupdf.PDFDocument(
    readFileSync("tests/fixtures/overlapping-images.pdf"),
  );
  try {
    const before = readContentPage(pdf, 0).filter(
      (t) => t.overlay.kind === "image",
    );
    assert.equal(before.length, 2);
    const remaining = new mupdf.PDFDocument(
      eraseContentPage(pdf, 0, [before[0].removal]),
    );
    try {
      const after = readContentPage(remaining, 0).filter(
        (t) => t.overlay.kind === "image",
      );
      assert.equal(after.length, 1);
      assert.deepEqual(after[0].bounds, before[1].bounds);
      assert.deepEqual(
        after[0].overlay.kind === "image" && after[0].overlay.data,
        before[1].overlay.kind === "image" && before[1].overlay.data,
      );
      assert.deepEqual(
        remaining.findPage(0).get("CropBox").asJS(),
        pdf.findPage(0).get("CropBox").asJS(),
      );
      assert.equal(remaining.findPage(0).get("Rotate").asNumber(), 90);
    } finally {
      remaining.destroy();
    }
  } finally {
    pdf.destroy();
  }
});
test("a reused form image is removed from only its selected invocation", async () => {
  const { readFileSync } = await import("node:fs");
  const pdf = new mupdf.PDFDocument();
  const image = new mupdf.Image(
    readFileSync("tests/fixtures/replacement-image.png"),
  );
  const ref = pdf.addImage(image);
  image.destroy();
  const form = pdf.addStream("/Photo Do", {
    Type: pdf.newName("XObject"),
    Subtype: pdf.newName("Form"),
    BBox: [0, 0, 1, 1],
    Resources: { XObject: { Photo: ref } },
  });
  pdf.insertPage(
    0,
    pdf.addPage(
      [0, 0, 400, 500],
      0,
      { XObject: { Shared: form } },
      "q 120 0 0 80 50 150 cm /Shared Do Q\nq 120 0 0 80 220 150 cm /Shared Do Q",
    ),
  );
  try {
    const targets = readContentPage(pdf, 0).filter(
      (t) => t.overlay.kind === "image",
    );
    assert.equal(targets.length, 2);
    const after = new mupdf.PDFDocument(
      eraseContentPage(pdf, 0, [targets[0].removal]),
    );
    try {
      const remaining = readContentPage(after, 0).filter(
        (t) => t.overlay.kind === "image",
      );
      assert.equal(remaining.length, 1);
      assert.deepEqual(remaining[0].bounds, targets[1].bounds);
    } finally {
      after.destroy();
    }
  } finally {
    pdf.destroy();
  }
});
test("scan editing removes only chosen image pixels and preserves the rest of the raster", async () => {
  const { readFileSync } = await import("node:fs");
  const original = new mupdf.PDFDocument(
    readFileSync("tests/fixtures/scanned-text.pdf"),
  );
  const beforePage = original.loadPage(0),
    before = beforePage.toPixmap(
      mupdf.Matrix.scale(2, 2),
      mupdf.ColorSpace.DeviceRGB,
      false,
    );
  try {
    const rect: [number, number, number, number] = [45, 675, 440, 755];
    const result = new mupdf.PDFDocument(
      eraseContentPage(original, 0, [{ id: "scan", kind: "scan", rect }]),
    );
    const afterPage = result.loadPage(0),
      after = afterPage.toPixmap(
        mupdf.Matrix.scale(2, 2),
        mupdf.ColorSpace.DeviceRGB,
        false,
      );
    try {
      const a = before.getPixels(),
        b = after.getPixels(),
        width = before.getWidth();
      let changed = 0;
      for (let y = 0; y < before.getHeight(); y++)
        for (let x = 0; x < width; x++) {
          const inRect = x >= 90 && x < 880 && y >= 174 && y < 334;
          for (let channel = 0; channel < 3; channel++) {
            const i = (y * width + x) * 3 + channel;
            if (inRect) {
              assert.ok(b[i] >= 250);
              if (a[i] !== b[i]) changed++;
            } else assert.equal(b[i], a[i]);
          }
        }
      assert.ok(changed > 1000, "Original paragraph ink removed");
    } finally {
      after.destroy();
      afterPage.destroy();
      result.destroy();
    }
  } finally {
    before.destroy();
    beforePage.destroy();
    original.destroy();
  }
});

function pixels(pdf: mupdf.PDFDocument) {
  const page = pdf.loadPage(0);
  const pixmap = page.toPixmap(
    mupdf.Matrix.identity,
    mupdf.ColorSpace.DeviceRGB,
    false,
  );
  try {
    return pixmap.getPixels().slice();
  } finally {
    pixmap.destroy();
    page.destroy();
  }
}
test("native image selection is pixel-identical; resizing and replacing retain foreground text and paint order", async () => {
  const { readFileSync } = await import("node:fs");
  const original = await PDFDocument.create();
  const page = original.addPage([400, 500]);
  const png = readFileSync("tests/fixtures/replacement-image.png");
  page.drawImage(await original.embedPng(png), {
    x: 70,
    y: 150,
    width: 120,
    height: 80,
  });
  page.drawText("FOREGROUND", { x: 80, y: 180, size: 15 });
  page.drawText("OUTSIDE", { x: 25, y: 450, size: 15 });
  const bytes = await original.save();
  const doc = new mupdf.PDFDocument(bytes);
  try {
    const target = readContentPage(doc, 0).find(
      (t) => t.overlay.kind === "image",
    )!;
    assert.equal(target.overlay.kind, "image");
    if (target.overlay.kind !== "image") return;
    const image = target.overlay;
    const edit = {
      ...target.removal,
      replacement: {
        x: image.x,
        y: image.y,
        width: image.width,
        height: image.height,
        opacity: 1,
      },
    };
    const originalPixels = pixels(doc);
    const selected = new mupdf.PDFDocument(eraseContentPage(doc, 0, [edit]));
    try {
      assert.deepEqual(pixels(selected), originalPixels);
    } finally {
      selected.destroy();
    }
    for (const data of [undefined, image.data]) {
      const source = new mupdf.PDFDocument(bytes);
      const edited = new mupdf.PDFDocument(
        eraseContentPage(source, 0, [
          {
            ...edit,
            replacement: { ...edit.replacement, width: 180, height: 120, data },
          },
        ]),
      );
      try {
        const editedPage = edited.loadPage(0),
          text = editedPage.toStructuredText("");
        const content = text.asText();
        text.destroy();
        editedPage.destroy();
        assert.ok(
          content.includes("FOREGROUND") && content.includes("OUTSIDE"),
        );
        // Pixels on the foreground's black glyphs remain black after image changes.
        const before = originalPixels,
          after = pixels(edited);
        let checked = 0;
        for (let y = 305; y < 322; y++)
          for (let x = 80; x < 188; x++) {
            const at = (y * 400 + x) * 3;
            if (before[at] < 10 && before[at + 1] < 10 && before[at + 2] < 10) {
              assert.ok(
                after[at] < 20 && after[at + 1] < 20 && after[at + 2] < 20,
              );
              checked++;
            }
          }
        assert.ok(checked > 20);
      } finally {
        source.destroy();
        edited.destroy();
      }
    }
  } finally {
    doc.destroy();
  }
});

test("bitonal stencil scans preserve their original appearance on selection and resize", async () => {
  const pdf = new mupdf.PDFDocument();
  const image = pdf.addStream(
    new Uint8Array([0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55]),
    {
      Type: "XObject",
      Subtype: "Image",
      Width: 8,
      Height: 8,
      BitsPerComponent: 1,
      ImageMask: true,
      Decode: [1, 0],
    },
  );
  pdf.insertPage(
    0,
    pdf.addPage(
      [0, 0, 200, 200],
      0,
      { XObject: { Scan: image } },
      "q 0 g 200 0 0 200 0 0 cm /Scan Do Q",
    ),
  );
  try {
    const target = readContentPage(pdf, 0).find(
      (t) => t.overlay.kind === "image",
    )!;
    assert.ok(target.pageRaster);
    const selected = new mupdf.PDFDocument(
      eraseContentPage(pdf, 0, [
        {
          ...target.removal,
          replacement: { x: 0, y: 0, width: 200, height: 200, opacity: 1 },
        },
      ]),
    );
    try {
      assert.deepEqual(pixels(selected), pixels(pdf));
    } finally {
      selected.destroy();
    }
    const originalPixels = pixels(pdf);
    const cropped = new mupdf.PDFDocument(
      eraseContentPage(pdf, 0, [
        { id: "region", kind: "scan", rect: [50, 50, 100, 100] },
      ]),
    );
    try {
      const after = pixels(cropped);
      for (let y = 0; y < 200; y++)
        for (let x = 0; x < 200; x++) {
          const at = (y * 200 + x) * 3;
          if (x < 49 || x > 101 || y < 99 || y > 151)
            assert.deepEqual(
              after.subarray(at, at + 3),
              originalPixels.subarray(at, at + 3),
            );
        }
    } finally {
      cropped.destroy();
    }
    const resized = new mupdf.PDFDocument(
      eraseContentPage(pdf, 0, [
        {
          ...target.removal,
          replacement: { x: 20, y: 20, width: 100, height: 100, opacity: 1 },
        },
      ]),
    );
    try {
      const after = pixels(resized);
      assert.ok(after.some((v) => v === 0) && after.some((v) => v === 255));
      assert.equal(after[(10 * 200 + 10) * 3], 255);
      assert.deepEqual(
        readContentPage(resized, 0).find((t) => t.overlay.kind === "image")
          ?.bounds,
        [20, 20, 120, 120],
      );
    } finally {
      resized.destroy();
    }
    if (target.overlay.kind !== "image") return;
    const png = new mupdf.Image(
      Uint8Array.from(atob(target.overlay.data.split(",")[1]), (c) =>
        c.charCodeAt(0),
      ),
    );
    const raster = png.toPixmap();
    try {
      assert.ok(raster.getPixels().some((v) => v === 255));
      assert.ok(raster.getPixels().some((v) => v === 0));
    } finally {
      raster.destroy();
      png.destroy();
    }
  } finally {
    pdf.destroy();
  }
});

test("scan word replacement restores sampled paper color without changing adjacent table lines", async () => {
  const { readFileSync } = await import("node:fs");
  const doc = new mupdf.PDFDocument(
    readFileSync("tests/fixtures/scanned-notebook.pdf"),
  );
  try {
    const before = pixels(doc),
      rect: [number, number, number, number] = [55, 705, 85, 716];
    const result = new mupdf.PDFDocument(
      eraseContentPage(doc, 0, [
        { id: "word", kind: "scan", rect, fillColors: [[0.88, 0.86, 0.82]] },
      ]),
    );
    try {
      const after = pixels(result);
      for (let y = 0; y < 842; y++)
        for (let x = 0; x < 595; x++) {
          const at = (y * 595 + x) * 3;
          if (x < 54 || x > 86 || y < 125 || y > 138)
            assert.deepEqual(
              after.subarray(at, at + 3),
              before.subarray(at, at + 3),
            );
        }
      const sample = ((842 - 710) * 595 + 65) * 3;
      assert.ok(
        Math.abs(after[sample] - 224) < 2 &&
          Math.abs(after[sample + 2] - 209) < 2,
      );
    } finally {
      result.destroy();
    }
  } finally {
    doc.destroy();
  }
});
