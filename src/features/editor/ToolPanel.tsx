import {
  addLocalFont,
  availableStyle,
  loadSystemFamily,
  localFonts,
  systemFamilies,
} from "../../lib/sessionFonts";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, GripHorizontal, ImagePlus, Trash2, X } from "lucide-react";
import type { EditorTool, ToolSettings } from "./AnnotationLayer";
import type { Overlay } from "./model";
import { SignaturePad } from "./SignaturePad";

const titles: Record<EditorTool, string> = {
  view: "Eklemeyi düzenle",
  hand: "Elle kaydır",
  text: "Metin ekle",
  highlight: "Vurgula",
  rectangle: "Şekil ekle",
  draw: "Serbest çizim",
  image: "Görsel ekle",
  signature: "İmza ekle",
  form: "Form doldur",
  content: "PDF içeriğini düzenle",
};
export function ToolPanel({
  tool,
  settings,
  change,
  overlays,
  selected,
  select,
  remove,
  update: onUpdate,
  busy,
  duplicate,
  order,
}: {
  tool: EditorTool;
  settings: ToolSettings;
  change: (settings: ToolSettings) => void;
  overlays: Overlay[];
  selected: string | null;
  select: (id: string | null) => void;
  remove: (id: string) => void;
  update: (overlay: Overlay) => void;
  busy: boolean;
  duplicate: (overlay: Overlay) => void;
  order: (id: string, direction: -1 | 1) => void;
}) {
  const selectedOverlay = overlays.find((item) => item.id === selected);
  const docked = selectedOverlay?.kind === "text";
  const orderable = overlays.filter(
    (item) => !(item.kind === "image" && item.native),
  );
  const panel = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 300, top: 220 });
  const clickPoint = useRef<{ x: number; y: number } | null>(null);
  const manualPosition = useRef<{ left: number; top: number } | null>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  function clampPosition(left: number, top: number) {
    return {
      left: Math.max(
        8,
        Math.min(
          left,
          window.innerWidth - (panel.current?.offsetWidth ?? 320) - 8,
        ),
      ),
      top: Math.max(
        8,
        Math.min(
          top,
          window.innerHeight - (panel.current?.offsetHeight ?? 200) - 8,
        ),
      ),
    };
  }
  function movePanel(left: number, top: number) {
    manualPosition.current = clampPosition(left, top);
    setPosition(manualPosition.current);
  }
  useLayoutEffect(() => {
    manualPosition.current = null;
    drag.current = null;
  }, [selected, tool, docked]);
  useEffect(() => {
    if (docked) return;
    const remember = (event: PointerEvent) => {
      if ((event.target as Element).closest(".annotation-overlay")) {
        if (manualPosition.current) return;
        clickPoint.current = { x: event.clientX, y: event.clientY };
        setPosition({
          left: Math.max(8, Math.min(event.clientX, window.innerWidth - 328)),
          top: Math.max(
            8,
            Math.min(
              event.clientY + 14,
              window.innerHeight - (panel.current?.offsetHeight ?? 200) - 8,
            ),
          ),
        });
      }
    };
    window.addEventListener("pointerdown", remember, true);
    return () => window.removeEventListener("pointerdown", remember, true);
  }, [docked]);
  useLayoutEffect(() => {
    if (docked) return;
    const place = () => {
      if (manualPosition.current) {
        movePanel(manualPosition.current.left, manualPosition.current.top);
        return;
      }
      const target = selected
        ? document.querySelector(`.main-paper [data-overlay-id="${selected}"]`)
        : null;
      const rect = target?.getBoundingClientRect();
      const stage = document
        .querySelector(".main-paper")
        ?.getBoundingClientRect();
      const width = panel.current?.offsetWidth ?? 320;
      const height = panel.current?.offsetHeight ?? 200;
      const x =
        rect?.left ?? clickPoint.current?.x ?? (stage ? stage.right + 16 : 20);
      const y = rect?.bottom ?? clickPoint.current?.y ?? stage?.top ?? 180;
      setPosition({
        left: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
        top: Math.max(8, Math.min(y + 14, window.innerHeight - height - 8)),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    const observer = new ResizeObserver(place);
    if (panel.current) observer.observe(panel.current);
    const paper = document.querySelector(".main-paper");
    if (paper) observer.observe(paper);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      observer.disconnect();
    };
  }, [selected, overlays, tool, docked]);
  const input = useRef<HTMLInputElement>(null);
  const fontInput = useRef<HTMLInputElement>(null);
  const [fontLoading, setFontLoading] = useState(false);
  const [, refreshFonts] = useState(0);
  const fontGeneration = useRef(0);
  useEffect(() => {
    fontGeneration.current++;
    return () => {
      fontGeneration.current++;
    };
  }, [selected]);
  async function chooseFont(value: string) {
    if (selectedOverlay?.kind !== "text") return;
    const generation = ++fontGeneration.current;
    setError("");
    setFontLoading(true);
    try {
      const id = value.startsWith("system:")
        ? (await loadSystemFamily(value.slice(7))).id
        : value;
      refreshFonts((v) => v + 1);
      if (generation === fontGeneration.current)
        update({
          ...selectedOverlay,
          font: id,
          bold: availableStyle(
            id,
            !!selectedOverlay.bold,
            !!selectedOverlay.italic,
          )
            ? selectedOverlay.bold
            : false,
          italic: availableStyle(
            id,
            !!selectedOverlay.bold,
            !!selectedOverlay.italic,
          )
            ? selectedOverlay.italic
            : false,
        });
    } catch (cause) {
      if (generation === fontGeneration.current)
        setError(cause instanceof Error ? cause.message : "Font yüklenemedi.");
    } finally {
      setFontLoading(false);
    }
  }
  const [error, setError] = useState("");
  const [draftText, setDraftText] = useState<string | null>(null);
  function update(overlay: Overlay) {
    onUpdate(
      overlay.kind === "text" && draftText !== null && draftText.trim()
        ? { ...overlay, text: draftText }
        : overlay,
    );
  }
  const imageRequest = useRef(0);
  useEffect(() => {
    imageRequest.current++;
    return () => {
      imageRequest.current++;
    };
  }, [selected]);
  async function loadImage(file: File) {
    const request = ++imageRequest.current;
    setError("");
    if (file.size > 10 * 1024 * 1024) {
      setError("En fazla 10 MB boyutunda PNG veya JPEG seçin.");
      return;
    }
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("PNG veya JPEG biçiminde bir görsel seçin.");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const width = Math.min(image.naturalWidth, 2400);
      const height = (width * image.naturalHeight) / image.naturalWidth;
      if (
        image.naturalWidth * image.naturalHeight > 40_000_000 ||
        height > 12000
      )
        throw new Error("Bu görsel çok büyük. Daha küçük bir kopya seçin.");
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Görsel hazırlanamadı.");
      context.drawImage(image, 0, 0, width, height);
      if (request !== imageRequest.current) return;
      if (selectedOverlay?.kind === "image") {
        update({
          ...selectedOverlay,
          data: canvas.toDataURL("image/png"),
          height: (selectedOverlay.width * height) / width,
        });
      } else
        change({
          ...settings,
          image: canvas.toDataURL("image/png"),
          imageRatio: width / height,
        });
    } catch (cause) {
      if (request === imageRequest.current)
        setError(cause instanceof Error ? cause.message : "Görsel açılamadı.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  useEffect(() => {
    setDraftText(null);
  }, [selectedOverlay]);
  const content = (
    <div
      ref={panel}
      className={`context-tools tool-panel ${docked ? "text-editor-panel" : ""} ${selectedOverlay ? "has-selection" : ""}`}
      style={docked ? undefined : position}
      role="region"
      aria-label={docked ? "Metin düzenleme paneli" : "Yerinde düzenleme"}
    >
      <div className="panel-heading">
        {!docked && (
          <button
            className="icon-button panel-drag-handle"
            aria-label="Araç penceresini taşı"
            title="Sürükleyin veya ok tuşlarıyla taşıyın"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              const rect = panel.current!.getBoundingClientRect();
              drag.current = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                left: rect.left,
                top: rect.top,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const start = drag.current;
              if (start?.id === event.pointerId)
                movePanel(
                  start.left + event.clientX - start.x,
                  start.top + event.clientY - start.y,
                );
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onLostPointerCapture={() => {
              drag.current = null;
            }}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  event.key,
                )
              )
                return;
              event.preventDefault();
              event.stopPropagation();
              const step = event.shiftKey ? 20 : 10;
              movePanel(
                position.left +
                  (event.key === "ArrowLeft"
                    ? -step
                    : event.key === "ArrowRight"
                      ? step
                      : 0),
                position.top +
                  (event.key === "ArrowUp"
                    ? -step
                    : event.key === "ArrowDown"
                      ? step
                      : 0),
              );
            }}
          >
            <GripHorizontal size={17} />
          </button>
        )}
        <h2>{docked ? "Metni düzenle" : titles[tool]}</h2>
        <button
          className="icon-button"
          aria-label="Düzenlemeyi kapat"
          onClick={() => select(null)}
        >
          <X size={16} />
        </button>
      </div>
      <fieldset className="tool-panel-content" disabled={busy || fontLoading}>
        <p className="tool-instruction">
          {tool === "text"
            ? "Sayfaya tıklayın; açılan çubukta metninizi yazın."
            : tool === "form"
              ? "Sayfadaki alanları doldurun. Metni tamamlayınca alanın dışına tıklayın. Doldurulmuş alanlar çıktıda sabitlenir."
              : tool === "view"
                ? "Sürükleyerek taşıyın. Escape ile kapatın, Delete ile silin."
                : tool === "draw"
                  ? "Sayfa üzerinde basılı tutup çizin."
                  : tool === "image"
                    ? "Bir görsel seçin, ardından sayfada yerini seçin."
                    : tool === "signature"
                      ? "İmzanızı çizin, “İmzayı kullan” deyin ve sayfada yerini seçin."
                      : "Sayfa üzerinde sürükleyerek bir alan çizin."}
        </p>
        {["text", "highlight", "rectangle", "draw"].includes(tool) && (
          <label>
            Renk
            <input
              type="color"
              value={settings.color}
              onChange={(event) =>
                change({ ...settings, color: event.target.value })
              }
            />
          </label>
        )}
        {tool === "draw" && (
          <label>
            Çizgi kalınlığı
            <select
              value={settings.thickness}
              onChange={(event) =>
                change({ ...settings, thickness: Number(event.target.value) })
              }
            >
              {[1, 2, 3, 5, 8].map((value) => (
                <option key={value} value={value}>
                  {value} pt
                </option>
              ))}
            </select>
          </label>
        )}
        {(tool === "image" || selectedOverlay?.kind === "image") && (
          <>
            <button
              className="button button-light"
              onClick={() => input.current?.click()}
            >
              <ImagePlus size={15} />
              {selectedOverlay?.kind === "image"
                ? "Görseli değiştir"
                : "Görsel seç"}
            </button>
            <input
              ref={input}
              type="file"
              className="file-input"
              accept="image/png,image/jpeg"
              aria-label={
                selectedOverlay?.kind === "image"
                  ? "Yeni görsel seç"
                  : "Eklenecek görsel seç"
              }
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void loadImage(file);
                event.target.value = "";
              }}
            />
          </>
        )}
        {tool === "signature" && (
          <>
            <SignaturePad
              onUse={(image, imageRatio) =>
                change({ ...settings, image, imageRatio })
              }
            />
            <p className="tool-footnote">
              Bu görsel bir imzadır; sertifikalı dijital imza değildir.
            </p>
          </>
        )}
        {["image", "signature"].includes(tool) && settings.image && (
          <div className="image-ready">
            <img src={settings.image} alt="Sayfaya eklenecek görsel" />
            <span>
              <Check size={13} />
              Hazır. Sayfada bir noktaya tıklayın.
            </span>
          </div>
        )}
        {error && (
          <p className="tool-error" role="alert">
            {error}
          </p>
        )}
        {selectedOverlay && (
          <div className="selected-overlay-controls">
            <h4>Seçili ekleme</h4>
            {selectedOverlay.kind === "text" && (
              <>
                <textarea
                  autoFocus
                  onFocus={(event) => event.target.select()}
                  key={selectedOverlay.id}
                  aria-label="Seçili metni düzenle"
                  maxLength={5000}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.stopPropagation();
                      if (
                        draftText?.trim() &&
                        draftText !== selectedOverlay.text
                      )
                        update({ ...selectedOverlay, text: draftText });
                      select(null);
                    }
                  }}
                  value={draftText ?? selectedOverlay.text}
                  onBlur={() => {
                    if (
                      draftText !== null &&
                      draftText.trim() &&
                      draftText !== selectedOverlay.text
                    )
                      update({ ...selectedOverlay, text: draftText });
                  }}
                  onChange={(event) => setDraftText(event.target.value)}
                />
                {selectedOverlay.textWidth !== undefined && (
                  <>
                    <label>
                      Paragraf genişliği
                      <input
                        aria-label="Paragraf genişliği"
                        type="number"
                        min={20}
                        max={2000}
                        value={Math.round(selectedOverlay.textWidth)}
                        onChange={(event) => {
                          const width = Number(event.target.value);
                          if (width >= 20 && width <= 2000)
                            update({ ...selectedOverlay, textWidth: width });
                        }}
                      />
                    </label>
                    <label>
                      Satır aralığı
                      <input
                        aria-label="Paragraf satır aralığı"
                        type="number"
                        min={4}
                        max={200}
                        value={Math.round(
                          selectedOverlay.lineHeight ??
                            selectedOverlay.size * 1.3,
                        )}
                        onChange={(event) => {
                          const lineHeight = Number(event.target.value);
                          if (lineHeight >= 4 && lineHeight <= 200)
                            update({ ...selectedOverlay, lineHeight });
                        }}
                      />
                    </label>
                  </>
                )}
                <button
                  className="button button-light"
                  disabled={busy}
                  onClick={() => {
                    select(null);
                  }}
                >
                  Bitti
                </button>
              </>
            )}
            {selectedOverlay.kind === "text" && (
              <div className="context-properties">
                <label>
                  Yazı tipi
                  <select
                    aria-label="Yazı tipi"
                    value={selectedOverlay.font ?? "sans"}
                    onChange={(event) => void chooseFont(event.target.value)}
                  >
                    <option value="sans">Noto Sans</option>
                    <option value="serif">Noto Serif</option>
                    <option value="mono">Noto Mono</option>
                    {localFonts()
                      .filter(
                        (font) =>
                          font.variants.Regular ||
                          font.id === selectedOverlay.font,
                      )
                      .map((font) => (
                        <option key={font.id} value={font.id}>
                          {font.label}
                        </option>
                      ))}
                    {systemFamilies
                      .filter(
                        (label) =>
                          !localFonts().some(
                            (font) =>
                              font.label === label && font.variants.Regular,
                          ),
                      )
                      .map((label) => (
                        <option key={label} value={`system:${label}`}>
                          {label} · cihazdan
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Boyut
                  <input
                    aria-label="Yazı boyutu"
                    type="number"
                    min={6}
                    max={144}
                    value={selectedOverlay.size}
                    onChange={(event) => {
                      const size = Number(event.target.value);
                      if (size >= 6 && size <= 144)
                        update({ ...selectedOverlay, size });
                    }}
                  />
                </label>
              </div>
            )}
            {selectedOverlay.kind === "text" && (
              <>
                <button
                  className="button button-light"
                  onClick={() => fontInput.current?.click()}
                >
                  Font dosyası ekle
                </button>
                <input
                  ref={fontInput}
                  type="file"
                  multiple
                  accept=".ttf,.otf"
                  className="file-input"
                  aria-label="Font dosyası seç"
                  onChange={async (event) => {
                    const files = Array.from(event.target.files ?? []);
                    event.target.value = "";
                    const generation = ++fontGeneration.current;
                    setFontLoading(true);
                    setError("");
                    try {
                      let imported;
                      for (const file of files.slice(0, 8)) {
                        if (file.size > 10_000_000)
                          throw new Error("Font en fazla 10 MB olabilir.");
                        imported = await addLocalFont(
                          new Uint8Array(await file.arrayBuffer()),
                        );
                      }
                      refreshFonts((v) => v + 1);
                      if (
                        imported?.variants.Regular &&
                        generation === fontGeneration.current
                      )
                        update({
                          ...selectedOverlay,
                          font: imported.id,
                          bold: false,
                          italic: false,
                        });
                    } catch (cause) {
                      if (generation === fontGeneration.current)
                        setError(
                          cause instanceof Error
                            ? cause.message
                            : "Font okunamadı.",
                        );
                    } finally {
                      setFontLoading(false);
                    }
                  }}
                />
                <p className="tool-footnote">
                  Cihaz fontları yalnızca bu oturumda kullanılır ve çıktı PDF’e
                  gömülür.
                </p>
                {selectedOverlay.ocrConfidence !== undefined && (
                  <p className="tool-footnote">
                    Tanıma güveni: %{Math.round(selectedOverlay.ocrConfidence)}.
                    Metni orijinal alanla karşılaştırın.
                  </p>
                )}
              </>
            )}
            {selectedOverlay.kind === "text" && (
              <div className="text-style-buttons">
                <button
                  className="button button-light"
                  disabled={
                    !availableStyle(
                      selectedOverlay.font,
                      !selectedOverlay.bold,
                      !!selectedOverlay.italic,
                    )
                  }
                  aria-label="Kalın yazı"
                  aria-pressed={!!selectedOverlay.bold}
                  onClick={() =>
                    update({ ...selectedOverlay, bold: !selectedOverlay.bold })
                  }
                >
                  <strong>K</strong>
                </button>
                <button
                  className="button button-light"
                  disabled={
                    !availableStyle(
                      selectedOverlay.font,
                      !!selectedOverlay.bold,
                      !selectedOverlay.italic,
                    )
                  }
                  aria-label="Eğik yazı"
                  aria-pressed={!!selectedOverlay.italic}
                  onClick={() =>
                    update({
                      ...selectedOverlay,
                      italic: !selectedOverlay.italic,
                    })
                  }
                >
                  <em>E</em>
                </button>
              </div>
            )}
            {(selectedOverlay.kind === "highlight" ||
              selectedOverlay.kind === "rectangle") && (
              <div className="context-properties">
                {(["width", "height"] as const).map((dimension) => (
                  <label key={dimension}>
                    {dimension === "width" ? "Genişlik" : "Yükseklik"}
                    <input
                      aria-label={
                        dimension === "width"
                          ? "Seçili alan genişliği"
                          : "Seçili alan yüksekliği"
                      }
                      type="number"
                      min={4}
                      max={2000}
                      value={Math.round(selectedOverlay[dimension])}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (value >= 4 && value <= 2000)
                          update({ ...selectedOverlay, [dimension]: value });
                      }}
                    />
                  </label>
                ))}
              </div>
            )}
            {"color" in selectedOverlay && (
              <label>
                Renk
                <input
                  aria-label="Seçili ekleme rengi"
                  type="color"
                  value={selectedOverlay.color}
                  onChange={(event) =>
                    update({ ...selectedOverlay, color: event.target.value })
                  }
                />
              </label>
            )}
            {selectedOverlay.kind === "draw" && (
              <label>
                Çizgi kalınlığı
                <input
                  aria-label="Seçili çizgi kalınlığı"
                  type="number"
                  min={1}
                  max={20}
                  value={selectedOverlay.thickness}
                  onChange={(event) => {
                    const thickness = Number(event.target.value);
                    if (thickness >= 1 && thickness <= 20)
                      update({ ...selectedOverlay, thickness });
                  }}
                />
              </label>
            )}
            {selectedOverlay.kind === "image" && (
              <label>
                Genişlik
                <input
                  aria-label="Seçili görsel genişliği"
                  type="range"
                  min={30}
                  max={550}
                  value={selectedOverlay.width}
                  onChange={(event) => {
                    const width = Number(event.target.value);
                    update({
                      ...selectedOverlay,
                      width,
                      height:
                        (width * selectedOverlay.height) /
                        selectedOverlay.width,
                    });
                  }}
                />
              </label>
            )}
            {selectedOverlay.kind === "image" && (
              <label>
                Saydamlık
                <input
                  aria-label="Görsel saydamlığı"
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={Math.round((selectedOverlay.opacity ?? 1) * 100)}
                  onChange={(event) =>
                    update({
                      ...selectedOverlay,
                      opacity: Number(event.target.value) / 100,
                    })
                  }
                />
              </label>
            )}
            <div
              className="layer-controls"
              role="group"
              aria-label="Katman sırası"
            >
              <button
                className="button button-light"
                disabled={
                  busy ||
                  (selectedOverlay.kind === "image" &&
                    !!selectedOverlay.native) ||
                  orderable.findIndex(
                    (item) => item.id === selectedOverlay.id,
                  ) === 0
                }
                onClick={() => order(selectedOverlay.id, -1)}
              >
                Arkaya al
              </button>
              <button
                className="button button-light"
                disabled={
                  busy ||
                  (selectedOverlay.kind === "image" &&
                    !!selectedOverlay.native) ||
                  orderable.findIndex(
                    (item) => item.id === selectedOverlay.id,
                  ) ===
                    orderable.length - 1
                }
                onClick={() => order(selectedOverlay.id, 1)}
              >
                Öne al
              </button>
            </div>
            <button
              className="button button-light"
              disabled={busy}
              onClick={() => duplicate(selectedOverlay)}
            >
              Kopyala
            </button>
            <button
              className="remove-overlay"
              disabled={busy}
              onClick={() => remove(selectedOverlay.id)}
            >
              <Trash2 size={14} />
              Eklemeyi sil
            </button>
          </div>
        )}
        <p className="tool-footnote">
          Değişiklikler “PDF indir” ile yeni dosyaya yazılır. Orijinal belgeniz
          korunur.
        </p>
      </fieldset>
    </div>
  );
  return docked ? content : createPortal(content, document.body);
}
