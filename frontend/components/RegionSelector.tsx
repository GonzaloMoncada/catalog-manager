"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import type { Region } from "@/lib/types";

interface Props {
  selected: number | null;
  onSelect: (regionId: number | null) => void;
  variant?: "light" | "dark";
}

export default function RegionSelector({ selected, onSelect, variant = "light" }: Props) {
  const [regiones, setRegiones] = useState<Region[]>([]);

  useEffect(() => {
    apiGet("region?limite=100")
      .then((data) => {
        const list: Region[] = Array.isArray(data)
          ? data
          : data.datos ?? data.data ?? [];
        setRegiones(list);
      })
      .catch(() => {});
  }, []);

  const sorted = useMemo(() => {
    return [...regiones].sort((a, b) => a.id - b.id);
  }, [regiones]);

  const isDark = variant === "dark";
  const noneSelected = selected === null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {sorted.map((r) => {
        const isActive = selected === r.id;
        return (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={`shrink-0 px-8 py-4 rounded-2xl text-base font-bold transition-all duration-300 cursor-pointer font-fira ${
              isActive ? "scale-105" : noneSelected ? "animate-pulse-cta" : "hover:scale-105"
            } ${
              isDark
                ? isActive
                  ? "bg-white text-verde shadow-2xl shadow-white/20"
                  : "bg-white/10 text-white border-2 border-white/40 hover:bg-white/20 hover:border-white/70 hover:shadow-lg hover:shadow-white/10"
                : isActive
                  ? "bg-verde text-white shadow-2xl shadow-verde/25"
                  : "bg-gris-superficie text-gris-texto-secundario border-2 border-gris-borde hover:bg-verde/10 hover:text-verde hover:border-verde/40 hover:shadow-lg hover:shadow-verde/10"
            }`}
          >
            {r.numero_romano && (
              <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-0.5">
                Región {r.numero_romano}
              </span>
            )}
            {r.nombre}
          </button>
        );
      })}
    </div>
  );
}
