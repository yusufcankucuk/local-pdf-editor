# PDF editörü — Agent çalışma rehberi

PDF editörü kişisel bilgi istemeyen, yerelde çalışan bir PDF editörüdür. Bu dosyayı değişiklik yapmadan önce okuyun; devam eden işlerde `docs/HANDOFF.md` ile durumu kontrol edin, ardından `docs/ARCHITECTURE.md` ve ilgili özellik dosyalarını inceleyin. Ürün dili Türkçedir.

## Vazgeçilmez kurallar

- PDF içeriği, dosya adı, belge metadatası ve kullanıcı girdisi cihaz dışına çıkmaz. Bulut API, analytics, telemetry, reklam, CDN, uzaktaki font veya OCR servisi eklemeyin.
- Belgeler varsayılan olarak yalnızca bellektedir. LocalStorage/IndexedDB üzerinde belge veya dosya adı saklamayın. Kalıcı saklama özelliği ayrıca tasarlanmalı ve kullanıcının açık tercihi olmalıdır.
- PDF JavaScript kodunu çalıştırmayın; `eval`, `dangerouslySetInnerHTML` veya kullanıcı içeriğini HTML olarak enjekte etme kullanmayın.
- Orijinal dosyayı koruyun. İşlenmiş dosyayı yeni bir indirme olarak üretin. Veri kaybını önleyen hata davranışları ve geri alma, gerçek düzenleme özelliklerinin kabul kriteridir.
- Arayüzde olmayan işlevi varmış gibi göstermeyin. Planlanan araçlar devre dışı ve anlaşılır biçimde etiketlidir. “Kaydet” ya da “Düzenlenmiş PDF indir” yalnızca değişiklikler gerçekten PDF'e yazıldığında kullanılabilir.
- Türkçe metinleri, erişilebilir adları, klavye kullanımını, görünür odağı ve dar ekran desteğini koruyun.

## Çalışma düzeni

1. `docs/ROADMAP.md` içinden geçerli kapsamı belirleyin. İstenen değişiklik için 2–5 gözlenebilir kabul kriteri yazın; küçük işler için çalışma notları yeterlidir.
2. Yalnızca ilgili modülleri okuyun. Yeni bağımlılıktan önce mevcut kütüphane ve tarayıcı API'lerini değerlendirin.
3. PDF kütüphanesi ve dosya sınırı kodunu `src/lib/pdf.ts` altında tutun. UI bileşenlerine PDF ayrıştırma veya dosya yazma mantığı dağıtmayın.
4. Özellik kodu ilgili `src/features/<özellik>/` dizininde yaşar. Uygulama kabuğu özellikleri birleştirir; ortak bileşen ancak gerçekten tekrar kullanıldığında çıkarılır.
5. `npm test` ve `npm run build` çalıştırın. Görsel değişikliklerde masaüstü ve dar ekranı tarayıcıda kontrol edin. Dosya akışında geçerli, bozuk ve şifreli PDF davranışını doğrulayın.
6. Ağ panelinde yalnızca aynı kaynaktan uygulama/worker/font istekleri ve geliştirme sunucusunun HMR bağlantısı bulunabilir. Belge aktarımı veya harici kaynak isteği kabul edilmez.
7. Önemli bir aşama tamamlandıysa `docs/HANDOFF.md` devir notunu güncelleyin. Mimari kararı değiştirdiyseniz `docs/ARCHITECTURE.md`; kapsam ilerlediyse `docs/ROADMAP.md`; kurulumu değiştirdiyseniz `README.md` güncelleyin.
8. Sonuçta hangi kontrolleri gerçekten çalıştırdığınızı ve kalan sınırları belirtin. Çalıştırılmayan kontrolü geçmiş saymayın.

## Doğrulama komutları

```sh
npm ci
npm test
npm run build
npm run dev
```

`npm ci` yerel PDF.js kaynaklarını postinstall ile kopyalar. `public/pdf-assets/` üretilen ve git tarafından yok sayılan klasördür; kaynaklar npm paketinden gelir. `package-lock.json` sürüm tekrarlanabilirliği için repoda tutulur.

## Tasarım

`docs/DESIGN.md` görsel kaynak noktasıdır. Pazarlama sayfası değil, belge odaklı çalışma masası tasarlıyoruz. Kullanıcı belgesine ayrılan alanı koruyun. Yeni bir işlem, kullanıcıya anlamlı bir sonuç vermeli; sahte toast veya boş buton eklemeyin.

## Bugünkü sınır

v0.3: metin seçme/arama, sayfa işlemleri, birleştirme/çıkarma, undo/redo, metin/şekil/çizim/görsel/görsel imza ekleme, bağlamsal biçimlendirme ve gerçek PDF dışa aktarma çalışır. Şifreli belgeler salt okunur açılır. Temel form değerleri çıktı üzerinde sabitlenir. Mevcut yatay PDF paragrafları MuPDF ile kaldırılıp yerel Noto fontuyla yeniden yazılır; uygun gömülü görseller doğrudan seçilir, boyutlandırılır, değiştirilir ve silinir. Döndürülmüş/aynalı görseller ve soft maskeler desteklenir; üst üste gelen gömülü görseller özgün içerik akışından ayrı çağrılar olarak kaldırılır. Satır içi/desen görselleri ve vektör çizimleri sınırlıdır. Şekiller ayrı ikonlardan çizilir; eklemeler arasında katman sırası, saydamlık ve klavye taşıması vardır. Türkçe/İngilizce alan bazlı yerel OCR ile baskı metni paragraf/satır/kelime olarak düzenlenir; düz kâğıt rengi örneklenir, tanınamayan alan elle yazılabilir. Times New Roman/Arial/Georgia cihazdan ve TTF/OTF dosyaları oturum belleğine alınır, gerçek varyant çıktıya gömülür. Proprietary fontları dağıtıma kopyalamayın; model ve worker kaynaklarını CDN'ye yönlendirmeyin. OCR tanıma tek başına belge değişikliği değildir; seçilen satır alanları rasterdan kaldırılır. Güvenli karartma ürünü ve kriptografik imza henüz yoktur. Outline gezinmesi vardır, outline çıktı dosyasında korunmaz. MuPDF AGPL-3.0-or-later lisanslıdır; dağıtım kararlarında docs/DEPENDENCIES.md okuyun.
