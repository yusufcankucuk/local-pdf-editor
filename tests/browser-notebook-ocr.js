async page => {
  const assert=(v,m)=>{if(!v)throw new Error(m)};
  const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
  await page.addInitScript(()=>{window.confirm=()=>true;window.addEventListener('beforeunload',e=>e.stopImmediatePropagation(),{capture:true})});
  await page.setViewportSize({width:1440,height:1100});
  const origin=new URL(page.url()).origin;
  await page.goto(origin+'/?notebook='+Date.now());
  const button=name=>page.getByRole('button',{name,exact:true});
  await page.locator('input[aria-label="PDF dosyası seç"]').setInputFiles('tests/fixtures/scanned-notebook.pdf');
  await page.getByRole('heading',{name:'scanned-notebook.pdf',exact:true}).waitFor();
  await button('Yazı alanını seç').waitFor({timeout:60000});
  await page.getByRole('combobox',{name:'OCR analiz düzeni'}).selectOption('block');
  const selectRegion=async(x,y,w,h)=>{
    await button('Yazı alanını seç').click();
    const r=await page.locator('.native-targets').boundingBox(),s=r.width/595;
    await page.mouse.move(r.x+x*s,r.y+y*s);await page.mouse.down();await page.mouse.move(r.x+(x+w)*s,r.y+(y+h)*s,{steps:12});await page.mouse.up();
  };
  await selectRegion(50,120,275,78);
  await page.getByRole('button',{name:/Taranmış metni düzenle/}).first().waitFor({timeout:120000});
  const text=await page.getByRole('button',{name:/Taranmış metni düzenle/}).evaluateAll(items=>items.map(i=>i.title).join(' '));
  assert(/ölçüm|Bugün/i.test(text),'Recognizes low contrast notebook region: '+text);
  assert(!text.includes('İkinci sütun'),'Region excludes neighboring column');
  await page.getByRole('combobox',{name:'Taranmış yazı seçim birimi'}).selectOption('line');
  const lines=page.getByRole('button',{name:/Taranmış metni düzenle/});const lineCount=await lines.count();assert(lineCount>=2,'Line selection');
  await page.getByRole('combobox',{name:'Taranmış yazı seçim birimi'}).selectOption('word');
  const words=page.getByRole('button',{name:/Taranmış metni düzenle/});assert(await words.count()>lineCount,'Word selection');
  await words.first().click();
  const input=page.getByRole('textbox',{name:'Seçili metni düzenle'});assert(!(await input.inputValue()).includes('\n'),'Only a word selected');
  await input.fill('Yarın');
  await page.getByLabel('Font dosyası seç').setInputFiles([
    '/System/Library/Fonts/Supplemental/Times New Roman.ttf',
    '/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf',
    '/System/Library/Fonts/Supplemental/Times New Roman Italic.ttf',
    '/System/Library/Fonts/Supplemental/Times New Roman Bold Italic.ttf',
  ]);
  await page.waitForFunction(()=>document.querySelector('select[aria-label="Yazı tipi"]')?.selectedOptions[0]?.textContent==='Times New Roman');
  await button('Kalın yazı').click();await button('Eğik yazı').click();
  assert(await button('Kalın yazı').getAttribute('aria-pressed')==='true','Times bold');
  assert(await page.locator('.annotation-overlay text').getAttribute('font-family').then(v=>v.startsWith('PdfEditorLocal_')),'Actual loaded Times preview');
  await button('Bitti').click();
  await page.locator('.annotation-overlay text').waitFor({state:'visible'});
  const download=page.waitForEvent('download');await button('PDF indir').click();await(await download).saveAs('artifacts/notebook-times-edited.pdf');
  await page.screenshot({path:'artifacts/notebook-word-edited.png'});
  for(let i=0;i<8 && await page.locator('.annotation-overlay text').count()>0;i++) await button('Geri al').click();
  assert(await page.locator('.annotation-overlay text').count()===0,'Undo returns original scan');
  await page.getByRole('combobox',{name:'OCR analiz düzeni'}).selectOption('sparse');
  await button('Alanı yeniden tanı').click();
  await words.first().waitFor({timeout:120000});
  await selectRegion(60,230,240,32);
  await button('Alanı elle yaz').waitFor();
  await page.waitForFunction(()=>!document.querySelector('.ocr-status')?.textContent.includes('Yerel dil modeli hazırlanıyor') && !Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='İptal et'));
  await button('Alanı elle yaz').click();await input.fill('Elle düzeltme de çalışıyor.');await button('Bitti').click();
  await page.locator('.annotation-overlay text').waitFor({state:'visible'});
  await page.locator('.annotation-overlay text').click();
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    await page.locator('.text-editor-panel').scrollIntoViewIfNeeded();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile page fits '+width);
    const r=await page.locator('.text-editor-panel').boundingBox();assert(r.x>=0&&r.x+r.width<=width,'Mobile text panel');
    await page.screenshot({path:'artifacts/notebook-mobile-'+width+'.png'});
  }
  await page.keyboard.press('Escape');await page.setViewportSize({width:1440,height:1100});
  await page.locator('input[aria-label="PDF dosyası seç"]').setInputFiles('artifacts/notebook-times-edited.pdf');
  await page.getByRole('heading',{name:'notebook-times-edited.pdf',exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelector('.main-paper .textLayer')?.textContent.includes('Yarın'));
  assert(errors.length===0,'Browser errors '+errors.join());
  assert(requests.every(r=>r.method==='GET' && (r.url.startsWith(origin+'/')||r.url.startsWith('blob:')||r.url.startsWith('data:'))),'No external requests/uploads');
  return {passed:true,checks:['low contrast ruled notebook region OCR','line/word selection','Times New Roman regular/bold/italic true fonts','export/reopen','undo','sparse analysis','manual fallback','320/390px'],errors};
}
