export function extractJSON<T>(raw: string, fallback: T): T {
  const fenced = raw.match(/```json\s*([\s\S]+?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1]) as T; } catch { /* fall through */ }
  }
  const inline = raw.match(/(\{[\s\S]+\})/);
  if (inline) {
    try { return JSON.parse(inline[1]) as T; } catch { /* fall through */ }
  }
  return fallback;
}
