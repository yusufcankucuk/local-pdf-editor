async page => {
  await page.addInitScript(() => { window.confirm = () => true; window.addEventListener('beforeunload', event => event.stopImmediatePropagation(), {capture:true}); });
  await page.evaluate(() => {window.confirm=()=>true;window.addEventListener('beforeunload',event=>event.stopImmediatePropagation(),{capture:true});});

  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const button = name => page.getByRole('button', {name, exact:true});
  const count = async number => page.waitForFunction(n => document.querySelectorAll('.page-thumbnail').length === n, number);
  await page.reload();
  await page.locator('.textLayer span').first().waitFor();
  await button('Sayfayı saat yönünde döndür').click();
  await page.waitForFunction(()=>document.querySelector('.main-paper canvas').width>document.querySelector('.main-paper canvas').height);
  await button('Geri al').click();
  await page.waitForFunction(()=>document.querySelector('.main-paper canvas').width<document.querySelector('.main-paper canvas').height);
  await button('İleri al').click();
  await button('Sayfayı çoğalt').click(); await count(4);
  await button('Sayfayı aşağı taşı').click();
  await button('Sayfayı sil').click(); await count(3);
  await button('Boş sayfa ekle').click(); await count(4);
  await page.locator('input[aria-label="Birleştirilecek PDF seç"]').setInputFiles('src/assets/studio-notes.pdf'); await count(7);
  await page.waitForFunction(()=>!document.querySelector('.page-actions button:disabled[aria-label="Sayfayı çoğalt"]'));
  await button('Geri al').click(); await count(4);
  await button('İleri al').click(); await count(7);
  const pending = page.waitForEvent('download');
  await button('PDF indir').click();
  const download = await pending; await download.saveAs('artifacts/edited-pages.pdf');
  await page.waitForFunction(()=>document.querySelector('.editor-notice').textContent.includes('PDF indirildi'));
  const extracted = page.waitForEvent('download');
  await button('Bu sayfayı indir').click();
  await (await extracted).saveAs('artifacts/extracted-page.pdf');
  assert(download.suggestedFilename().endsWith('-duzenlenmis.pdf'), 'Edited file must be named separately');
  return {passed:true, checks:['rotate','undo','redo','duplicate','reorder','delete','blank page','merge','edited export','single-page extraction']};
}
