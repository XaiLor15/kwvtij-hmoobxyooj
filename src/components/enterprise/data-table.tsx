import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";
import { LoadingState } from "./loading-state";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Enables sorting by this column. */
  sortValue?: (row: T) => string | number;
  className?: string;
  align?: "left" | "right" | "center";
  /** Hide below the `lg` breakpoint (desktop table only). */
  hideBelowLg?: boolean;
}

/**
 * DataTable — sortable, paginated table. On phones it renders `mobileCard`
 * for each row (when given) instead of a horizontally scrolling table.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  loading = false,
  pageSize = 15,
  emptyTitle = "ບໍ່ມີຂໍ້ມູນ",
  emptyDescription,
  emptyIcon,
  emptyAction,
  mobileCard,
  initialSort,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;
  mobileCard?: (row: T) => ReactNode;
  initialSort?: { key: string; dir: "asc" | "desc" };
  className?: string;
}) {
  const [sortKey, setSortKey] = useState<string | null>(initialSort?.key ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialSort?.dir ?? "asc");
  const [page, setPage] = useState(0);

  // Back to page 1 whenever the filtered row set changes size.
  useEffect(() => setPage(0), [rows.length]);

  const sorted = useMemo(() => {
    const col = sortKey ? columns.find((c) => c.key === sortKey) : null;
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    return [...rows].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(current * pageSize, current * pageSize + pageSize);

  if (loading) return <LoadingState variant="table" className={cn("p-4", className)} />;
  if (rows.length === 0)
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={cn("m-4", className)}
      />
    );

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const align = (c: Column<T>) =>
    cn(c.align === "right" && "text-right", c.align === "center" && "text-center");

  return (
    <div className={className}>
      {mobileCard && (
        <ul className="divide-y divide-border md:hidden">
          {pageRows.map((row) => (
            <li key={getRowKey(row)}>
              {onRowClick ? (
                <button
                  type="button"
                  onClick={() => onRowClick(row)}
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  {mobileCard(row)}
                </button>
              ) : (
                <div className="px-4 py-3">{mobileCard(row)}</div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className={cn("overflow-x-auto", mobileCard && "hidden md:block")}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "h-10 whitespace-nowrap text-xs font-semibold",
                    align(col),
                    col.hideBelowLg && "hidden lg:table-cell",
                    col.className,
                  )}
                  aria-sort={
                    sortKey === col.key
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                    >
                      {col.header}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row) => (
              <TableRow
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && "cursor-pointer")}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn(
                      "py-2.5",
                      align(col),
                      col.hideBelowLg && "hidden lg:table-cell",
                      col.className,
                    )}
                  >
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {current * pageSize + 1}–{Math.min((current + 1) * pageSize, sorted.length)} ຈາກ{" "}
            {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
              aria-label="ໜ້າກ່ອນ"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 tabular-nums">
              {current + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
              aria-label="ໜ້າຖັດໄປ"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
