import { House } from "lucide-react";
import { cn } from "@/lib/utils";

export function EstateBrand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)} aria-label="EstateOS">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-primary text-white" aria-hidden="true">
        <House className="size-5" strokeWidth={2.1} />
      </span>
      {!compact && <span className="text-[18px] font-extrabold tracking-[-0.04em]">EstateOS</span>}
    </div>
  );
}
