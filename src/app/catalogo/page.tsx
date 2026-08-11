import { AppNav } from "../_components/app-nav";
import { CatalogManager } from "../_components/catalog-manager";

export default function CatalogoPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#ecfdf5_0%,#fafafa_45%,#f4f4f5_100%)]">
      <AppNav current="/catalogo" />
      <CatalogManager />
    </main>
  );
}
