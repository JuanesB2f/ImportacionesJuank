import { AppShell } from "./_components/app-shell";
import { ImportConverter } from "./_components/import-converter";

export default function Home() {
  return (
    <AppShell current="/">
      <ImportConverter />
    </AppShell>
  );
}
