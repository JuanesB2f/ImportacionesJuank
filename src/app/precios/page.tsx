import { AppShell } from "../_components/app-shell";
import { PricingSetup } from "../_components/pricing-setup";

export default function PreciosPage() {
  return (
    <AppShell current="/precios">
      <PricingSetup />
    </AppShell>
  );
}
