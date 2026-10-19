import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="workspace-loading" role="status" aria-label="Завантажуємо школу">
      <Skeleton className="skeleton-nav" />
      <Skeleton className="skeleton-scene" />
      <Skeleton className="skeleton-question" />
    </div>
  );
}
