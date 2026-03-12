import AdminNav from "./AdminNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_60%),linear-gradient(120deg,#fff7ed,#f8fafc)] px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <AdminNav />
        {children}
      </div>
    </div>
  );
}
