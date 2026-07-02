"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { Categoria } from "@/lib/types";

interface Props {
  search: string;
  categoriaId: string;
  sortBy: string;
  sortDir: string;
  onSearchChange: (v: string) => void;
  onCategoriaChange: (v: string) => void;
  onSortChange: (by: string, dir: string) => void;
}

export default function SearchFilters({
  search,
  categoriaId,
  sortBy,
  sortDir,
  onSearchChange,
  onCategoriaChange,
  onSortChange,
}: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    apiGet("category?pagina=1&limite=500")
      .then((data) => {
        const list: Categoria[] = Array.isArray(data)
          ? data
          : data.datos ?? data.data ?? [];
        setCategorias(list);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      <div className="relative flex-1">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-verde/50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 text-sm rounded-2xl border border-verde/15 bg-white font-fira text-gris-texto placeholder:text-gris-texto-secundario/50 focus:outline-none focus:ring-2 focus:ring-verde/25 focus:border-verde/50 transition-all duration-200"
        />
      </div>

      <select
        value={categoriaId}
        onChange={(e) => onCategoriaChange(e.target.value)}
        className="px-4 py-2.5 text-sm rounded-2xl border border-verde/15 bg-white font-fira text-gris-texto focus:outline-none focus:ring-2 focus:ring-verde/25 focus:border-verde/50 transition-all duration-200 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22none%22%20stroke%3D%22%2316B24D%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-10"
      >
        <option value="">Todas las categorías</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>

      <select
        value={`${sortBy}-${sortDir}`}
        onChange={(e) => {
          const [by, dir] = e.target.value.split("-");
          onSortChange(by, dir);
        }}
        className="px-4 py-2.5 text-sm rounded-2xl border border-azul/15 bg-white font-fira text-gris-texto focus:outline-none focus:ring-2 focus:ring-azul/25 focus:border-azul/50 transition-all duration-200 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22none%22%20stroke%3D%22%23386FD5%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-10"
      >
        <option value="producto-asc">Nombre A–Z</option>
        <option value="producto-desc">Nombre Z–A</option>
      </select>
    </div>
  );
}
