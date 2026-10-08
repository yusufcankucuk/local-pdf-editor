async page => {
 await page.addInitScript(()=>{window.confirm=()=>true;window.addEventListener('beforeunload',e=>e.stopImmediatePropagation(),{capture:true});});
 await page.evaluate(()=>{window.confirm=()=>true;window.addEventListener('beforeunload',e=>e.stopImmediatePropagation(),{capture:true});});
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('http://127.0.0.1:5173/?images='+Date.now());
 const button=name=>page.getByRole('button',{name,exact:true});const assert=(v,m)=>{if(!v)throw new Error(m);};
 await page.locator('input[aria-label="PDF dosyası seç"]').setInputFiles('tests/fixtures/native-image.pdf');
 await page.getByRole('heading',{name:'native-image.pdf',exact:true}).waitFor();
 await button('PDF görselini düzenle').waitFor({timeout:60000});await button('PDF görselini düzenle').click();
 await page.getByLabel('Seçili görsel genişliği').fill('240');
 assert(await page.locator('.annotation-overlay [data-native-image]').getAttribute('width')==='240','Native image resized');
 let download=page.waitForEvent('download');await button('PDF indir').click();await(await download).saveAs('artifacts/native-image-resized.pdf');
 await button('Eklemeyi sil').click();
 assert(await page.locator('.annotation-overlay [data-native-image]').count()===0,'Native image deleted');
 download=page.waitForEvent('download');await button('PDF indir').click();await(await download).saveAs('artifacts/native-image-deleted.pdf');
 await button('Geri al').click();assert(await page.locator('.annotation-overlay [data-native-image]').count()===1,'Undo image delete');
 await button('Geri al').click();await button('Geri al').click();
 await button('PDF içeriğini düzenle').click();await button('PDF görselini düzenle').waitFor();
 for(const shape of ['triangle','line','arrow']) {
  await button({triangle:'Üçgen çiz',line:'Çizgi çiz',arrow:'Ok çiz'}[shape]).click();
  const box=await page.locator('.annotation-overlay').boundingBox();
  await page.mouse.move(box.x+260,box.y+100);await page.mouse.down();await page.mouse.move(box.x+350,box.y+180,{steps:5});await page.mouse.up();
  await button('Düzenlemeyi kapat').click();
 }
 assert(await page.locator('.annotation-overlay polygon').count()===1,'Triangle');
 assert(await page.locator('.annotation-overlay line').count()===4,'Line and arrow');
 download=page.waitForEvent('download');await button('PDF indir').click();await(await download).saveAs('artifacts/new-shapes.pdf');
 await page.setViewportSize({width:390,height:844});await button('PDF içeriğini düzenle').click();await button('PDF görselini düzenle').waitFor();
 await page.screenshot({path:'artifacts/native-image-mobile.png'});
 return {passed:true,checks:['native image select/resize/delete','image undo','triangle/line/arrow export','mobile content selection']};
}
