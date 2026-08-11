import { AppShell } from "../_components/app-shell";
import { ProductCreator } from "../_components/product-creator";

export default function NuevaPrendaPage() {
  return (
    <AppShell current="/nuevo">
      <ProductCreator />
    </AppShell>
  );
}
