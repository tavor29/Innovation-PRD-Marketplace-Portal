import { requireUser } from "@/lib/auth/guard";
import { Nav } from "@/components/common/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <Nav user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
