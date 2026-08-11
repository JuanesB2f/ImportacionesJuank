import { AppNav } from "./_components/app-nav";
import { ImportConverter } from "./_components/import-converter";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#ecfdf5_0%,#fafafa_45%,#f4f4f5_100%)]">
      <AppNav current="/" />
      <ImportConverter />
    </main>
  );
}
