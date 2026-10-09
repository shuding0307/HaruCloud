import type { ListCursor } from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(cursor: ListCursor): string {
  return Buffer.from(`${cursor.createdAt}|${cursor.id}`, "utf8").toString("base64url");
}

export function decodeCursor(raw: string | undefined): ListCursor | undefined | null {
  if (!raw) return undefined;
  try {
    const [createdAt, id] = Buffer.from(raw, "base64url").toString("utf8").split("|");
    if (!createdAt || !id || !UUID_RE.test(id) || Number.isNaN(Date.parse(createdAt))) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}
