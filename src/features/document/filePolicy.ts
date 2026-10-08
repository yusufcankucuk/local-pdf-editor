export const MAX_FILE_BYTES = 100 * 1024 * 1024;

export function validatePdf(size: number, header: Uint8Array): void {
  if (size === 0) throw new Error("Bu dosya boş. Başka bir PDF seçin.");
  if (size > MAX_FILE_BYTES)
    throw new Error(
      "Bu sürüm en fazla 100 MB boyutundaki PDF dosyalarını açabilir.",
    );
  // PDF headers may occur within the first 1024 bytes, per the reader specification.
  const signature = new TextDecoder("latin1").decode(header);
  if (!signature.includes("%PDF-"))
    throw new Error("Bu dosya bir PDF değil. .pdf uzantılı bir belge seçin.");
}

export function nextRotation(current: number): number {
  return (current + 90) % 360;
}
