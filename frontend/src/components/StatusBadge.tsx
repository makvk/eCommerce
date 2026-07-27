import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_CLASS, STATUS_LABEL, normalizeStatus } from "@/lib/format";
import type { RawStatus } from "@/api/types";

export function StatusBadge({
  status,
  className,
}: {
  status: RawStatus;
  className?: string;
}) {
  const normalized = normalizeStatus(status);
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", STATUS_CLASS[normalized], className)}
    >
      {STATUS_LABEL[normalized]}
    </Badge>
  );
}
