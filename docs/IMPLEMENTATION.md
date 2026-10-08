# Revizyon 5 — uygulama ve kabul

Kapsam: taranmış PDF yazılarını cihaz içinde tanıyıp düzenlemek, dijital PDF paragraflarını tek metin kutusunda ele almak ve PDF ile gelen gömülü görselleri güvenilir biçimde seçip kaldırmak/değiştirmek. Tasarım ve orijinal File korunur.

## Kabul kriterleri

1. Üç satırlı dijital paragraf tek hedef/textarea'dır; yeni uzun metin kaynak genişliğinde sarılır. Kaldırma her satıra ayrı uygulanır, komşu paragraf kalır. Undo/export/reopen çalışır.
2. Türkçe/İngilizce OCR worker/core/models aynı kaynaktan yüklenir; belge dışarı çıkmaz, storage yazılmaz. Tanıma iptal edilebilir ve tanıma tek başına belgeyi değiştirmez.
3. Seçilen taranmış satırların eski pikselleri çıktıdan kaldırılır; yeni metin gerçek PDF yazısı olur. Rasterın geri kalanı korunur. Undo orijinal taramayı geri getirir.
4. Gömülü görseller doğrudan veya önizleme listesiyle seçilir. Overlap ve reused Form'da yalnızca seçilen çağrı kaldırılır; diğer görselin piksel/mask/yerleşimi ve sayfa crop/rotation'u korunur.
5. Yerinde metin araçları 320/390 px sınırlarına sığar. Şifreli belgeler salt okunur kalır; eski metin/görsel/form/undo/dışa aktarma araçları çalışır.

## Uygulama

Teknik dosya haritası, lifecycle, kaynak kaldırma kararları ve sınırlar [HANDOFF](HANDOFF.md) ve [mimari](ARCHITECTURE.md) altında günceldir. OCR Tesseract.js 7, modeller @tesseract.js-data tur/eng 1.0 best_int; yeni bağımlılıklar lockfile ile kuruldu. npm kurulumunda sıfır audit açığı gözlendi. Eklenen kaynaklar statik, belge işlemleri yereldir.

23 Node testi ve TypeScript/Vite build geçti. Gerçek OCR ve üç yeni akışın geliştirme+üretim browser kontrolü geçti. Browser çıktıları `artifacts/` altında. Görsel kaldırma sırasında sayfayı PDF Device ile yeniden çizme yaklaşımı saydam maskeleri bozduğu için kullanılmaz; nihai uygulama özgün içerik akışındaki seçilen Do çağrısını kaldırır.

OCR doğruluğu ve kaynak fontu aynen koruma taahhüdü yoktur. Searchable tüm belge OCR layer, inline/desen/vectör düzenleme, el yazısı ve karmaşık layout sonraki kapsamdır. Kaynak dosya korunur; çıktı yeni indirme olarak üretilir.

Son regresyon: revision-three (paragraf kapsamına güncellendi), navigation-forms, context-tools, smoke ve image-tools geçti. Form kontrolündeki DOM yüklenme beklemesi null-safe yapıldı. Üretim OCR testinde Türkçe karakterler, komşu paragrafı ayrı tutma, iptal/undo, 320/390 px ve yalnızca aynı kaynak GET istekleri yeniden doğrulandı.
