import { AppShell } from "../_components/app-shell";
import { CatalogManager } from "../_components/catalog-manager";

export default function CatalogoPage() {
  return (
    <AppShell current="/catalogo">
      <CatalogManager />
    </AppShell>
  );
}
