import { requireUser } from "@/lib/auth/guard";
import { Nav } from "@/components/common/nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["admin"]);
  return (
    <>
      <Nav user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
