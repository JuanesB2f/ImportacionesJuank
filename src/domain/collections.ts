/**
 * Colecciones que suelen alimentar el inicio / “Colección destacada”.
 * No se asignan al sincronizar salvo que el usuario las marque a propósito.
 */
const HOMEPAGE_HANDLE_RE =
  /^(frontpage|home|homepage|home-page|inicio|destacados?|featured|all|all-products|catalogo|catalogue)$/i;

const HOMEPAGE_TITLE_RE =
  /^(home\s*page|página\s*de\s*inicio|inicio|frontpage|destacados?|featured(\s*products)?|all\s*products|todos\s*los\s*productos|catálogo|catalog)$/i;

export function isHomepageCollection(input: {
  handle?: string | null;
  title?: string | null;
}): boolean {
  const handle = (input.handle ?? "").trim();
  const title = (input.title ?? "").trim();
  if (handle && HOMEPAGE_HANDLE_RE.test(handle)) return true;
  if (title && HOMEPAGE_TITLE_RE.test(title)) return true;
  return false;
}

/** Quita colecciones de inicio de una lista de IDs, salvo las que el usuario eligió. */
export function filterOutUnselectedHomepageCollections(
  collectionIds: string[],
  collections: Array<{ id: string; handle?: string; title?: string }>,
  explicitlySelectedIds: string[]
): string[] {
  const selected = new Set(explicitlySelectedIds);
  const byId = new Map(collections.map((c) => [c.id, c]));

  return collectionIds.filter((id) => {
    const col = byId.get(id);
    if (!col) return true;
    if (!isHomepageCollection(col)) return true;
    return selected.has(id);
  });
}
