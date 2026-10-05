import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { ManagePanel } from "@/components/ManagePanel";

export const metadata: Metadata = {
  title: "Manage your spot",
  robots: { index: false, follow: false },
};

export default async function ManagePage({ params }: PageProps<"/manage/[token]">) {
  const { token } = await params;
  return (
    <>
      <Nav />
      <main className="flex-1">
        <ManagePanel token={token} />
      </main>
    </>
  );
}
