"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { buildSearchHref } from "@/lib/search";

type SearchPaginationProps = {
  q: string;
  tags: string[];
  page: number;
  totalPages: number;
};

function pageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) {
    pages.push("ellipsis");
  }

  for (let p = start; p <= end; p++) {
    pages.push(p);
  }

  if (end < total - 1) {
    pages.push("ellipsis");
  }

  pages.push(total);
  return pages;
}

export function SearchPagination({ q, tags, page, totalPages }: SearchPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = pageNumbers(page, totalPages);

  return (
    <Pagination className="mt-6">
      <PaginationContent>
        {page > 1 ? (
          <PaginationItem>
            <PaginationPrevious href={buildSearchHref({ q, tags, page: page - 1 })} />
          </PaginationItem>
        ) : null}
        {pages.map((p, index) =>
          p === "ellipsis" ? (
            <PaginationItem key={`ellipsis-before-${pages[index + 1]}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink href={buildSearchHref({ q, tags, page: p })} isActive={p === page}>
                {p}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        {page < totalPages ? (
          <PaginationItem>
            <PaginationNext href={buildSearchHref({ q, tags, page: page + 1 })} />
          </PaginationItem>
        ) : null}
      </PaginationContent>
    </Pagination>
  );
}
