import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  FilePlus2,
  Files,
  Plus,
  RotateCw,
  Trash2,
} from "lucide-react";
import { IconButton } from "../../components/IconButton";
import { OverlayGraphics } from "./AnnotationLayer";
import { useNativeContent } from "./useNativeContent";
import { FormLayer } from "./FormLayer";
import { Outline } from "../viewer/Outline";
import { PdfCanvas } from "../viewer/PdfCanvas";
import type { EditorPage } from "./model";
import type { PageSource } from "../../lib/exportPdf";

interface Props {
  pages: EditorPage[];
  sources: Map<string, PageSource>;
  selected: number;
  select: (page: number) => void;
  busy: boolean;
  rotate: (index: number) => void;
  remove: (index: number) => void;
  duplicate: (index: number) => void;
  move: (from: number, to: number) => void;
  blank: (index: number) => Promise<boolean>;
  merge: (file: File) => Promise<void>;
  extract: (page: number) => void;
}
export function PagePanel({
  pages,
  sources,
  selected,
  select,
  busy,
  rotate,
  remove,
  duplicate,
  move,
  blank,
  merge,
  extract,
}: Props) {
  const [tab, setTab] = useState<"pages" | "outline">("pages");
  const input = useRef<HTMLInputElement>(null);
  return (
    <aside className="pages-panel" aria-label="Belge sayfaları">
      <div className="panel-heading">
        <h2>Sayfalar</h2>
        <span>{pages.length}</span>
      </div>
      <div className="page-tabs">
        <button
          className={tab === "pages" ? "active" : ""}
          onClick={() => setTab("pages")}
        >
          Sayfalar
        </button>
        <button
          className={tab === "outline" ? "active" : ""}
          onClick={() => setTab("outline")}
        >
          İçindekiler
        </button>
      </div>
      {tab === "outline" && (
        <Outline
          pdf={sources.get("original")!.pdf}
          pages={pages}
          select={select}
        />
      )}
      <div className="page-list" hidden={tab !== "pages"}>
        {pages.map((entry, index) => {
          const source = entry.sourceId ? sources.get(entry.sourceId) : null;
          return (
            <button
              className={`page-thumbnail ${selected === index + 1 ? "active" : ""}`}
              key={entry.id}
              data-page={index + 1}
              onClick={() => select(index + 1)}
              aria-label={`${index + 1}. sayfaya git`}
              aria-current={selected === index + 1 ? "page" : undefined}
            >
              <div className="thumbnail-paper">
                {source ? (
                  <PageThumbnailCanvas
                    source={source}
                    entry={entry}
                    displayPage={index + 1}
                    width={112}
                    rotation={entry.rotation}
                    thumbnail
                    renderOverlay={(viewport) => (
                      <>
                        <svg
                          className="annotation-thumbnail"
                          width={viewport.width}
                          height={viewport.height}
                        >
                          <OverlayGraphics
                            viewport={viewport}
                            overlays={entry.overlays}
                          />
                        </svg>
                        <div aria-hidden="true" inert>
                          <FormLayer
                            pdf={source.pdf}
                            page={entry.sourcePage}
                            viewport={viewport}
                            overlays={entry.overlays}
                            editable={false}
                            onChange={() => {}}
                          />
                        </div>
                      </>
                    )}
                  />
                ) : (
                  <div className="blank-thumbnail">
                    <span>Boş sayfa</span>
                  </div>
                )}
                {(entry.overlays.length > 0 || !!entry.removals?.length) && (
                  <span
                    className="edited-thumbnail-dot"
                    title="Eklemeler var"
                  />
                )}
                {selected === index + 1 && (
                  <span className="thumbnail-check">
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
              </div>
              <span className="page-number">{index + 1}</span>
            </button>
          );
        })}
      </div>
      <div
        className="page-actions"
        role="toolbar"
        aria-label="Seçili sayfa işlemleri"
      >
        <IconButton
          label="Sayfayı yukarı taşı"
          disabled={busy || selected <= 1}
          onClick={() => {
            move(selected - 1, selected - 2);
            select(selected - 1);
          }}
        >
          <ArrowUp size={15} />
        </IconButton>
        <IconButton
          label="Sayfayı aşağı taşı"
          disabled={busy || selected >= pages.length}
          onClick={() => {
            move(selected - 1, selected);
            select(selected + 1);
          }}
        >
          <ArrowDown size={15} />
        </IconButton>
        <IconButton
          label="Sayfayı çoğalt"
          disabled={busy}
          onClick={() => {
            duplicate(selected - 1);
            select(selected + 1);
          }}
        >
          <Copy size={15} />
        </IconButton>
        <IconButton
          label="Sayfayı döndür"
          disabled={busy}
          onClick={() => rotate(selected - 1)}
        >
          <RotateCw size={15} />
        </IconButton>
        <IconButton
          label="Sayfayı sil"
          disabled={busy || pages.length === 1}
          onClick={() => {
            remove(selected - 1);
            select(Math.min(selected, pages.length - 1));
          }}
        >
          <Trash2 size={15} />
        </IconButton>
      </div>
      <div className="page-add-actions">
        <button
          disabled={busy}
          onClick={async () => {
            if (await blank(selected - 1)) select(selected + 1);
          }}
        >
          <Plus size={14} />
          Boş sayfa ekle
        </button>
        <button disabled={busy} onClick={() => input.current?.click()}>
          <FilePlus2 size={14} />
          PDF birleştir
        </button>
        <button disabled={busy} onClick={() => extract(selected - 1)}>
          <Files size={14} />
          Bu sayfayı indir
        </button>
      </div>
      <input
        className="file-input"
        type="file"
        ref={input}
        accept=".pdf,application/pdf"
        aria-label="Birleştirilecek PDF seç"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void merge(file);
          event.target.value = "";
        }}
      />
    </aside>
  );
}

function PageThumbnailCanvas({
  source,
  entry,
  ...props
}: { source: PageSource; entry: EditorPage } & Omit<
  React.ComponentProps<typeof PdfCanvas>,
  "pdf" | "page"
>) {
  const native = useNativeContent(source, entry, false);
  return (
    <PdfCanvas
      {...props}
      pdf={native.pdf ?? source.pdf}
      page={native.page}
      renderOverlay={(viewport) =>
        native.pending ? null : props.renderOverlay?.(viewport)
      }
    />
  );
}
