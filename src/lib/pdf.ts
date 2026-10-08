import {
  GlobalWorkerOptions,
  getDocument,
  PasswordResponses,
} from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { validatePdf } from "../features/document/filePolicy";

GlobalWorkerOptions.workerSrc = workerUrl;

export type RequestPassword = (incorrect: boolean) => Promise<string | null>;

export async function openPdf(file: File, requestPassword?: RequestPassword) {
  validatePdf(
    file.size,
    new Uint8Array(await file.slice(0, 1024).arrayBuffer()),
  );
  const data = new Uint8Array(await file.arrayBuffer());
  const assetRoot = `${import.meta.env.BASE_URL}pdf-assets/`;
  const task = getDocument({
    data,
    cMapUrl: `${assetRoot}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${assetRoot}standard_fonts/`,
    wasmUrl: `${assetRoot}wasm/`,
  });
  let encrypted = false;
  let cancelled = false;
  task.onPassword = async (
    updatePassword: (password: string) => void,
    reason: number,
  ) => {
    encrypted = true;
    if (!requestPassword) {
      void task.destroy();
      return;
    }
    const password = await requestPassword(
      reason === PasswordResponses.INCORRECT_PASSWORD,
    );
    if (password === null) {
      cancelled = true;
      void task.destroy();
    } else updatePassword(password);
  };
  try {
    const pdf = await task.promise;
    return {
      pdf,
      encrypted: encrypted || (await pdf.getPermissions()) !== null,
    };
  } catch {
    await task.destroy();
    if (cancelled)
      throw new Error("Şifre girişi iptal edildi. Açık belgeniz korundu.");
    if (encrypted) {
      throw new Error(
        "Bu işlem şifreli PDF dosyalarını desteklemiyor. Şifresiz bir kopya kullanın.",
      );
    }
    throw new Error(
      "PDF açılamadı. Dosya bozuk veya desteklenmeyen bir biçimde olabilir.",
    );
  }
}
