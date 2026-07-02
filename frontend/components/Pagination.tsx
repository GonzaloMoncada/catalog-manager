"use client";

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <nav className="flex items-center justify-center gap-1.5 pt-8 font-fira">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm text-gris-texto-secundario hover:bg-azul/10 hover:text-azul transition-all duration-200 disabled:opacity-30 disabled:cursor-default cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`dots-${i}`}
            className="w-10 h-10 flex items-center justify-center text-sm text-gris-texto-secundario/50"
          >
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-semibold transition-all duration-200 cursor-pointer ${
              p === page
                ? "bg-verde text-white shadow-media hover:bg-verde-oscuro"
                : "text-gris-texto-secundario hover:bg-azul/10 hover:text-azul"
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm text-gris-texto-secundario hover:bg-azul/10 hover:text-azul transition-all duration-200 disabled:opacity-30 disabled:cursor-default cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  );
}
