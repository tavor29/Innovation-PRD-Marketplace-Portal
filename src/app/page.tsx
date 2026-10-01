import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { homeFor } from "@/lib/auth/roles";

export default async function Home() {
  const session = await auth();
  redirect(session?.user?.role ? homeFor[session.user.role] : "/login");
}
