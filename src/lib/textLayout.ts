// Shared wrapping rule: explicit newlines remain, long edited lines wrap at words.
export function wrapText(
  text: string,
  width: number | undefined,
  measure: (text: string) => number,
): string[] {
  if (!width || width <= 0) return text.split("\n");
  return text.split("\n").flatMap((line) => {
    const words = line.trim().split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      if (current && measure(`${current} ${word}`) > width) {
        lines.push(current);
        current = word;
      } else current = current ? `${current} ${word}` : word;
    }
    lines.push(current);
    return lines;
  });
}
