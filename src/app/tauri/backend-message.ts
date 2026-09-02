export function mensajeDelBackend(e: unknown): string {
  if (e instanceof Error && typeof e.cause === "string") {
    return e.cause;
  }
  return e instanceof Error ? e.message : String(e);
}
