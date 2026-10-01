import { requireUser } from "@/lib/auth/guard";
import { Nav } from "@/components/common/nav";

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["manager", "admin", "dev"]);
  return (
    <>
      <Nav user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
