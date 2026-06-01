import { cn } from "@/lib/utils";

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function Topbar({ title, subtitle, actions, className }: TopbarProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4",
        className
      )}
    >
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
