# Tasarım yönü

PDF editörü bir belge çalışma masasıdır. İlk açılışta doğrudan editör görünür; büyük pazarlama başlıkları, fiyat kartları ve giriş duvarı yoktur. Ürünün ayırt edici yüzü geniş belge alanı ve sakin, hassas araç yerleşimidir. Uygulamada marka adı veya logo kullanılmaz.

## Tokenlar

| Rol | Değer | Kullanım |
| --- | --- | --- |
| Mürekkep | `#29324B` | Ana metin ve ana eylem |
| Tuval | `#EEF0F5` | Belgenin arkasındaki çalışma alanı |
| Kağıt | `#FFFFFF` | Üst araçlar, sayfa, bilgi paneli |
| İkincil metin | `#6B7385` | Yardım ve metadata |
| Vurgu | `#7266BB` | Etkin araç, seçili sayfa, odak |
| Yerel durum | `#2F8668` | Cihazda çalışma göstergesi |

Tipografi: cihazdaki Avenir Next/Avenir, Windows'ta Segoe UI, ardından Arial. Harici font isteği yoktur. Editör kontrolleri küçük ama birbirinden ayrıdır; belge tasarımı arayüz tipografisinden bağımsızdır. Türkçe metinler kısa ve doğrudan eylemi anlatır.

## Yerleşim

```text
PDF çalışma alanı             Gizlilik    PDF aç    Orijinali indir
──────────────────────────────────────────────────────────────────
Ray │ Dosya adı                                  Belge bilgisi
    │ Araçlar                                     Zoom
    ├──────────────┬───────────────────────┬─────────────────────
    │ Sayfalar     │                       │ Çalışma alanı
    │ Küçük        │   Büyük PDF sayfası    │ Gizlilik
    │ resimler     │                       │ Belge bilgileri
    │              │   Sayfa gezinme       │ Yaklaşan araçlar
──────────────────────────────────────────────────────────────────
Yerel oturum durumu
```

Krem/terracotta, dekoratif gradient, tekrarlanan kart dizisi ve AI sohbet arayüzlerinden taşınan öğeler kullanılmaz. İnce çizgiler gerçek alan sınırlarını ayırır. Köşe yuvarlaklıkları buton, popup ve kağıt için farklı amaçlarla kullanılır. Animasyon yalnızca yükleme durumundadır ve reduced-motion tercihine uyar.

## Etkileşim kuralları

- Her etkin buton gözlenebilir bir sonuç üretir.
- Henüz yapılmayan araçlar açıkça “Yakında” veya “Geliştiriliyor” olarak belirtilir.
- Kullanıcı dosyaları yerel dosya seçici veya sürükle-bırak ile açılır.
- “Orijinali indir” adı, görünüm döndürmesinin PDF'e yazılmadığını yanlış ifade etmez.
- Gizlilik açıklaması ve kısayollar native dialog içindedir; Escape, odak tuzağı ve kapatma sağlanır.
- Masaüstünde üç sütun; dar ekranda bilgi paneli açılabilir bir overlay olur. Çok dar ekranda sayfa listesi küçülür; liste kapatılarak belgeye daha fazla alan açılır.
- Yeni özellik eklerken metin okunurluğu, 320 px genişlik, klavye odağı ve gerçek PDF ile görsel kontrol yapılır.

Düzenleme alanı X düğmesiyle kapanır; üst çubuktan tekrar açılır. Sayfa önizlemesine ayrılan alan önceliklidir. Metin paneli sağda sabit kalır; diğer nesnelerin araç penceresi tutamacından taşınabilir, görünür ekranın dışına bırakılamaz.
