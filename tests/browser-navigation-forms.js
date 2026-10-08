async page => {
  await page.addInitScript(() => { window.confirm = () => true; window.addEventListener('beforeunload', event => event.stopImmediatePropagation(), {capture:true}); });
  await page.evaluate(() => {window.confirm=()=>true;window.addEventListener('beforeunload',event=>event.stopImmediatePropagation(),{capture:true});});

  const button=name=>page.getByRole('button',{name,exact:true});
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  await page.setViewportSize({width:1440,height:1000});
  await page.reload();await page.locator('.textLayer span').first().waitFor();
  await page.locator('input[aria-label="PDF dosyası seç"]').setInputFiles('tests/fixtures/outline.pdf');
  await page.getByRole('heading',{name:'outline.pdf',exact:true}).waitFor();
  await button('İçindekiler').click();await button('Studio questions 2').click();
  await page.getByRole('img',{name:'2. sayfanın önizlemesi',exact:true}).waitFor();
  await page.locator('input[aria-label="PDF dosyası seç"]').setInputFiles('tests/fixtures/form.pdf');
  await page.getByRole('heading',{name:'form.pdf',exact:true}).waitFor();
  await button('Form doldur').click();
  await page.getByRole('textbox',{name:'Ad soyad',exact:true}).fill('Çağrı Şahin');
  await page.getByRole('checkbox',{name:'Onay',exact:true}).check();
  await page.getByRole('combobox',{name:'Belge turu',exact:true}).selectOption('B');
  assert(await page.getByRole('textbox',{name:'Ad soyad',exact:true}).inputValue()==='Çağrı Şahin','Form text must be retained');
  await button('Geri al').click();
  assert(await page.getByRole('combobox',{name:'Belge turu',exact:true}).inputValue()==='A','Undo must restore form choice');
  await button('İleri al').click();
  const pending=page.waitForEvent('download');await button('PDF indir').click();await (await pending).saveAs('artifacts/filled-form.pdf');
  await page.waitForFunction(()=>document.querySelector('.editor-notice')?.textContent.includes('PDF indirildi'));
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('input[aria-label="PDF dosyası seç"]').setInputFiles('artifacts/filled-form.pdf');
  await page.getByRole('heading',{name:'filled-form.pdf',exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelector('.textLayer')?.textContent.includes('Çağrı Şahin'));
  return {passed:true,checks:['outline navigation','form text','checkbox','dropdown','form undo/redo','Turkish form text survives export and reopen']};
}
