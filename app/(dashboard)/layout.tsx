import { AiChat } from "@/components/ai/ai-chat";

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
