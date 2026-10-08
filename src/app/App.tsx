import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  FilePlus2,
  Files,
  HelpCircle,
  Info,
  LockKeyhole,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { IconButton } from "../components/IconButton";
import { useDocument } from "../features/document/useDocument";
import { Workspace } from "../features/viewer/Workspace";
import { PasswordDialog } from "../components/PasswordDialog";
import { InfoDialog } from "../components/InfoDialog";

export function App() {
  const session = useDocument();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dialog, setDialog] = useState<"privacy" | "help" | null>(null);
  const [dirty, setDirty] = useState(false);
  const openDocument = (file: File) => {
    if (
      !dirty ||
      window.confirm(
        "Kaydedilmemiş değişiklikleriniz var. Yeni belgeyi açıp bu oturumu kapatmak istiyor musunuz?",
      )
    )
      void session.open(file);
  };
  const openDemo = () => {
    if (
      !dirty ||
      window.confirm(
        "Kaydedilmemiş değişiklikleriniz var. Örnek belgeye geçmek istiyor musunuz?",
      )
    )
      void session.openDemo();
  };
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const openFile = () => inputRef.current?.click();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") {
        event.preventDefault();
        inputRef.current?.click();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="app-shell"
      onDragEnter={(event) => {
        event.preventDefault();
        if (event.dataTransfer.types.includes("Files")) {
          dragDepth.current++;
          setDragging(true);
        }
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        if (--dragDepth.current <= 0) {
          dragDepth.current = 0;
          setDragging(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) openDocument(file);
      }}
    >
      <header className="app-header">
        <span className="header-caption">PDF çalışma alanı</span>
        <div className="header-actions">
          <button className="local-badge" onClick={() => setDialog("privacy")}>
            <span className="status-dot" />
            Bu cihazda
            <ShieldCheck size={15} />
          </button>
          <button className="button button-light" onClick={openFile}>
            <FilePlus2 size={16} />
            <span>PDF aç</span>
            <kbd>⌘ O</kbd>
          </button>
          <button
            className="button button-dark"
            disabled={!session.document || session.loading}
            type="submit"
            form="export-document"
            aria-label="PDF indir"
          >
            <ArrowDownToLine size={16} />
            <span>PDF indir</span>
          </button>
          <button
            className="original-download"
            disabled={!session.document}
            onClick={session.downloadOriginal}
            title="Orijinal dosyayı indir"
          >
            Orijinali indir
          </button>
        </div>
      </header>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="file-input"
        aria-label="PDF dosyası seç"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) openDocument(file);
          event.target.value = "";
        }}
      />
      <div className="app-body">
        <nav className="activity-rail" aria-label="Çalışma alanı">
          <IconButton label="Belge çalışma alanı" className="rail-active">
            <Files size={21} />
          </IconButton>
          <span className="rail-caption">Belge</span>
          <div className="rail-spacer" />
          <IconButton
            label="Gizlilik bilgisi"
            onClick={() => setDialog("privacy")}
          >
            <ShieldCheck size={20} />
          </IconButton>
          <IconButton
            label="Klavye kısayolları ve yardım"
            onClick={() => setDialog("help")}
          >
            <HelpCircle size={20} />
          </IconButton>
        </nav>
        <main className="main-shell" aria-label="PDF editörü">
          {session.error && (
            <div className="error-banner" role="alert">
              <Info size={17} />
              <span>{session.error}</span>
              <IconButton
                label="Hata mesajını kapat"
                onClick={session.clearError}
              >
                <X size={16} />
              </IconButton>
            </div>
          )}
          {session.document ? (
            <Workspace
              key={session.document.id}
              document={session.document}
              openFile={openFile}
              openDemo={openDemo}
              onDirty={setDirty}
              requestPassword={session.requestPassword}
              privacy={() => setDialog("privacy")}
              blocked={dialog !== null}
            />
          ) : (
            <div className="empty-state">
              <span className="empty-mark">
                <Files size={38} />
              </span>
              <h1>Belgenize yer açın.</h1>
              <p>
                Bir PDF seçin ya da dosyanızı buraya bırakın.
                <br />
                Her şey bu cihazda kalır.
              </p>
              <button className="button button-dark" onClick={openFile}>
                <Plus size={16} />
                PDF aç
              </button>
              <button
                className="text-button"
                onClick={() => void session.openDemo()}
              >
                Örnek belgeyi keşfet <ArrowRight size={15} />
              </button>
            </div>
          )}
          {session.loading && (
            <div className="loading-bar" role="status">
              <span className="spinner" />
              Belge açılıyor…
            </div>
          )}
        </main>
      </div>
      <footer className="status-bar">
        <span>
          <LockKeyhole size={12} />
          Dosyalarınız cihazınızdan ayrılmaz.
        </span>
        <span>
          Yerel oturum
          <span className="footer-dot" />
          v0.3
        </span>
      </footer>
      {dragging && (
        <div className="drop-overlay">
          <div>
            <FilePlus2 size={44} />
            <h2>PDF dosyanızı bırakın</h2>
            <p>Dosya yalnızca bu cihazda açılır.</p>
          </div>
        </div>
      )}
      {session.passwordPrompt && (
        <PasswordDialog
          key={String(session.passwordPrompt.incorrect)}
          {...session.passwordPrompt}
        />
      )}
      {dialog && <InfoDialog kind={dialog} close={() => setDialog(null)} />}
    </div>
  );
}
