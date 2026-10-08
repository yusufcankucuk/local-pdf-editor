# Yerel PDF editörü

PDF dosyalarını tarayıcı içinde görüntüleyen ve düzenleyen yerel bir uygulama. Hesap açma veya belge yükleme servisi yoktur; PDF içeriği cihazda işlenir. Türkçe arayüz, dijital PDF düzenleme ve Türkçe/İngilizce yerel OCR içerir.

## Kurulum ve çalıştırma

[Node.js](https://nodejs.org/) **24 LTS** ve Git kurulu olmalıdır.

```sh
git clone https://github.com/yusufcankucuk/local-pdf-editor.git
cd local-pdf-editor
npm ci
npm run dev
```

Terminalde gösterilen adresi tarayıcıda açın; varsayılan adres **http://127.0.0.1:5173/**. Uygulama örnek belgeyle başlar. Sunucuyu kapatmak için terminalde `Ctrl+C` kullanın.

İlk kurulum paketleri indirmek için internet gerektirir. Kurulum tamamlandıktan sonra yerel sunucu, PDF düzenleme ve OCR internet olmadan çalışır. PDF.js ve OCR worker/model/font kaynakları kurulum sırasında yerel olarak hazırlanır.

Üretim sürümünü yerelde denemek için:

```sh
npm run build
npm run preview
```

Preview adresi varsayılan olarak **http://127.0.0.1:4173/**. Uygulama bir HTTP sunucusu üzerinden açılmalıdır; `index.html` dosyasına çift tıklayarak `file://` üzerinden çalıştırılmaz.

## İlk belgeyi düzenleme

1. **PDF aç** düğmesine basın veya PDF'i pencereye sürükleyin. Dosya sınırı 100 MB'dır.
2. Soldaki küçük resimlerden sayfayı seçin; yakınlaştırma ve sayfa gezinme araçlarını kullanın.
3. Üst çubuktan yapmak istediğiniz işlemi seçin. Eklenen veya düzenlemeye alınan nesneye tıklayarak ayarlarını değiştirin.
4. **Geri al / Yinele** ile işlemleri geri alın veya tekrar uygulayın.
5. **PDF indir** ile düzenlenmiş belgeyi yeni bir dosya olarak indirin. **Orijinali indir** başlangıç dosyasını verir.

Orijinal dosyanın üzerine yazılmaz. Belgeler ve düzenlemeler açık sekmenin belleğinde tutulur; sekmeyi kapatmadan veya sayfayı yenilemeden önce çıktıyı indirin.

## Metin düzenleme

**Yeni metin:** Metin aracını seçip sayfaya tıklayın. Sağdaki panelden içeriği, yazı tipini, boyutu, rengi, kalın/eğik biçimi, paragraf genişliğini ve satır aralığını ayarlayın.

**Dijital PDF'deki metin:** **PDF içeriğini düzenle** aracını açın ve kesikli çerçeveli paragrafı seçin. Satırlar hizalama ve stil bilgisine göre bir paragrafta toplanır. Sağ panelden düzeltin. Karmaşık sütunlarda gruplama kusursuz olmayabilir; kaynak font varsayılan olarak yerel Noto fontuyla yeniden yazılır.

Metin paneli masaüstünde sağda, dar ekranda sayfanın altında yer alır.

## Taranmış PDF ve staj defteri

Taramadaki yazı bir görselin parçasıdır. Önce OCR ile tanıyıp ardından düzenleyin:

1. **Taranmış yazıyı tanı** tüm açık sayfayı analiz eder. Tablolu veya çizgili belgelerde **Yazı alanını seç** ile yalnızca düzeltilecek hücreyi ya da cümleyi sürükleyerek seçin; alan daha yüksek çözünürlükte tanınır.
2. **Analiz düzeni** seçin: genel sayfa için **Otomatik belge**, tek hücre için **Tek paragraf / hücre**, dağınık içerik için **Tablo / dağınık yazı**.
3. Gerekirse **Tarama kontrastını iyileştir** ve **Yazı yönü** seçeneklerini ayarlayıp **Alanı yeniden tanı** düğmesine basın.
4. **Seçim birimi** menüsünden Paragraf, Satır veya Kelime seçin. Bulunan yazıya tıklayıp sağ panelde düzeltin. Sarı çerçeveli sonuçlar düşük güvenlidir; tanınan metni kontrol edin.
5. Birden fazla bloğu bir arada yazmak için **Seçili alanı birlikte düzenle** kullanın. OCR okuyamazsa **Alanı elle yaz** seçilen dikdörtgeni temizleyip yeni metin oluşturur. Tablo çizgilerini, imzaları ve görselleri bu seçimin dışında bırakın.

Tanıma tek başına belgeyi değiştirmez. Düzenlenen kelimelerin eski raster pikselleri temizlenir; yeni metin PDF çıktısına yazılır. **Kâğıt rengini koru** düz arka plan rengini yaklaşık doldurur; desen, gölge veya kesişen çizgileri onarmaz. El yazısı, çok bulanık tarama ve küçük açıyla eğik yazıda doğruluk garanti edilmez.

OCR açık sayfada çalışır. Sayfaya döndüğünüzde tekrar tanıma gerekebilir. Tanınan tüm metin otomatik olarak aranabilir bir katmana dönüştürülmez; düzenlenen metin indirilen PDF yeniden açıldığında seçilebilir ve aranabilir.

## Görseller, şekiller ve imza

- **Gömülü görseller:** Görsele doğrudan tıklayın veya **PDF görsellerini göster** listesinden seçin. Taşıyın, köşelerinden boyutlandırın, değiştirin, saydamlığını ayarlayın veya silin. Kaynak görselin çizim sırası korunur.
- **Taramadaki fotoğraf:** **Taramadan görsel alanı seç** ile fotoğrafın çevresini sürükleyin. Oluşan görsel taşınabilir, boyutlandırılabilir ve silinebilir. Önceden düzenlenen alanla kesişen seçimler engellenir.
- **Yeni görsel:** Görsel ekleme aracıyla PNG/JPEG dosyası seçip sayfaya yerleştirin.
- **Şekiller:** Dikdörtgen, elips, üçgen, çizgi veya ok ikonunu seçip sürükleyerek çizin. Vurgulama ve serbest çizim de vardır.
- **İmza:** Yerel olarak çizin veya görsel dosyası ekleyin. Bu özellik kriptografik dijital imza oluşturmaz.

Araç penceresindeki noktalı tutamacı sürükleyerek pencereyi taşıyabilirsiniz. Tutamaç odaktayken ok tuşları 10 px, Shift+ok 20 px taşır; nesne hareket etmez. Metin paneli sağda sabittir.

## Font ekleme

Noto Sans, Serif ve Mono uygulamayla gelir. Metin panelindeki **Times New Roman · cihazdan**, **Arial · cihazdan** ve **Georgia · cihazdan** seçenekleri cihazda kurulu fontu kullanır. Tarayıcı yerel font erişimi için izin isteyebilir.

Cihaz font erişimi desteklenmiyorsa **Font dosyası ekle** ile TTF/OTF yükleyin. Kalın/eğik kullanmak için ilgili font varyantlarını da seçin. Gerçek font çıktıya gömülür; gömme veya alt küme izni kısıtlı fontlar reddedilir. Font dosyaları yalnızca açık sekmenin belleğinde kalır. Times New Roman gibi ticari fontlar bu depoyla dağıtılmaz.

## Diğer işlemler ve çalışma alanı

Sayfa döndürme, taşıma, çoğaltma, silme, boş sayfa ekleme, PDF birleştirme ve sayfa çıkarma desteklenir. Temel form değerleri doldurulabilir; çıktı üzerinde sabitlenir. Metin arama, içindekiler gezinmesi ve yazdırma araçları da vardır.

Eflatun düzenleme alanının sağındaki **X**, araç satırlarını ve OCR seçim kutularını gizler; çalışan tanımayı iptal eder. Belge değişiklikleri korunur. Üst çubuktaki **Düzenleme araçlarını göster** veya **PDF içeriğini düzenle** ile tekrar açın.

## Klavye kısayolları

macOS'ta `Ctrl` yerine `⌘` kullanın.

| Kısayol | İşlem |
| --- | --- |
| Ctrl+O | PDF aç |
| Ctrl+S | Düzenlenmiş PDF indir |
| Ctrl+F | Belge içinde ara |
| Ctrl+Z | Geri al |
| Ctrl+Shift+Z / Ctrl+Y | Yinele |
| Ctrl+P | Yazdır |
| Escape | Seçimi veya alan seçimini kapat |
| Delete / Backspace | Seçili nesneyi sil |
| Ok tuşları | Seçili nesneyi 1 PDF birimi taşı |
| Shift+ok | Seçili nesneyi 10 PDF birimi taşı |

Metin kutuları kendi yazma ve geri alma davranışını korur.

## Gizlilik ve mevcut sınırlar

Belge işleme cihazda gerçekleşir. Backend, hesap, analitik, CDN veya harici OCR servisi yoktur. Belgeler, dosya adları ve font dosyaları LocalStorage/IndexedDB'de saklanmaz.

- Şifreli PDF'ler şifre girilerek **salt okunur** açılır.
- Inline/desen görselleri ve vektör nesneler ayrı görsel olarak düzenlenmez. Karmaşık clip/blend kaynaklarında uyumluluk sınırlıdır.
- Kaynak gömülü fontun ve karışık paragraf stillerinin birebir korunması desteklenmez.
- İçindekiler/outline gezinmesi vardır; outline çıktı dosyasında korunmaz.
- Güvenli karartma, sertifikalı dijital imza ve PDF sıkıştırma henüz yoktur.
- Service worker ve çevrimdışı yeniden başlatma desteği yoktur. Yerel sunucu kurulumdan sonra internet olmadan çalışabilir.

## Geliştirme ve doğrulama

```sh
npm test
npm run build
```

GitHub Actions push ve pull request üzerinde Node 24 ile temiz kurulum, test ve derleme çalıştırır. Tarayıcı kontrolleri için yerel sunucu açıkken, ayrıca `playwright-cli` kurulu olmalıdır:

```sh
mkdir -p artifacts
playwright-cli -s=pdf-editor open http://127.0.0.1:5173 --browser=chrome
playwright-cli -s=pdf-editor run-code --filename=tests/browser-smoke.js
playwright-cli -s=pdf-editor run-code --filename=tests/browser-workspace-controls.js
playwright-cli -s=pdf-editor close
```

Diğer senaryolar `tests/browser-*.js` dosyalarındadır. Cihaz fontu testleri ilgili fontların kurulu olmasını gerektirir. Test PDF'leri sentetiktir ve kullanıcı verisi içermez; test çıktıları `artifacts/` altında tutulur ve depoya eklenmez.

- [Agent rehberi](AGENTS.md)
- [Mimari](docs/ARCHITECTURE.md)
- [Devir notları](docs/HANDOFF.md)
- [Tasarım](docs/DESIGN.md)
- [Yol haritası](docs/ROADMAP.md)

## Lisanslar

MuPDF AGPL-3.0-or-later, Noto fontları SIL OFL 1.1 ve Tesseract Apache-2.0 lisanslıdır. Kullanıcı tarafından eklenen fontların kendi lisansları geçerlidir. Dağıtım koşulları ve lisans metinleri için [bağımlılık notlarını](docs/DEPENDENCIES.md) okuyun. Bu belge tüm projeye ayrıca bir lisans atamaz.
