import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type CardListSkeletonProps = {
  count?: number;
  className?: string;
};

/** Placeholder cards shown while a list loads. */
export function CardListSkeleton({ count = 3, className }: CardListSkeletonProps) {
  return (
    <div className={cn("grid gap-3", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="grid gap-3 rounded-xl border p-4">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      ))}
    </div>
  );
}
