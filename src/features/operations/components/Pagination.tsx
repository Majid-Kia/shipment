import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  pageCount,
  total,
  onPageChange,
}: PaginationProps) {
  return (
    <nav
      aria-label="Shipment pagination"
      className="flex items-center justify-between gap-3"
    >
      <p className="text-xs text-muted-foreground">
        {total.toLocaleString()} results
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="min-w-24 text-center text-xs tabular-nums">
          Page {page} of {Math.max(pageCount, 1)}
        </span>
        <Button
          variant="outline"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
