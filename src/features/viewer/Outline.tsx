import { useEffect, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { EditorPage } from "../editor/model";
import { Bookmark } from "lucide-react";

type OutlineNode = {
  title: string;
  dest: string | unknown[] | null;
  items: OutlineNode[];
};
export function Outline({
  pdf,
  pages,
  select,
}: {
  pdf: PDFDocumentProxy;
  pages: EditorPage[];
  select: (page: number) => void;
}) {
  const [items, setItems] = useState<
    { title: string; depth: number; sourcePage: number | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const list: typeof items = [];
        async function walk(nodes: OutlineNode[], depth: number) {
          for (const node of nodes) {
            if (cancelled) return;
            let sourcePage: number | null = null;
            try {
              const destination =
                typeof node.dest === "string"
                  ? await pdf.getDestination(node.dest)
                  : node.dest;
              const target = destination?.[0];
              if (typeof target === "number") sourcePage = target + 1;
              else if (
                target &&
                typeof target === "object" &&
                "num" in target &&
                "gen" in target &&
                typeof target.num === "number" &&
                typeof target.gen === "number"
              )
                sourcePage =
                  (await pdf.getPageIndex({
                    num: target.num,
                    gen: target.gen,
                  })) + 1;
            } catch {
              /* A broken destination does not hide the rest of the outline. */
            }
            list.push({ title: node.title, depth, sourcePage });
            if (depth < 20) await walk(node.items, depth + 1);
          }
        }
        await walk((await pdf.getOutline()) ?? [], 0);
        if (!cancelled) setItems(list);
      } catch {
        if (!cancelled) setError("İçindekiler okunamadı.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [pdf]);
  return (
    <div className="outline-list">
      {loading ? (
        <p>İçindekiler yükleniyor…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : items.length ? (
        items.map((item, index) => {
          const page = pages.findIndex(
            (page) =>
              page.sourceId === "original" &&
              page.sourcePage === item.sourcePage,
          );
          return (
            <button
              key={index}
              disabled={page < 0}
              style={{ paddingLeft: 12 + item.depth * 10 }}
              onClick={() => select(page + 1)}
              title={
                page < 0
                  ? "Bu başlık için kullanılabilir sayfa hedefi yok"
                  : item.title
              }
            >
              <Bookmark size={12} />
              <span>{item.title}</span>
              {page >= 0 && <small>{page + 1}</small>}
            </button>
          );
        })
      ) : (
        <p>Bu belgede içindekiler veya yer imi yok.</p>
      )}
    </div>
  );
}
