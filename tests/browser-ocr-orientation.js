async page => {
  const origin = new URL(page.url()).origin;
  await page.setViewportSize({width:1440,height:1100});
  await page.goto(origin+'/?orientation='+Date.now());
  await page.locator('input[aria-label="PDF dosyası seç"]').setInputFiles('tests/fixtures/scanned-notebook-rotated.pdf');
  await page.getByRole('heading',{name:'scanned-notebook-rotated.pdf',exact:true}).waitFor();
  await page.getByRole('combobox',{name:'OCR yazı yönü'}).selectOption('90');
  await page.getByRole('button',{name:'Taranmış yazıyı tanı',exact:true}).click();
  const targets=page.getByRole('button',{name:/Taranmış metni düzenle/});
  await targets.first().waitFor({timeout:120000});
  const found=await targets.evaluateAll(items=>items.findIndex(i=>i.title.includes('Bugün')));
  if(found<0)throw new Error('Rotated scan not recognized');
  await targets.nth(found).click();
  await page.getByRole('textbox',{name:'Seçili metni düzenle'}).fill('Yön testi');
  await page.getByRole('button',{name:'Bitti',exact:true}).click();
  const text=page.locator('.annotation-overlay text');
  await text.waitFor({state:'visible'});
  if(!(await text.getAttribute('transform')).includes('rotate(90)'))throw new Error('Source orientation lost');
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'PDF indir',exact:true}).click();
  await(await download).saveAs('artifacts/notebook-rotated-edited.pdf');
  await page.screenshot({path:'artifacts/notebook-rotated-edited.png'});
  await page.locator('input[aria-label="PDF dosyası seç"]').setInputFiles('artifacts/notebook-rotated-edited.pdf');
  await page.getByRole('heading',{name:'notebook-rotated-edited.pdf',exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelector('.main-paper .textLayer')?.textContent.includes('Yön testi'));
  return {passed:true,checks:['90 degree raster OCR','source orientation preview','export/reopen']};
}
