import { AiChat } from "@/components/ai/ai-chat";
import { QueryProvider } from "@/components/providers/query-provider";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      {children}
      <AiChat />
    </QueryProvider>
  );
}
