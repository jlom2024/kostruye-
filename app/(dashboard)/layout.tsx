import { AiChat } from "@/components/ai/ai-chat";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <AiChat />
    </>
  );
}
