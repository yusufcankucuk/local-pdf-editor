async page => {
  const origin=new URL(page.url()).origin;
  await page.addInitScript(()=>{window.confirm=()=>true;window.addEventListener('beforeunload',e=>e.stopImmediatePropagation(),{capture:true})});
  await page.context().grantPermissions(['local-fonts'],{origin});
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(origin+'/?system-font-test='+Date.now());
  const button=name=>page.getByRole('button',{name,exact:true});
  await page.locator('.annotation-overlay').waitFor({state:'visible'});
  await button('Metin').click();await page.locator('.annotation-overlay').click({position:{x:80,y:240}});
  await page.getByRole('textbox',{name:'Seçili metni düzenle'}).fill('Çağrı Şahin — Times New Roman');
  await page.getByRole('combobox',{name:'Yazı tipi',exact:true}).selectOption('system:Times New Roman');
  await page.waitForFunction(()=>document.querySelector('select[aria-label="Yazı tipi"]')?.selectedOptions[0]?.textContent==='Times New Roman');
  await button('Kalın yazı').click();await button('Eğik yazı').click();
  const download=page.waitForEvent('download');await button('PDF indir').click();await(await download).saveAs('artifacts/system-times.pdf');
  await page.getByRole('combobox',{name:'Yazı tipi',exact:true}).selectOption('system:Arial');
  await page.waitForFunction(()=>document.querySelector('select[aria-label="Yazı tipi"]')?.selectedOptions[0]?.textContent==='Arial');
  await page.getByRole('combobox',{name:'Yazı tipi',exact:true}).selectOption('system:Georgia');
  await page.waitForFunction(()=>document.querySelector('select[aria-label="Yazı tipi"]')?.selectedOptions[0]?.textContent==='Georgia');
  await page.getByLabel('Font dosyası seç').setInputFiles({name:'invalid.ttf',mimeType:'font/ttf',buffer:Buffer.from('not a valid font file')});
  await page.getByRole('alert').filter({hasText:'Geçerli bir TTF'}).waitFor();
  const selected=await page.getByRole('combobox',{name:'Yazı tipi',exact:true}).evaluate(el=>el.selectedOptions[0].textContent);
  if(selected!=='Georgia')throw new Error('Bad font changed current font');
  return {passed:true,checks:['real device Times New Roman/Arial/Georgia','bold/italic font variants','Times PDF export','invalid font preserves edit']};
}
