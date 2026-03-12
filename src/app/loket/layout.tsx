import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";

type LayoutProps = {
  children: React.ReactNode;
};

async function requireSession() {
  const token = (await cookies()).get("loket_session")?.value;
  if (!token) {
    redirect("/login");
  }
  try {
    const session = await verifySession(token);
    if (session.role !== "LAYANAN_PUBLIK") {
      redirect("/login");
    }
  } catch {
    redirect("/login");
  }
}

export default async function LoketLayout({ children }: LayoutProps) {
  await requireSession();
  return <>{children}</>;
}
