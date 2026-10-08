async (page) => {
  await page.addInitScript(() => { window.confirm = () => true; window.addEventListener('beforeunload', event => event.stopImmediatePropagation(), {capture:true}); });
  await page.evaluate(() => {window.confirm=()=>true;window.addEventListener('beforeunload',event=>event.stopImmediatePropagation(),{capture:true});});

  const origin = new URL(page.url()).origin;
  const failures = [];
  const requests = [];
  const onError = (error) => failures.push(error.message);
  const onRequest = (request) =>
    requests.push({ url: request.url(), method: request.method() });
  page.on("pageerror", onError);
  page.on("request", onRequest);
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const button = (name) => page.getByRole("button", { name, exact: true });
  const canvasReady = () =>
    page.waitForFunction(() => {
      const canvas = document.querySelector(".main-paper canvas");
      return canvas && canvas.width > 0 && canvas.height > 150;
    });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload();
    await page
      .getByRole("heading", { name: "Studio notes.pdf", exact: true })
      .waitFor();
    await canvasReady();
    await button("Sonraki sayfa").click();
    await page
      .getByRole("img", { name: "2. sayfanın önizlemesi", exact: true })
      .waitFor();
    await button("Sayfayı saat yönünde döndür").click();
    await page.waitForFunction(() => {
      const canvas = document.querySelector(".main-paper canvas");
      return canvas && canvas.width > canvas.height;
    });
    await button("Yakınlaştır").click();
    assert(
      (await page
        .getByRole("combobox", { name: "Yakınlaştırma oranı" })
        .inputValue()) === "110",
      "Zoom must become 110%",
    );
    await button("Bu cihazda").click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });

    const downloadPromise = page.waitForEvent("download");
    await button("Orijinali indir").click();
    const download = await downloadPromise;
    assert(
      download.suggestedFilename() === "Studio notes.pdf",
      "Original file name must be preserved",
    );
    await download.saveAs("artifacts/original-download.pdf");

    await page
      .locator("input[aria-label=\"PDF dosyası seç\"]")
      .setInputFiles({
        name: "not-a-pdf.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("not a PDF"),
      });
    await page.getByRole("alert").waitFor();
    assert(
      (await page.getByRole("alert").textContent()).includes("bir PDF değil"),
      "Invalid file must produce a useful error",
    );
    assert(
      await page
        .getByRole("heading", { name: "Studio notes.pdf", exact: true })
        .isVisible(),
      "Failed open must preserve the prior document",
    );
    await button("Hata mesajını kapat").click();

    await page
      .locator("input[aria-label=\"PDF dosyası seç\"]")
      .setInputFiles("tests/fixtures/password-protected.pdf");
    await page.getByRole("button",{name:"Şifre girişini iptal et",exact:true}).click();
    await page.getByRole("alert").waitFor();
    assert(
      (await page.getByRole("alert").textContent()).includes("Şifre girişi iptal"),
      "Encrypted PDF must fail clearly without hanging",
    );
    assert(
      await page
        .getByRole("heading", { name: "Studio notes.pdf", exact: true })
        .isVisible(),
      "Encrypted-file rejection must preserve the current document",
    );
    await button("Hata mesajını kapat").click();

    await page
      .locator("input[aria-label=\"PDF dosyası seç\"]")
      .setInputFiles({
        name: "broken.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.7\ninvalid document"),
      });
    await page.getByRole("alert").waitFor();
    assert(
      (await page.getByRole("alert").textContent()).includes("PDF açılamadı"),
      "Corrupt PDF must report a parser error",
    );
    await button("Hata mesajını kapat").click();

    await page
      .locator("input[aria-label=\"PDF dosyası seç\"]")
      .setInputFiles("src/assets/studio-notes.pdf");
    await page
      .getByRole("heading", { name: "studio-notes.pdf", exact: true })
      .waitFor();
    await canvasReady();
    assert(
      await page
        .getByRole("img", { name: "1. sayfanın önizlemesi", exact: true })
        .isVisible(),
      "New file must reset the selected page",
    );
    assert(
      (await page.locator(".demo-tag").count()) === 0,
      "User-selected file must not be labeled as a demo",
    );
    await page.locator(".main-paper").click({ position: { x: 10, y: 10 } });
    await page.keyboard.press("ArrowRight");
    await page
      .getByRole("img", { name: "2. sayfanın önizlemesi", exact: true })
      .waitFor();
    await page
      .locator("input[aria-label=\"PDF dosyası seç\"]")
      .setInputFiles("src/assets/studio-notes.pdf");
    await page
      .getByRole("img", { name: "1. sayfanın önizlemesi", exact: true })
      .waitFor();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await canvasReady();
    assert(
      await page
        .getByRole("button", { name: "Belge bilgilerini göster", exact: true })
        .isVisible(),
      "Mobile info panel must start closed",
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      "Mobile shell must not overflow horizontally",
    );
    await button("Belge bilgilerini göster").click();
    await page
      .getByRole("complementary", { name: "Belge bilgileri" })
      .waitFor();
    await button("Belge bilgilerini gizle").click();
    await button("Sayfa listesini gizle").click();
    await page.waitForFunction(() => !document.querySelector(".pages-panel"));
    await page.screenshot({ path: "artifacts/mobile.png" });
    await page.setViewportSize({ width: 320, height: 740 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      "320px shell must not overflow",
    );

    const externalRequests = requests.filter(
      ({ url }) =>
        !url.startsWith(`${origin}/`) &&
        !url.startsWith("blob:") &&
        !url.startsWith("data:"),
    );
    assert(
      externalRequests.length === 0,
      `External requests: ${JSON.stringify(externalRequests)}`,
    );
    assert(
      requests.every(({ method }) => method === "GET"),
      "No document upload or other write request is allowed",
    );
    assert(
      failures.length === 0,
      `Browser errors: ${JSON.stringify(failures)}`,
    );
    assert(
      await page.evaluate(
        () => localStorage.length === 0 && sessionStorage.length === 0,
      ),
      "Document session must not be stored",
    );

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload();
    await canvasReady();
    await page.screenshot({ path: "artifacts/desktop.png" });
    return {
      passed: true,
      checks: [
        "PDF render",
        "page navigation",
        "preview rotation",
        "zoom",
        "dialog / Escape",
        "original download",
        "invalid / corrupt / encrypted files",
        "preserve existing document on error",
        "file upload / session reset",
        "keyboard navigation",
        "390px and 320px layout",
        "mobile panel controls",
        "no external requests or uploads",
        "no persistent session",
      ],
      requests: requests.length,
    };
  } finally {
    page.off("pageerror", onError);
    page.off("request", onRequest);
  }
}
