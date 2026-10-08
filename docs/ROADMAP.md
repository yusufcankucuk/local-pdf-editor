# Geliştirme yol haritası

Her aşama ayrı, gözlenebilir bir çıktı verir. Liste vaat edilen hazır özellikleri değil, geliştirme sırasını gösterir.

## 0 — Temel ve görsel dil (tamamlandı)

- [x] React + TypeScript + Vite statik uygulama
- [x] Agent rehberi, mimari ve tasarım kararları
- [x] PDF.js ve yerel worker/font/cmap/wasm kaynakları
- [x] Dosya seçme ve sürükle-bırak, dosya sınırı ve anlaşılır hata
- [x] Özgün örnek belge, sayfa önizlemesi ve küçük resimler
- [x] Sayfa gezinme, zoom, genişliğe sığdırma, elle kaydırma
- [x] Sayfa döndürme ve orijinal dosyayı indirme
- [x] Gizlilik açıklaması, klavye kontrolleri ve responsive yerleşim

## 1 — Görüntüleyici kalitesi

- [x] Gerçek metin katmanı, metin seçme ve belge içinde arama
- [x] Şifreli belge açma (şifre yalnızca bellekte)
- [x] Belge outline/bookmark gezinmesi (harici bağlantılar çalıştırılmaz)
- [ ] Büyük belgelerde thumbnail sanallaştırma ve bellek ölçümü
- [ ] Etiketli PDF erişilebilirliği

Kabul: seçilen metin PDF içeriğiyle eşleşir; arama sayfa ve metin üzerinde doğru konumu gösterir; şifre loglanmaz veya saklanmaz.

## 2 — Sayfa işlemleri ve gerçek dışa aktarma

- [x] Dışa aktarma motoru seçimi ve uyumluluk örnekleri
- [x] Belge değişiklik modeli, undo/redo
- [x] Sayfa döndürme, sıralama, silme ve çoğaltma
- [x] PDF birleştirme ve sayfa ayırma
- [x] Değiştirilmiş PDF indirme

Kabul: çıktı yeniden açılır; sayfa sayısı, sırası ve dönüşü beklenenle eşleşir. Geri alma orijinal durumu geri getirir; orijinal dosya korunur.

## 3 — Açıklama ve imza

- [x] Vurgulama, serbest çizim ve şekiller
- [ ] Yapışkan notlar
- [x] Metin/görsel üst katman ekleme
- [x] Yerel çizilen veya dosyadan alınan imza
- [x] Zoom ve rotasyondan bağımsız PDF koordinatları
- [x] Açıklamaların PDF'e doğru yazılması

Kabul: farklı zoom ve rotasyonlarda işaretler aynı belge noktasında kalır; indirme sonrası çıktıda görünürler. Görsel imza kriptografik dijital imza olarak sunulmaz.

## 4 — İleri düzenleme

- [x] Mevcut yatay paragrafları değiştirme: MuPDF kaldırma ve yerel fontla yeniden yazma
- [x] Uygun gömülü görsel taşıma/boyutlandırma/silme
- [ ] Orijinal gömülü fontları koruma, karışık stiller ve eğik nesneler
- [x] Temel form doldurma (çıktıda sabitleme) ve görsel boyutlandırma
- [ ] PDF sıkıştırma
- [ ] Gerçek redaction: kapalı alanın altındaki içerik çıktıdan silinir
- [x] Yerel Türkçe/İngilizce OCR; aktif sayfada taranmış baskı metnini düzenleme

Kabul: karartılan içerik metin çıkarımıyla veya nesne incelemesiyle geri alınamaz. OCR hiçbir belgeyi sunucuya göndermez. Font ve yerleşim destek sınırları açıkça belirtilir.

## 5 — Çevrimdışı dağıtım

- [ ] PWA veya masaüstü paketleme kararı
- [ ] Ağsız yeniden başlatma ve güncelleme stratejisi
- [ ] Kullanıcı tercihiyle kurtarma/oturum saklama
- [ ] Üretim CSP başlıkları ve bağımlılık güncelleme süreci

Kabul: internet kapalıyken uygulama yeniden başlar ve yerel PDF açar. Belgeler varsayılan olarak disk üzerinde tutulmaz; saklama ve silme kullanıcının kontrolündedir.

## Kullanım kolaylığı — 8 Ekim 2026

- [x] Eklenen metnin yazı tipi, boyutu, rengi ve içeriğini sonradan değiştirme
- [x] Sayfa üzerinde seçilen eklemenin yanında bağlamsal araç çubuğu
- [x] Doğrudan metin girişi, kopyalama, Escape, Delete ve undo
- [x] 320/390 px ekran sınırlarına sığan araç çubuğu

v0.3 mevcut yatay metin satırlarını yerel Noto fontuyla yeniden yazar. Outline dışa aktarmada korunmaz; şifreli belgeler salt okunurdur.

## Revizyon 3

- [x] Kalın/eğik metin ve gerçek font varyantları
- [x] Mevcut PDF içeriği için seçim modu, undo ve gerçek kaldırma
- [x] Vurgu/şekil/görsel köşe tutamaçları ve alan boyutları
- [x] Elips, üçgen, çizgi ve ok; sürükleme yönünü koruma
- [x] Ana görünüm ve küçük resimde temizlenmiş içerik önizlemesi

## Revizyon 4

- [x] PDF açıldığında gömülü görsele doğrudan tıklayıp düzenleme
- [x] Döndürülmüş/aynalı görseller ve soft maskeleri koruma
- [x] Beş ayrı şekil ikonu; seçip çizme
- [x] Görsel değiştirme ve saydamlık
- [x] Eklemeler arasında öne/arkaya alma, undo
- [x] Ok tuşları ve Shift ile hassas taşıma

Kabul: doğrudan görsel seçimi resize/delete/undo ile çalışır; dönüştürülen saydam görsel çıktı karşılaştırmasını geçer; yeni ayarlar çıktı PDF'e yazılır; 320/390 px araç çubuğu taşmaz. Kaynak PDF değişmez.

## Revizyon 5 — taramalar ve gerçek içerik

- [x] Türkçe/İngilizce OCR, yerel model/core/worker, ilerleme ve iptal
- [x] Taranmış paragrafı seçme/düzenleme; kaynak satır piksellerini temizleme, undo ve gerçek PDF çıktı
- [x] Dijital metni blok/hizalama/stile göre paragraf olarak gruplama
- [x] Paragraf genişliği, satır aralığı ve kelime bazlı sarma
- [x] PDF görselleri önizleme listesi
- [x] Üst üste gelen/reused Form görsellerini yalnızca seçilen çağrıdan kaldırma
- [ ] OCR sonucunu tüm belge için aranabilir/seçilebilir metin katmanına yazma
- [ ] Dikey/eğik yazı, el yazısı, karmaşık tablo/sütun düzeni
- [ ] Inline/desen görselleri ve vektör nesne düzenleme

Kabul: çok satırlı paragraf tek kutudur; komşu paragraf ve orijinal dosya korunur. OCR için hiçbir harici istek/yükleme yapılmaz. İptal belgeyi değiştirmez. Seçilen raster satırın eski pikselleri çıktıdan kalkar, yeni metin yeniden açılınca seçilebilir olur. Kesişen görsellerden birini silmek diğerinin çizimini, maskesini ve yerleşimini değiştirmez.

## Revizyon 6 — seçim ve içerik bütünlüğü

- [x] Native görseli seçerken kaynak pikselleri koruma; değiştirme/boyutlandırmada özgün çizim sırası
- [x] Sayfa rasterını normal fotoğraf hedefinden ayırma, taramadan fotoğraf alanı seçme
- [x] OCR seçimini satır alanlarına oturtma
- [x] Metin ayarları için sağ panel; dar ekranda sayfanın altında düzenleme
- [x] İçerik preview'i yenilenirken çizim gesture'ını koruma

Kabul: bitonal/Decode taraması seçimde kararmamalı; değiştirilmiş arka plan görseli öndeki yazıları kapatmamalı. Crop/silme/undo/export çalışmalı, seçilen alan dışındaki raster korunmalı. Metin paneli sayfa üzerine binmemeli. Kullanıcının sorunlu dosyası bu oturumda mevcut değil; sentetik uyumluluk örnekleriyle doğrulanır.

## Revizyon 7 — hassas tarama düzeltme ve fontlar

- [x] Yazı alanını sürükleyerek seçme ve daha yüksek çözünürlükte yerel OCR
- [x] Otomatik / tek paragraf-hücre / tablo-dağınık analiz seçenekleri
- [x] Paragraf, satır ve kelime seçimi; düşük güven göstergesi
- [x] Kontrast iyileştirme ve 90° yön seçenekleri
- [x] Kelime bazlı piksel kaldırma, düz kâğıt rengini örnekleyip koruma
- [x] Seçili alanı birlikte düzenleme ve tanınamayan alanı elle yeniden yazma
- [x] Gerçek Times New Roman, Arial, Georgia cihaz erişimi; TTF/OTF içe aktarma ve gerçek PDF gömme
- [ ] Otomatik küçük açı düzeltme ve gelişmiş el yazısı tanıma
- [ ] Tablo semantiği ve desen/gölge/çizgi restorasyonu

Kabul: sentetik çizgili staj defterinde crop komşu sütunu dışarıda bırakır; kelime seçimi ve çıktı komşu çizgileri korur; undo/orijinal dosya çalışır; Times dört varyantla gerçek font olarak gömülür; 320/390 px ve yalnızca yerel istekler doğrulanır. Kullanıcının birebir defteri ayrıca uyumluluk örneği gerektirir.

## Revizyon 8 — son kullanım kolaylığı ve depo hazırlığı

- [x] Eflatun düzenleme alanını kapatma ve üst çubuktan tekrar açma
- [x] Kapatmada OCR iptali ve geçici seçim modlarından çıkış
- [x] Görsel/nesne popup'ını tutamacından taşıma ve klavye erişimi
- [x] Elle taşınan pencere konumunu ayar değişimlerinde koruma, mobilde sınırlandırma
- [x] Folio marka/logo kaldırma, sade belge favicon'u
- [x] Bağımsız main Git deposu, ignore kuralları ve GitHub test/build akışı

Kabul: kapalı araçlar zoom/render ile geri gelmez; yeniden açma sonucu korur; popup hareketi nesneyi değiştirmez; 320/390 px ve gerçek OCR iptal/undo doğrulanır. Uzak repo bağlantısı ve push henüz yapılmadı.
