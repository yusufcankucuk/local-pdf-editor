# İçerik motoru ve dağıtım

MuPDF.js 1.28.1 (`mupdf`) Artifex tarafından AGPL-3.0-or-later lisansıyla yayımlanır. Yerel WASM motoru mevcut PDF içeriğinin okunması ve kaldırılması için kullanılır. Telif ve lisans bildirimleri paket içinde korunur. [AGPL metni](licenses/AGPL-3.0.txt) projede bulunur.

Uygulamayı dağıtırken MuPDF ile oluşan birleşik çalışmaya uygulanabilecek AGPL kaynak kodu ve lisans yükümlülükleri dikkate alınmalıdır. Kapalı kaynak dağıtım tercih edilirse Artifex'in ticari lisansı veya farklı bir motor gerekir. Bu belge tüm projeye ayrıca bir lisans atamaz; dağıtımda lisans seçimi açıkça yapılmalıdır.

Noto fontları SIL Open Font License 1.1 altındadır; `src/assets/NotoSans-LICENSE.txt` Sans/Serif/Mono ailelerinin yerel varyantlarıyla birlikte korunur. Fontlar CDN'den çağrılmaz. Diğer paketlerin kendi lisansları npm dağıtımlarında bulunur.

Tesseract.js 7.0.0 ve tesseract.js-core 7.0.0 Apache-2.0 lisanslıdır. Paket lisans metinleri postinstall ile yerel OCR kaynaklarına kopyalanır. `@tesseract.js-data/eng` ve `tur` 1.0.0 paket bildirimleri MIT lisansını belirtir; paketlerle gelen `4.0.0_best_int` modelleri kullanılır. Dil modelleri yaklaşık 5.2 MB sıkıştırılmıştır. Core'un LSTM, SIMD-LSTM ve relaxed-SIMD-LSTM seçenekleri birlikte paketlenir; cihazın uygun seçeneği yerelde seçilir. Worker/core/model yolları açıkça aynı kaynak olarak yapılandırılır, Tesseract CDN varsayılanlarına bırakılmaz; IndexedDB cache kapalıdır.

## Kullanıcı cihazındaki fontlar

Times New Roman, Arial ve Georgia uygulamayla dağıtılmaz; kullanıcının kurulu fontu Local Font Access API veya kendi TTF/OTF seçimi üzerinden alınır. Harici font isteği yoktur. Font byte'ları/FontFace yalnızca sekme belleğindedir; kullanıcı çıktısına pdf-lib/fontkit ile alt küme gömülür. Tarayıcı erişim izni isteyebilir, API desteği olmayan tarayıcıda dosya seçici kullanılabilir.

TTF/OTF imzası, dosya/aile/bellek sınırı ve OS/2.fsType gömme/alt küme/bitmap kısıtları doğrulanır. Bu teknik kontrol fontun tüm lisans koşullarını belirlemez; kullanıcının seçtiği fontun lisansı geçerlidir. Sistem font dosyaları repo, public veya dist altında tutulmaz; test fontları yalnızca cihazın sistem dizininden okunur.
