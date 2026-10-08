import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { IconButton } from "../../components/IconButton";
import { findTextMatches } from "./search";

export function SearchBar({
  documents,
  onQuery,
  onPage,
  onOccurrence,
  close,
}: {
  documents: ({ pdf: PDFDocumentProxy; page: number } | null)[];
  onQuery: (query: string) => void;
  onPage: (page: number) => void;
  onOccurrence: (index: number) => void;
  close: () => void;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<
    { page: number; occurrence: number }[]
  >([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const cache = useRef(new WeakMap<PDFDocumentProxy, Map<number, string[]>>());
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    return () => onQuery("");
  }, [onQuery]);
  useEffect(() => {
    let cancelled = false;
    setError("");
    onQuery(query);
    if (!query.trim()) {
      setMatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const pages: { page: number; occurrence: number }[] = [];
        for (let page = 1; page <= documents.length; page++) {
          if (cancelled) return;
          const document = documents[page - 1];
          if (!document) continue;
          let cached = cache.current.get(document.pdf);
          if (!cached) {
            cached = new Map();
            cache.current.set(document.pdf, cached);
          }
          let runs = cached.get(document.page);
          if (!runs) {
            const content = await (
              await document.pdf.getPage(document.page)
            ).getTextContent();
            runs = content.items
              .filter((item) => "str" in item)
              .map((item) => ("str" in item ? item.str : ""));
            cached.set(document.page, runs);
          }
          const found = findTextMatches(runs, query);
          const count = new Set(found.map((match) => match.occurrence)).size;
          for (let match = 0; match < count; match++)
            pages.push({ page, occurrence: match });
        }
        if (!cancelled) {
          setMatches(pages);
          setSelected(0);
          if (pages.length) {
            onPage(pages[0].page);
            onOccurrence(0);
          }
        }
      } catch {
        if (!cancelled) setError("Belge metni aranamadı.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [documents, query, onPage, onQuery, onOccurrence]);
  function move(direction: number) {
    if (!matches.length) return;
    const next = (selected + direction + matches.length) % matches.length;
    setSelected(next);
    onPage(matches[next].page);
    onOccurrence(matches[next].occurrence);
  }
  return (
    <div className="search-bar" role="search">
      <Search size={16} />
      <input
        ref={input}
        aria-label="Belgede ara"
        placeholder="Belgede ara…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            move(event.shiftKey ? -1 : 1);
          }
          if (event.key === "Escape") close();
        }}
      />
      <span role="status">
        {error ||
          (loading
            ? "Aranıyor…"
            : query
              ? matches.length
                ? `${selected + 1} / ${matches.length}`
                : "Sonuç yok"
              : "")}
      </span>
      <IconButton
        label="Önceki arama sonucu"
        disabled={!matches.length || loading}
        onClick={() => move(-1)}
      >
        <ChevronUp size={15} />
      </IconButton>
      <IconButton
        label="Sonraki arama sonucu"
        disabled={!matches.length || loading}
        onClick={() => move(1)}
      >
        <ChevronDown size={15} />
      </IconButton>
      <IconButton label="Aramayı kapat" onClick={close}>
        <X size={16} />
      </IconButton>
    </div>
  );
}
