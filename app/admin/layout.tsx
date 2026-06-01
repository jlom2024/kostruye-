export const metadata = { title: "Admin — Kostruye+" };

// Auth is handled by middleware (middleware.ts) — no redirect needed here.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
