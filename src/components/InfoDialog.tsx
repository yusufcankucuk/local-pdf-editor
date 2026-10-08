import { useEffect, useRef } from "react";
import { Check, HelpCircle, ShieldCheck, X } from "lucide-react";
import { IconButton } from "./IconButton";

export function InfoDialog({
  kind,
  close,
}: {
  kind: "privacy" | "help";
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="info-dialog"
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="dialog-heading">
        <span className="dialog-icon">
          {kind === "privacy" ? (
            <ShieldCheck size={24} />
          ) : (
            <HelpCircle size={24} />
          )}
        </span>
        <IconButton label="Pencereyi kapat" onClick={close}>
          <X size={20} />
        </IconButton>
      </div>
      {kind === "privacy" ? (
        <>
          <h2 id="dialog-title">Dosyanızın yeri, cihazınız.</h2>
          <p>
            Uygulama, seçtiğiniz PDF dosyasını tarayıcınızın belleğinde açar. Belge
            içeriği bir sunucuya gönderilmez.
          </p>
          <ul>
            <li>
              <Check size={16} />
              Hesap, e-posta veya kişisel bilgi istenmez.
            </li>
            <li>
              <Check size={16} />
              Analitik, takip kodu veya harici CDN kullanılmaz.
            </li>
            <li>
              <Check size={16} />
              Belgeler ve dosya adları kalıcı olarak saklanmaz.
            </li>
          </ul>
          <div className="dialog-note">
            Sekmeyi yenilediğinizde oturum kapanır. “PDF indir” değişiklikleri
            yeni bir dosyaya yazar; “Orijinali indir” açtığınız dosyanın
            değişmemiş kopyasını indirir.
          </div>
        </>
      ) : (
        <>
          <h2 id="dialog-title">Biraz daha hızlı çalışın.</h2>
          <p>
            Bir dosyayı çalışma alanına sürükleyebilir veya “PDF aç” düğmesini
            kullanabilirsiniz.
          </p>
          <dl className="shortcut-list">
            <div>
              <dt>PDF aç</dt>
              <dd>
                <kbd>Ctrl / ⌘</kbd>
                <kbd>O</kbd>
              </dd>
            </div>
            <div>
              <dt>Sayfalar arasında gezin</dt>
              <dd>
                <kbd>←</kbd>
                <kbd>→</kbd>
              </dd>
            </div>
            <div>
              <dt>Yakınlaştır / uzaklaştır</dt>
              <dd>
                <kbd>+</kbd>
                <kbd>−</kbd>
              </dd>
            </div>
          </dl>
          <div className="dialog-note">
            Metin aracını seçip sayfaya tıklayın. Eklediğiniz metnin yazı tipi,
            boyutu ve rengini yanındaki çubuktan değiştirin. Eklemeleri
            sürükleyin, kopyalayın veya silin. Escape çubuğu kapatır; Delete
            seçili eklemeyi siler. Ctrl / ⌘ Z geri alır, Ctrl / ⌘ S PDF indirir.
            En fazla 100 MB PDF desteklenir. Şifreli belgeler salt okunur
            açılır. “PDF içeriğini düzenle” ile mevcut paragrafları ve gömülü
            görselleri seçebilirsiniz. Görsellere görünüm modunda da doğrudan
            tıklayın; değiştirin ve saydamlığını ayarlayın. Şekilleri üstteki
            ikonlardan seçip çizin. Seçili eklemeyi ok tuşlarıyla taşıyın; Shift
            ile daha büyük adım kullanın. Metin yerel Noto fontuyla yeniden
            yazılır. “Taranmış yazıyı tanı” Türkçe/İngilizce baskı metnini bu
            cihazda okur; tanınan paragrafı kontrol edip düzenleyin. “PDF
            görsellerini göster” gömülü görselleri listeler. Görsel imza
            sertifikalı dijital imza değildir.
          </div>
        </>
      )}
      <button className="button button-dark dialog-done" onClick={close}>
        Anladım
      </button>
    </dialog>
  );
}
