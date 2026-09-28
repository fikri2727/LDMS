/** True for Prisma's "foreign key constraint violated" error (code P2003). */
export function isForeignKeyError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: unknown }).code === "P2003";
}
