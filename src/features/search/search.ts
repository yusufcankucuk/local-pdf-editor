export interface TextMatch {
  run: number;
  start: number;
  end: number;
  occurrence: number;
}

export function findTextMatches(runs: string[], query: string): TextMatch[] {
  const needle = query.trim().toLocaleLowerCase("tr");
  if (!needle) return [];
  const text = runs.join(" ").toLocaleLowerCase("tr");
  const offsets: number[] = [];
  let offset = 0;
  for (const run of runs) {
    offsets.push(offset);
    offset += run.length + 1;
  }
  const matches: TextMatch[] = [];
  let occurrence = 0;
  let start = text.indexOf(needle);
  while (start !== -1) {
    const end = start + needle.length;
    for (let run = 0; run < runs.length; run++) {
      const from = Math.max(0, start - offsets[run]);
      const to = Math.min(runs[run].length, end - offsets[run]);
      if (from < to) matches.push({ run, start: from, end: to, occurrence });
    }
    occurrence++;
    start = text.indexOf(needle, end);
  }
  return matches;
}
