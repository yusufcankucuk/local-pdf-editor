import { ArrowRight, File, Info, LockKeyhole } from "lucide-react";

export function DocumentInfo({
  name,
  size,
  pages,
  dirty,
  privacy,
  openDemo,
}: {
  name: string;
  size: number;
  pages: number;
  dirty: boolean;
  privacy: () => void;
  openDemo: () => void;
}) {
  return (
    <aside className="info-panel" aria-label="Belge bilgileri">
      <div className="panel-heading">
        <h2>Çalışma alanı</h2>
        <Info size={16} />
      </div>
      <div className="info-content">
        <div className="privacy-illustration">
          <div className="privacy-paper">
            <span />
            <span />
            <span />
            <span />
          </div>
          <span className="privacy-lock">
            <LockKeyhole size={19} />
          </span>
        </div>
        <h3>Belgeniz sizde kalsın.</h3>
        <p>
          Hesap yok. Dosya yüklemek yok.
          <br />
          Sadece siz ve belgeniz.
        </p>
        <button className="privacy-link" onClick={privacy}>
          Nasıl çalışıyor? <ArrowRight size={14} />
        </button>
        <div className="info-rule" />
        <h4>Belge bilgileri</h4>
        <dl>
          <div>
            <dt>Dosya türü</dt>
            <dd>PDF</dd>
          </div>
          <div>
            <dt>Sayfa sayısı</dt>
            <dd>{pages}</dd>
          </div>
          <div>
            <dt>Orijinal boyut</dt>
            <dd>
              {size < 1048576
                ? `${(size / 1024).toFixed(1)} KB`
                : `${(size / 1048576).toFixed(1)} MB`}
            </dd>
          </div>
          <div>
            <dt>Konum</dt>
            <dd className="local-value">
              <span className="status-dot" />
              Bu cihaz
            </dd>
          </div>
          <div>
            <dt>Durum</dt>
            <dd>{dirty ? "Değişiklikler var" : "Orijinal belge"}</dd>
          </div>
        </dl>
        <div className="info-rule" />
        <h4>Küçük bir hatırlatma</h4>
        <p>
          Değişikliklerinizi “PDF indir” ile yeni bir dosyaya kaydedin. Orijinal
          belgeniz korunur.
        </p>
        <p className="version-note">
          {name}
          <br />
          Oturum sekme kapatılınca silinir.
        </p>
      </div>
      <button className="sample-link" onClick={openDemo}>
        <File size={15} />
        Örnek belgeyi aç
        <ArrowRight size={14} />
      </button>
    </aside>
  );
}
