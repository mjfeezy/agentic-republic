// Utility for walking nested JSON looking for strings. Each scanner
// receives every string in the packet (title, summary, body fields, code
// blocks). Keeping the traversal in one place makes it easy to add
// attachment or link scanning later without changing each scanner.

export type StringVisitor = (text: string, path: string) => void;

export function walkStrings(
  value: unknown,
  visit: StringVisitor,
  path = "",
): void {
  if (value == null) return;
  if (typeof value === "string") {
    visit(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => walkStrings(v, visit, `${path}[${i}]`));
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walkStrings(v, visit, path ? `${path}.${k}` : k);
    }
  }
}

export function collectStrings(value: unknown): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  walkStrings(value, (text, path) => out.push({ path, text }));
  return out;
}
