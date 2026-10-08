import type { useOcr } from "./useOcr";
import { ScanText } from "lucide-react";
import type { ContentTarget } from "../../lib/contentTypes";
export function ContentTools({
  ocr,
  showImages,
  images,
  loading,
  busy,
  select,
  closeImages,
  regionMode,
  chooseRegion,
  showOcrControls,
}: {
  ocr: ReturnType<typeof useOcr>;
  regionMode: boolean;
  chooseRegion: () => void;
  showOcrControls: boolean;
  showImages: boolean;
  images: ContentTarget[];
  loading: boolean;
  busy: boolean;
  select: (target: ContentTarget) => void;
  closeImages: () => void;
}) {
  return (
    <>
      {showOcrControls && (
        <div
          className="scan-text-controls"
          role="region"
          aria-label="Taranmış belge araçları"
        >
          <div className="ocr-control-row">
            <button
              className="button button-light"
              disabled={busy}
              aria-pressed={regionMode}
              onClick={chooseRegion}
            >
              <ScanText size={15} />
              {regionMode ? "Yazı alanı seçimini iptal et" : "Yazı alanını seç"}
            </button>
            <label>
              Analiz düzeni
              <select
                aria-label="OCR analiz düzeni"
                disabled={busy}
                value={ocr.options.layout}
                onChange={(e) =>
                  ocr.setOptions({
                    ...ocr.options,
                    layout: e.target.value as typeof ocr.options.layout,
                  })
                }
              >
                <option value="auto">Otomatik belge</option>
                <option value="block">Tek paragraf / hücre</option>
                <option value="sparse">Tablo / dağınık yazı</option>
              </select>
            </label>
            <label>
              Yazı yönü
              <select
                aria-label="OCR yazı yönü"
                disabled={busy}
                value={ocr.options.rotation}
                onChange={(e) =>
                  ocr.setOptions({
                    ...ocr.options,
                    rotation: Number(
                      e.target.value,
                    ) as typeof ocr.options.rotation,
                  })
                }
              >
                <option value={0}>Normal</option>
                <option value={90}>90°</option>
                <option value={180}>180°</option>
                <option value={270}>270°</option>
              </select>
            </label>
            <label className="ocr-enhance">
              <input
                type="checkbox"
                checked={ocr.options.enhance}
                disabled={busy}
                onChange={(e) =>
                  ocr.setOptions({ ...ocr.options, enhance: e.target.checked })
                }
              />
              Tarama kontrastını iyileştir
            </label>
            <label className="ocr-enhance">
              <input
                type="checkbox"
                checked={ocr.options.preserveBackground}
                disabled={busy}
                onChange={(event) =>
                  ocr.setOptions({
                    ...ocr.options,
                    preserveBackground: event.target.checked,
                  })
                }
              />
              Kâğıt rengini koru
            </label>
          </div>
          <div className="ocr-control-row">
            <label>
              Seçim birimi
              <select
                aria-label="Taranmış yazı seçim birimi"
                value={ocr.selection}
                disabled={busy}
                onChange={(e) =>
                  ocr.setSelection(e.target.value as typeof ocr.selection)
                }
              >
                <option value="paragraph">Paragraf</option>
                <option value="line">Satır</option>
                <option value="word">Kelime</option>
              </select>
            </label>
            {ocr.region && (
              <button
                className="button button-light"
                disabled={busy}
                onClick={() => void ocr.recognize(ocr.region)}
              >
                Alanı yeniden tanı
              </button>
            )}
            {ocr.combined && (
              <button
                className="button button-light"
                disabled={busy}
                onClick={() => select(ocr.combined!)}
              >
                Seçili alanı birlikte düzenle
              </button>
            )}
            {ocr.manual && (
              <button
                className="button button-light"
                disabled={busy}
                onClick={() => select(ocr.manual!)}
              >
                Alanı elle yaz
              </button>
            )}
          </div>
          <p>
            {regionMode
              ? "Düzeltmek istediğiniz yazının çevresini sürükleyin. Yalnızca o alan daha yüksek çözünürlükte tanınır."
              : "Tablolu ve çizgili belgelerde önce küçük bir yazı alanı seçin; tek kelimeyi veya satırı da düzenleyebilirsiniz."}
          </p>
          {ocr.manual && (
            <p className="tool-footnote">
              “Alanı elle yaz” seçilen dikdörtgeni temizler. Tablo çizgilerini
              ve imzaları seçimin dışında bırakın.
            </p>
          )}
        </div>
      )}

      {(ocr.message || ocr.busy) && (
        <div className="ocr-status" role="status">
          <ScanText size={16} />
          <span>
            {ocr.message}
            <small>
              Türkçe + İngilizce · Bu cihazda. Tanıma hatalarını kontrol edin;
              satır alanındaki görsel pikselleri kaldırılır.
            </small>
          </span>
          {ocr.busy && (
            <button className="button button-light" onClick={ocr.cancel}>
              İptal et
            </button>
          )}
        </div>
      )}
      {ocr.error && (
        <div className="error-banner" role="alert">
          {ocr.error}
        </div>
      )}
      {showImages && (
        <div
          className="pdf-image-list"
          role="region"
          aria-label="PDF görselleri"
        >
          <div>
            <strong>Bu sayfadaki görseller</strong>
            <button
              className="icon-button"
              aria-label="Görsel listesini kapat"
              onClick={() => closeImages()}
            >
              ×
            </button>
          </div>
          {loading ? (
            <p>Görseller okunuyor…</p>
          ) : images.length ? (
            <div className="pdf-image-items">
              {images.map((target, index) => (
                <button
                  key={target.id}
                  disabled={busy}
                  aria-label={`${index + 1}. PDF görselini düzenle`}
                  onClick={() => select(target)}
                >
                  <img
                    src={
                      target.overlay.kind === "image"
                        ? (target.pageRasterData ?? target.overlay.data)
                        : undefined
                    }
                    alt=""
                  />
                  <span>
                    {target.pageRaster
                      ? "Taranmış sayfa görüntüsü"
                      : `Görsel ${index + 1}`}
                    <small>Seç · taşı · değiştir · sil</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p>
              Düzenlenebilir gömülü görsel bulunamadı. Vektör çizimleri ve
              taramanın içindeki fotoğraflar ayrı görsel nesnesi değildir.
            </p>
          )}
        </div>
      )}
    </>
  );
}
