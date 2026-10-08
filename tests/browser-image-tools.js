async page => {
  await page.addInitScript(() => {window.confirm=()=>true;window.addEventListener('beforeunload',e=>e.stopImmediatePropagation(),{capture:true});});
  await page.evaluate(() => {window.confirm=()=>true;window.addEventListener('beforeunload',e=>e.stopImmediatePropagation(),{capture:true});});
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://127.0.0.1:5173/?image-tools='+Date.now());
  const button=name=>page.getByRole('button',{name,exact:true});
  const assert=(v,m)=>{if(!v)throw new Error(m);};
  await page.locator('input[aria-label="PDF dosyası seç"]').setInputFiles('tests/fixtures/native-image.pdf');
  await button('PDF görselini düzenle').waitFor({timeout:60000});
  assert(await button('PDF içeriğini düzenle').getAttribute('class')!=='selected','Image accessible in view');
  await button('PDF görselini düzenle').click();
  const native=page.locator('.annotation-overlay [data-native-image]');
  await page.getByLabel('Seçili görsel genişliği').fill('180');
  await page.getByLabel('Yeni görsel seç').setInputFiles('tests/fixtures/replacement-image.png');
  await page.waitForFunction(()=>document.querySelector('.annotation-overlay [data-native-image]')?.getAttribute('height')==='144');
  await page.getByLabel('Görsel saydamlığı').fill('50');
  assert(await page.getByLabel('Görsel saydamlığı').inputValue()==='50','Image opacity setting');
  assert(await page.locator('.annotation-overlay image').count()===0,'Native image rendered at original source layer');
  await native.click();
  const position=async()=> [Number(await native.getAttribute('x')),Number(await native.getAttribute('y'))];
  const [x,y]=await position();
  await page.keyboard.press('ArrowRight');await page.keyboard.press('Shift+ArrowUp');
  const [movedX,movedY]=await position();
  assert(movedX===x+1 && movedY===y+10,'Keyboard nudging');
  assert(await button('Arkaya al').isDisabled(),'Native paint order retained');
  await button('Kopyala').click();
  await button('Kopyala').click();
  const image=page.locator('.annotation-overlay image');
  assert(await image.count()===2,'Duplicates become added images');
  const ids=await page.locator('.annotation-overlay image').evaluateAll(items=>items.map(item=>item.closest('[data-overlay-id]').dataset.overlayId));
  await button('Arkaya al').click();
  const reordered=await page.locator('.annotation-overlay image').evaluateAll(items=>items.map(item=>item.closest('[data-overlay-id]').dataset.overlayId));
  assert(reordered[0]===ids[1] && reordered[1]===ids[0],'Move back');
  await button('Geri al').click();
  assert((await page.locator('.annotation-overlay image').evaluateAll(items=>items.map(item=>item.closest('[data-overlay-id]').dataset.overlayId))).join()===ids.join(),'Undo layer order');
  await button('Öne al').isDisabled().then(v=>assert(v,'Front boundary disabled'));
  await button('Geri al').click();
  await button('Geri al').click();
  const download=page.waitForEvent('download');await button('PDF indir').click();await(await download).saveAs('artifacts/image-tools.pdf');
  await page.keyboard.press('Escape');
  for(const [label,selector] of [['Dikdörtgen çiz','rect'],['Elips çiz','ellipse'],['Üçgen çiz','polygon'],['Çizgi çiz','line'],['Ok çiz','line']]) {
    await button(label).click();assert(await button(label).getAttribute('aria-pressed')==='true',label+' selected');
    assert(await page.locator('.context-tools').count()===0,'Draw without popup');
    await page.locator('.annotation-overlay').waitFor({state:'visible'});
    const box=await page.locator('.annotation-overlay').boundingBox();
    await page.mouse.move(box.x+40,box.y+50);await page.mouse.down();await page.mouse.move(box.x+150,box.y+100,{steps:5});await page.mouse.up();
    assert(await page.locator('.annotation-overlay '+selector).count()>0,label+' drawn');
    await page.keyboard.press('Escape');
  }
  await page.screenshot({path:'artifacts/image-tools-desktop.png'});
  for(const width of [390,320]) {
    await page.setViewportSize({width,height:844});
    await native.click();
    await page.waitForFunction(()=>{const r=document.querySelector('.context-tools')?.getBoundingClientRect();return r && r.x>=0 && r.right<=innerWidth && r.bottom<=innerHeight;});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No mobile page overflow');
    await page.screenshot({path:'artifacts/image-tools-'+width+'.png'});
    await page.keyboard.press('Escape');
  }
  return {passed:true,checks:['direct native image selection','replacement and ratio','opacity','1/10pt nudging','layer order and undo','five shape icons','320/390px layout']};
}
