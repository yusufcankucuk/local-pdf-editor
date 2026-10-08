import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Hand,
  Info,
  LayoutPanelLeft,
  Maximize,
  Minus,
  MousePointer2,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RotateCw,
  Search,
  Signature,
  Pencil,
  Square,
  Circle,
  Triangle,
  Slash,
  ArrowUpRight,
  ImagePlus,
  ScanText,
  Images,
  ListChecks,
  Printer,
  LockKeyhole,
  Sparkles,
  Type,
  Underline,
  Undo2,
  Redo2,
  X,
} from "lucide-react";
import { IconButton } from "../../components/IconButton";
import type { DocumentSession } from "../document/useDocument";
import { FormLayer } from "../editor/FormLayer";
import { AnnotationLayer } from "../editor/AnnotationLayer";
import type { EditorTool, ToolSettings } from "../editor/AnnotationLayer";
import { ContentTools } from "../editor/ContentTools";
import { useOcr } from "../editor/useOcr";
import type { ContentTarget } from "../../lib/contentTypes";
import { useNativeContent } from "../editor/useNativeContent";
import { NativeContentLayer } from "../editor/NativeContentLayer";
import { translateOverlay } from "../editor/model";
import { ToolPanel } from "../editor/ToolPanel";
import type { RequestPassword } from "../../lib/pdf";
import { useEditor } from "../editor/useEditor";
import { PagePanel } from "../editor/PagePanel";
import { DocumentInfo } from "./DocumentInfo";
import { SearchBar } from "../search/SearchBar";
import { PdfCanvas } from "./PdfCanvas";

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function Workspace({
  document,
  openFile,
  openDemo,
  privacy,
  blocked,
  onDirty,
  requestPassword,
}: {
  document: DocumentSession;
  openFile: () => void;
  openDemo: () => void;
  privacy: () => void;
  blocked: boolean;
  onDirty: (dirty: boolean) => void;
  requestPassword: RequestPassword;
}) {
  const { file, isDemo } = document;
  const editor = useEditor(document, requestPassword);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOccurrence, setSearchOccurrence] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [fit, setFit] = useState(() => window.innerWidth < 900);
  const [availableWidth, setAvailableWidth] = useState(700);
  const [showInfo, setShowInfo] = useState(() => window.innerWidth > 1050);
  const [showPages, setShowPages] = useState(true);
  const [tool, setTool] = useState<EditorTool>("view");
  const [settings, setSettings] = useState<ToolSettings>({
    text: "Yeni metin",
    font: "sans",
    size: 18,
    color: "#29324b",
    thickness: 2,
    image: null,
    imageRatio: 1,
    shape: "rectangle",
  });
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);
  function chooseTool(value: EditorTool) {
    if (value === "content") setEditingToolsHidden(false);
    setTextRegionMode(false);
    setScanRegionMode(false);
    setTool(value);
    setSelectedOverlay(null);
    setShowInfo(false);
    if (value === "highlight")
      setSettings((current) => ({ ...current, color: "#f1ca5b" }));
    if (value === "text" || value === "draw" || value === "rectangle")
      setSettings((current) => ({ ...current, color: "#29324b" }));
    if (value === "image" || value === "signature")
      setSettings((current) => ({ ...current, image: null }));
  }
  useEffect(() => {
    setSelectedOverlay(null);
  }, [page]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pan = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const [showImages, setShowImages] = useState(false);
  const [scanRegionMode, setScanRegionMode] = useState(false);
  const [textRegionMode, setTextRegionMode] = useState(false);
  const [editingToolsHidden, setEditingToolsHidden] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  useEffect(() => {
    setScanRegionMode(false);
    setTextRegionMode(false);
    setSelectionError("");
    setEditingToolsHidden(false);
  }, [page, document.id]);
  const entry = editor.pages[Math.min(page - 1, editor.pages.length - 1)];
  const source = entry.sourceId ? editor.sources.get(entry.sourceId) : null;
  const native = useNativeContent(source, entry, !document.encrypted);
  const ocr = useOcr(source, entry);
  const locked = editor.busy || document.encrypted || ocr.busy;
  const imageTargets = native.targets.filter(
    (target) =>
      target.overlay.kind === "image" &&
      !entry.removals?.some(
        (removal) =>
          removal.kind === "scan" &&
          Math.min(target.bounds[2], removal.rect[2]) >
            Math.max(target.bounds[0], removal.rect[0]) &&
          Math.min(target.bounds[3], removal.rect[3]) >
            Math.max(target.bounds[1], removal.rect[1]),
      ),
  );
  const scanTarget = native.targets.find((target) => target.pageRaster);
  const showOcrControls =
    !!source &&
    !document.encrypted &&
    (!!scanTarget ||
      (native.targets.length > 0 &&
        !native.targets.some((target) => target.overlay.kind === "text")) ||
      tool === "content" ||
      !!ocr.message ||
      textRegionMode);
  const directImages = imageTargets.filter((target) => !target.pageRaster);
  const contentTargets = [
    ...directImages,
    ...native.targets.filter((target) => target.overlay.kind === "text"),
    ...ocr.targets,
  ];
  function selectContent(target: ContentTarget) {
    if (locked) return;
    if (
      target.removal.kind === "scan" &&
      target.overlay.kind === "image" &&
      entry.removals?.some((removal) =>
        (removal.rects ?? [removal.rect]).some(
          (rect) =>
            Math.min(rect[2], target.bounds[2]) >
              Math.max(rect[0], target.bounds[0]) &&
            Math.min(rect[3], target.bounds[3]) >
              Math.max(rect[1], target.bounds[1]),
        ),
      )
    ) {
      setSelectionError(
        "Bu alan önceki bir düzenlemeyle kesişiyor. Daha küçük bir alan seçin veya önceki işlemi geri alın.",
      );
      return;
    }
    setSelectionError("");
    setScanRegionMode(false);
    setTextRegionMode(false);
    const id = editor.replaceContent(page - 1, target);
    setSelectedOverlay(id);
    setShowInfo(false);
    setTool("view");
    setShowImages(false);
  }
  const textEditing = entry.overlays.some(
    (overlay) => overlay.id === selectedOverlay && overlay.kind === "text",
  );
  const rotation = entry.rotation;
  const searchDocuments = useMemo(
    () =>
      editor.pages.map((entry) => {
        const source = entry.sourceId
          ? editor.sources.get(entry.sourceId)
          : null;
        return source ? { pdf: source.pdf, page: entry.sourcePage } : null;
      }),
    [editor.pages, editor.sources],
  );
  const width = fit
    ? Math.max(160, Math.min(availableWidth - 64, 1100))
    : (595 * zoom) / 100;
  useEffect(() => {
    onDirty(editor.dirty);
  }, [editor.dirty, onDirty]);
  useEffect(() => {
    setPage((value) => Math.min(value, editor.pages.length));
  }, [editor.pages.length]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setAvailableWidth(entry.contentRect.width),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: 0, left: 0 });
    window.document
      .querySelector(`[data-page="${page}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [page]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        !blocked &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "p"
      ) {
        event.preventDefault();
        void editor.printView();
        return;
      }
      if (!blocked && event.key === "Escape") {
        setScanRegionMode(false);
        setTextRegionMode(false);
        setSelectedOverlay(null);
        setTool("view");
      }
      const input =
        event.target instanceof HTMLElement &&
        event.target.closest("input, select, textarea, [contenteditable]");
      if (
        !blocked &&
        !input &&
        !locked &&
        selectedOverlay &&
        (event.key === "Delete" || event.key === "Backspace")
      ) {
        event.preventDefault();
        editor.removeOverlay(page - 1, selectedOverlay);
        setSelectedOverlay(null);
        return;
      }
      if (
        !blocked &&
        !input &&
        !editor.busy &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "z"
      ) {
        event.preventDefault();
        if (event.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      if (
        !blocked &&
        !input &&
        !editor.busy &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "y"
      ) {
        event.preventDefault();
        editor.redo();
        return;
      }
      if (
        !blocked &&
        !input &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "s"
      ) {
        event.preventDefault();
        void editor.download();
        return;
      }
      if (
        !blocked &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "f"
      ) {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (
        blocked ||
        (event.target instanceof HTMLElement &&
          event.target.closest(
            "input, select, textarea, button, [contenteditable]",
          ))
      )
        return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (
        !locked &&
        selectedOverlay &&
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      ) {
        const overlay = entry.overlays.find(
          (item) => item.id === selectedOverlay,
        );
        if (overlay && overlay.kind !== "form") {
          event.preventDefault();
          const step = event.shiftKey ? 10 : 1;
          editor.updateOverlay(
            page - 1,
            translateOverlay(
              overlay,
              event.key === "ArrowRight"
                ? step
                : event.key === "ArrowLeft"
                  ? -step
                  : 0,
              event.key === "ArrowUp"
                ? step
                : event.key === "ArrowDown"
                  ? -step
                  : 0,
            ),
          );
          return;
        }
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        setPage((value) => Math.min(editor.pages.length, value + 1));
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setPage((value) => Math.max(1, value - 1));
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setFit(false);
        setZoom((value) => Math.min(200, value + 10));
      }
      if (event.key === "-") {
        event.preventDefault();
        setFit(false);
        setZoom((value) => Math.max(30, value - 10));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor, blocked, locked, selectedOverlay, entry, page]);

  return (
    <>
      <form
        id="export-document"
        onSubmit={(event) => {
          event.preventDefault();
          void editor.download();
        }}
      />
      {editor.error && (
        <div className="error-banner" role="alert">
          <Info size={17} />
          <span>{editor.error}</span>
          <button onClick={editor.clearError}>Kapat</button>
        </div>
      )}
      {document.encrypted && (
        <div className="read-only-banner">
          <LockKeyhole size={14} />
          Şifreli belge salt okunur açıldı. Arama, metin seçimi ve orijinali
          indirme kullanılabilir.
        </div>
      )}
      <div className="document-bar">
        <div className="document-name">
          <span className="file-type">PDF</span>
          <h1 title={file.name}>{file.name}</h1>
          {isDemo && <span className="demo-tag">Örnek belge</span>}
          {editor.modified && <span className="dirty-tag">Değiştirildi</span>}
        </div>
        <div className="document-meta">
          <span>{editor.pages.length} sayfa</span>
          <span className="meta-divider" />
          <span>{formatSize(file.size)}</span>
          <IconButton
            label={
              showInfo ? "Belge bilgilerini gizle" : "Belge bilgilerini göster"
            }
            onClick={() => setShowInfo(!showInfo)}
          >
            {showInfo ? (
              <PanelRightClose size={18} />
            ) : (
              <PanelRightOpen size={18} />
            )}
          </IconButton>
        </div>
      </div>
      <div
        className="editor-toolbar"
        role="toolbar"
        aria-label="Belge araçları"
      >
        <div className="tool-group">
          <IconButton
            label={
              showPages ? "Sayfa listesini gizle" : "Sayfa listesini göster"
            }
            onClick={() => setShowPages(!showPages)}
          >
            <LayoutPanelLeft size={18} />
          </IconButton>
          <div className="toolbar-divider" />
          <button
            className={`tool-button ${tool === "view" ? "selected" : ""}`}
            onClick={() => chooseTool("view")}
            aria-pressed={tool === "view"}
          >
            <MousePointer2 size={17} />
            <span>Görünüm</span>
          </button>
          <IconButton
            label="Elle kaydır"
            className={tool === "hand" ? "selected" : ""}
            onClick={() => chooseTool("hand")}
            aria-pressed={tool === "hand"}
          >
            <Hand size={18} />
          </IconButton>
        </div>
        <div className="toolbar-divider" />
        <div className="tool-group edit-tools">
          <button
            className={`tool-button ${tool === "text" ? "selected" : ""}`}
            disabled={locked}
            onClick={() => chooseTool("text")}
            title="Metin ekle"
          >
            <Type size={18} />
            <span>Metin</span>
          </button>
          <button
            className={`tool-button ${tool === "highlight" ? "selected" : ""}`}
            disabled={locked}
            onClick={() => chooseTool("highlight")}
            title="Vurgula"
          >
            <Underline size={18} />
            <span>Vurgula</span>
          </button>
          <button
            className={`tool-button ${tool === "signature" ? "selected" : ""}`}
            disabled={locked}
            onClick={() => chooseTool("signature")}
            title="İmza ekle"
          >
            <Signature size={18} />
            <span>İmza</span>
          </button>
          <div className="shape-tools" role="group" aria-label="Şekil araçları">
            {(
              [
                ["rectangle", "Dikdörtgen çiz", Square],
                ["ellipse", "Elips çiz", Circle],
                ["triangle", "Üçgen çiz", Triangle],
                ["line", "Çizgi çiz", Slash],
                ["arrow", "Ok çiz", ArrowUpRight],
              ] as const
            ).map(([shape, label, Icon]) => (
              <IconButton
                key={shape}
                label={label}
                disabled={locked}
                aria-pressed={tool === "rectangle" && settings.shape === shape}
                className={
                  tool === "rectangle" && settings.shape === shape
                    ? "selected"
                    : ""
                }
                onClick={() => {
                  chooseTool("rectangle");
                  setSettings((current) => ({ ...current, shape }));
                }}
              >
                <Icon size={17} />
              </IconButton>
            ))}
          </div>
          <IconButton
            label="Serbest çizim"
            disabled={locked}
            className={tool === "draw" ? "selected" : ""}
            onClick={() => chooseTool("draw")}
          >
            <Pencil size={17} />
          </IconButton>
          <IconButton
            label="Görsel ekle"
            disabled={locked}
            className={tool === "image" ? "selected" : ""}
            onClick={() => chooseTool("image")}
          >
            <ImagePlus size={17} />
          </IconButton>
        </div>
        <IconButton
          label="PDF görsellerini göster"
          disabled={locked}
          aria-pressed={showImages}
          onClick={() => {
            setEditingToolsHidden(false);
            setShowImages((value) => !value);
            setShowInfo(false);
            setTool("view");
            setSelectedOverlay(null);
          }}
        >
          <Images size={18} />
        </IconButton>
        <IconButton
          label="Taranmış yazıyı tanı"
          disabled={locked || !source}
          onClick={() => {
            chooseTool("content");
            void ocr.recognize();
          }}
        >
          <ScanText size={18} />
        </IconButton>
        <button
          className={`tool-button ${tool === "content" ? "selected" : ""}`}
          disabled={locked}
          aria-label="PDF içeriğini düzenle"
          title="PDF içeriğini düzenle"
          onClick={() => chooseTool("content")}
        >
          <Type size={17} />
          <span>PDF içeriğini düzenle</span>
        </button>
        {editingToolsHidden && (
          <IconButton
            label="Düzenleme araçlarını göster"
            onClick={() => setEditingToolsHidden(false)}
          >
            <PanelRightOpen size={18} />
          </IconButton>
        )}
        <IconButton
          label="Form doldur"
          disabled={locked}
          className={tool === "form" ? "selected" : ""}
          onClick={() => chooseTool("form")}
        >
          <ListChecks size={17} />
        </IconButton>
        <IconButton
          label="Yazdırma görünümü"
          disabled={editor.busy}
          onClick={() => void editor.printView()}
        >
          <Printer size={17} />
        </IconButton>
        <div className="toolbar-fill" />
        <IconButton
          label="Geri al"
          disabled={!editor.canUndo || editor.busy}
          onClick={editor.undo}
        >
          <Undo2 size={17} />
        </IconButton>
        <IconButton
          label="İleri al"
          disabled={!editor.canRedo || editor.busy}
          onClick={editor.redo}
        >
          <Redo2 size={17} />
        </IconButton>
        <IconButton
          label="Belgede ara"
          onClick={() => setSearchOpen((value) => !value)}
          className={searchOpen ? "selected" : ""}
        >
          <Search size={18} />
        </IconButton>
        <IconButton
          label="Sayfayı saat yönünde döndür"
          disabled={locked}
          onClick={() => editor.rotate(page - 1)}
        >
          <RotateCw size={18} />
        </IconButton>
        <div className="toolbar-divider" />
        <div className="zoom-controls">
          <IconButton
            label="Uzaklaştır"
            disabled={!fit && zoom <= 30}
            onClick={() => {
              setFit(false);
              setZoom((value) => Math.max(30, value - 10));
            }}
          >
            <Minus size={16} />
          </IconButton>
          <label className="zoom-select">
            <span className="sr-only">Yakınlaştırma oranı</span>
            <select
              value={fit ? "fit" : zoom}
              onChange={(event) => {
                if (event.target.value === "fit") setFit(true);
                else {
                  setFit(false);
                  setZoom(Number(event.target.value));
                }
              }}
            >
              <option value="fit">Sığdır</option>
              {Array.from(new Set([30, 50, 75, 100, 125, 150, 200, zoom]))
                .sort((a, b) => a - b)
                .map((value) => (
                  <option key={value} value={value}>
                    {value}%
                  </option>
                ))}
            </select>
            <ChevronDown size={13} />
          </label>
          <IconButton
            label="Yakınlaştır"
            disabled={!fit && zoom >= 200}
            onClick={() => {
              setFit(false);
              setZoom((value) => Math.min(200, value + 10));
            }}
          >
            <Plus size={16} />
          </IconButton>
          <IconButton
            label="Sayfayı genişliğe sığdır"
            aria-pressed={fit}
            className={fit ? "selected" : ""}
            onClick={() => setFit(!fit)}
          >
            <Maximize size={17} />
          </IconButton>
        </div>
      </div>
      {searchOpen && (
        <SearchBar
          documents={searchDocuments}
          onQuery={setSearchQuery}
          onPage={setPage}
          onOccurrence={setSearchOccurrence}
          close={() => setSearchOpen(false)}
        />
      )}
      <div
        className={`workspace ${textEditing ? "with-text-editor" : ""} ${showInfo && !textEditing ? "" : "without-info"} ${showPages ? "" : "without-pages"}`}
      >
        {showPages && (
          <PagePanel
            pages={editor.pages}
            sources={editor.sources}
            selected={page}
            select={setPage}
            busy={locked}
            rotate={editor.rotate}
            remove={editor.remove}
            duplicate={editor.duplicate}
            move={editor.move}
            blank={editor.blank}
            merge={editor.merge}
            extract={(index) => void editor.download(index)}
          />
        )}
        <section className="document-stage" aria-label="Sayfa önizlemesi">
          {!editingToolsHidden && (
            <>
              {(showOcrControls || showImages) && (
                <div className="editing-tools-heading">
                  <span>Belge düzenleme araçları</span>
                  <button
                    className="icon-button"
                    aria-label="Düzenleme araçlarını kapat"
                    onClick={() => {
                      if (ocr.busy) ocr.cancel();
                      setEditingToolsHidden(true);
                      setShowImages(false);
                      chooseTool("view");
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              {tool === "content" && (
                <div className="content-hint" role="status">
                  {native.loading
                    ? "PDF içeriği yerelde okunuyor…"
                    : "Kesikli alanı seçerek paragrafı veya görseli düzenleyin. Paragraflar birlikte düzenlenir; metin yerel Noto fontuyla yeniden yazılır. Taranmış sayfada “Taranmış yazıyı tanı” aracını kullanın. Dikey yazı desteklenmez."}
                </div>
              )}
              {scanTarget &&
                !locked &&
                (tool === "content" || tool === "view") && (
                  <div className="scan-region-tools">
                    <button
                      className="button button-light"
                      aria-pressed={scanRegionMode}
                      onClick={() => {
                        setSelectedOverlay(null);
                        setTextRegionMode(false);
                        setScanRegionMode(!scanRegionMode);
                      }}
                    >
                      <Images size={15} />{" "}
                      {scanRegionMode
                        ? "Alan seçimini iptal et"
                        : "Taramadan görsel alanı seç"}
                    </button>
                    <span>
                      {scanRegionMode
                        ? "Fotoğrafın çevresini sürükleyerek seçin. Seçilen alan taşınabilir ve silinebilir."
                        : "Yazılar için taranmış yazıyı tanıyın; fotoğraflar için alan seçin."}
                    </span>
                  </div>
                )}
              {selectionError && (
                <div className="error-banner" role="alert">
                  {selectionError}
                </div>
              )}
              <ContentTools
                ocr={ocr}
                regionMode={textRegionMode}
                showOcrControls={showOcrControls}
                chooseRegion={() => {
                  setScanRegionMode(false);
                  setSelectedOverlay(null);
                  setTool("view");
                  setTextRegionMode(!textRegionMode);
                }}
                showImages={showImages}
                images={imageTargets}
                loading={native.loading}
                busy={locked}
                select={selectContent}
                closeImages={() => setShowImages(false)}
              />
            </>
          )}
          {native.error && (
            <div className="error-banner" role="alert">
              {native.error}
            </div>
          )}
          {tool === "view" && imageTargets.length > 0 && (
            <div className="image-edit-hint">
              PDF içindeki görsele tıklayın; taşıyın, boyutlandırın veya
              değiştirin.
            </div>
          )}
          {isDemo && (
            <div className="sample-notice">
              <span>
                <Sparkles size={14} />
                Bir örnekle başlayın, kendi belgenizle devam edin.
              </span>
              <button onClick={openFile}>
                PDF aç <ArrowRight size={14} />
              </button>
            </div>
          )}
          <div
            className={`document-viewport ${tool === "hand" ? "pan-mode" : ""}`}
            ref={viewportRef}
            onPointerDown={(event) => {
              if (
                tool === "view" &&
                !(event.target as Element).closest("[data-overlay-id]")
              )
                setSelectedOverlay(null);
              if (tool !== "hand" || event.button !== 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              pan.current = {
                x: event.clientX,
                y: event.clientY,
                left: event.currentTarget.scrollLeft,
                top: event.currentTarget.scrollTop,
              };
            }}
            onPointerMove={(event) => {
              if (!pan.current) return;
              event.currentTarget.scrollLeft =
                pan.current.left + pan.current.x - event.clientX;
              event.currentTarget.scrollTop =
                pan.current.top + pan.current.y - event.clientY;
            }}
            onPointerUp={() => {
              pan.current = null;
            }}
            onPointerCancel={() => {
              pan.current = null;
            }}
          >
            <div className="paper-position" style={{ minWidth: width + 64 }}>
              <div className="paper-caption">
                <span>{page === 1 && isDemo ? "Kapak" : `Sayfa ${page}`}</span>
                <span>
                  {rotation !== 0
                    ? `Sayfa ${rotation}° döndürüldü`
                    : "PDF önizlemesi"}
                </span>
              </div>
              <div className="main-paper">
                {source ? (
                  <PdfCanvas
                    pdf={native.pdf ?? source.pdf}
                    page={native.page}
                    displayPage={page}
                    width={width}
                    rotation={rotation}
                    query={searchQuery}
                    occurrence={searchOccurrence}
                    renderOverlay={(viewport) => (
                      <>
                        {(tool === "content" || tool === "view") && !locked && (
                          <NativeContentLayer
                            viewport={viewport}
                            targets={
                              tool === "content"
                                ? contentTargets
                                : [
                                    ...directImages,
                                    ...(editingToolsHidden ? [] : ocr.targets),
                                  ]
                            }
                            quiet={tool === "view"}
                            scanRegion={scanRegionMode ? scanTarget : undefined}
                            onRegion={
                              textRegionMode
                                ? (bounds) => {
                                    setTextRegionMode(false);
                                    void ocr.recognize(bounds);
                                  }
                                : undefined
                            }
                            select={selectContent}
                          />
                        )}
                        <FormLayer
                          pdf={source.pdf}
                          page={entry.sourcePage}
                          viewport={viewport}
                          overlays={entry.overlays}
                          editable={tool === "form" && !locked}
                          onChange={(name, value) =>
                            editor.setFormValue(page - 1, name, value)
                          }
                        />
                        <AnnotationLayer
                          key={entry.id}
                          viewport={viewport}
                          overlays={entry.overlays}
                          tool={tool}
                          settings={settings}
                          selected={selectedOverlay}
                          onSelect={(id) => {
                            setSelectedOverlay(id);
                          }}
                          onAdd={(overlay) => {
                            editor.annotate(page - 1, overlay);
                            setTool("view");
                            setSelectedOverlay(overlay.id);
                          }}
                          onUpdate={(overlay) =>
                            editor.updateOverlay(page - 1, overlay)
                          }
                          disabled={locked}
                          hidden={native.pending}
                        />
                      </>
                    )}
                  />
                ) : (
                  <div
                    className="blank-paper"
                    style={{
                      width,
                      height: width * (rotation % 180 ? 595 / 842 : 842 / 595),
                    }}
                    aria-label="Boş sayfa"
                  />
                )}
              </div>
              <p className="paper-bottom">
                {page} / {editor.pages.length}
              </p>
            </div>
          </div>
          <div className="page-navigation">
            <IconButton
              label="Önceki sayfa"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={17} />
            </IconButton>
            <label>
              <span className="sr-only">Sayfa numarası</span>
              <input
                type="number"
                min={1}
                max={editor.pages.length}
                value={page}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (
                    Number.isInteger(value) &&
                    value >= 1 &&
                    value <= editor.pages.length
                  )
                    setPage(value);
                }}
              />
              <span>/ {editor.pages.length}</span>
            </label>
            <IconButton
              label="Sonraki sayfa"
              disabled={page >= editor.pages.length}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={17} />
            </IconButton>
          </div>
        </section>
        {((tool !== "view" &&
          tool !== "hand" &&
          tool !== "form" &&
          tool !== "content" &&
          tool !== "text" &&
          tool !== "rectangle") ||
          selectedOverlay) && (
          <ToolPanel
            key={entry.id + tool}
            tool={tool}
            settings={settings}
            change={setSettings}
            overlays={entry.overlays}
            selected={selectedOverlay}
            select={(id) => {
              setSelectedOverlay(id);
              if (!id) setTool("view");
            }}
            remove={(id) => {
              editor.removeOverlay(page - 1, id);
              setSelectedOverlay(null);
            }}
            update={(overlay) => editor.updateOverlay(page - 1, overlay)}
            duplicate={(overlay) => {
              if (overlay.kind === "form") return;
              const copy = {
                ...translateOverlay(overlay, 12, -12),
                id: crypto.randomUUID(),
              };
              if (copy.kind === "image") delete copy.native;
              editor.annotate(page - 1, copy);
              setSelectedOverlay(copy.id);
            }}
            order={(id, direction) =>
              editor.orderOverlay(page - 1, id, direction)
            }
            busy={locked}
          />
        )}
        {showInfo && !textEditing && (
          <DocumentInfo
            name={file.name}
            size={file.size}
            pages={editor.pages.length}
            dirty={editor.modified}
            privacy={privacy}
            openDemo={openDemo}
          />
        )}
      </div>
      {(editor.busy || editor.message) && (
        <div className="editor-notice" role="status">
          {editor.busy ? "Belge işleniyor…" : editor.message}
        </div>
      )}
    </>
  );
}
