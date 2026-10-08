import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { downloadBlob } from "../../lib/download";
import { openPdf } from "../../lib/pdf";
import demoUrl from "../../assets/studio-notes.pdf?url";

export interface DocumentSession {
  id: number;
  pdf: PDFDocumentProxy;
  file: File;
  isDemo: boolean;
  encrypted: boolean;
}

export function useDocument() {
  const [document, setDocument] = useState<DocumentSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordPrompt, setPasswordPrompt] = useState<{
    incorrect: boolean;
    resolve: (password: string | null) => void;
  } | null>(null);
  const passwordResolve = useRef<((password: string | null) => void) | null>(
    null,
  );
  const requestPassword = useCallback(
    (incorrect: boolean) =>
      new Promise<string | null>((resolve) => {
        passwordResolve.current?.(null);
        passwordResolve.current = resolve;
        setPasswordPrompt({
          incorrect,
          resolve: (password) => {
            passwordResolve.current = null;
            setPasswordPrompt(null);
            resolve(password);
          },
        });
      }),
    [],
  );
  const requestId = useRef(0);
  const current = useRef<DocumentSession | null>(null);

  const open = useCallback(
    async (file: File, isDemo = false) => {
      const id = ++requestId.current;
      setLoading(true);
      setError("");
      try {
        const { pdf, encrypted } = await openPdf(file, requestPassword);
        if (id !== requestId.current) {
          await pdf.loadingTask.destroy();
          return;
        }
        const previous = current.current;
        const next = { id, pdf, file, isDemo, encrypted };
        current.current = next;
        setDocument(next);
        if (previous) void previous.pdf.loadingTask.destroy();
      } catch (cause) {
        if (id === requestId.current)
          setError(cause instanceof Error ? cause.message : "Dosya açılamadı.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [requestPassword],
  );

  const openDemo = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const response = await fetch(demoUrl);
      if (!response.ok)
        throw new Error(
          "Örnek belge yüklenemedi. Kendi PDF dosyanızı açabilirsiniz.",
        );
      const blob = await response.blob();
      if (id === requestId.current)
        await open(
          new File([blob], "Studio notes.pdf", { type: "application/pdf" }),
          true,
        );
    } catch (cause) {
      if (id === requestId.current)
        setError(
          cause instanceof Error ? cause.message : "Örnek belge açılamadı.",
        );
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    void openDemo();
    return () => {
      ++requestId.current;
      passwordResolve.current?.(null);
      if (current.current) void current.current.pdf.loadingTask.destroy();
    };
  }, [openDemo]);

  function downloadOriginal() {
    if (document) downloadBlob(document.file, document.file.name);
  }

  return {
    document,
    passwordPrompt,
    requestPassword,
    loading,
    error,
    open,
    openDemo,
    downloadOriginal,
    clearError: () => setError(""),
  };
}
