import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { AdminStatsPanel } from "@/components/AdminStatsPanel";

export const metadata: Metadata = {
  title: "Admin stats",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <AdminStatsPanel />
      </main>
    </>
  );
}
