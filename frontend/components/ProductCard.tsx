"use client";

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Producto } from "@/lib/types";

interface OfertaActiva {
  precioOferta: number;
  precioNormal: number;
  ofertaNombre: string;
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(n);
}

function getBestOffer(producto: Producto): OfertaActiva | null {
  let best: OfertaActiva | null = null;
  for (const pr of producto.producto_regiones ?? []) {
    const offers = pr.oferta_producto ?? [];
    const active = offers.filter((o) => o.oferta.estado === "ACTIVA");
    if (active.length === 0) continue;
    const candidate = active.reduce((a, b) => (a.precio < b.precio ? a : b));
    const entry = {
      precioOferta: candidate.precio,
      precioNormal: pr.precio,
      ofertaNombre: candidate.oferta.nombre,
    };
    if (!best || entry.precioOferta < best.precioOferta) {
      best = entry;
    }
  }
  return best;
}

function getBestPrice(producto: Producto): number | null {
  const habilitadas = (producto.producto_regiones ?? []).filter(
    (pr) => pr.estado === "HABILITADO"
  );
  if (habilitadas.length === 0) return null;
  return Math.min(...habilitadas.map((pr) => pr.precio));
}

interface Props {
  producto: Producto;
  index: number;
  onClick: (producto: Producto) => void;
}

export default function ProductCard({ producto, index, onClick }: Props) {
  const bestOffer = getBestOffer(producto);
  const precio = getBestPrice(producto);
  const categoria = producto.Categorias;
  const tieneImagen = producto.imagenUrl && producto.imagenUrl.trim().length > 0;

  const [tooltip, setTooltip] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleMouseEnter() {
    if (!tieneImagen || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const tooltipW = 220;
    const gap = 12;
    const spaceRight = window.innerWidth - rect.right - gap;

    setTooltip(
      spaceRight >= tooltipW
        ? { top: rect.top, left: rect.right + gap }
        : { top: rect.top, right: window.innerWidth - rect.left + gap }
    );
  }

  function handleMouseLeave() {
    setTooltip(null);
  }

  const handleCopyCode = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(producto.codigo).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [producto.codigo]);

  return (
    <tr
      className="group hover:bg-verde/[0.03] transition-colors duration-150 border-b border-gris-borde/30 animate-fade-in-up"
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      <td
        onClick={handleCopyCode}
        className="px-4 py-3.5 text-sm text-azul font-fira font-semibold whitespace-nowrap cursor-pointer select-all hover:text-verde transition-colors duration-150 relative"
        title="Click para copiar"
      >
        <span className="inline-flex items-center gap-1.5">
          #{producto.codigo}
          {copied ? (
            <svg className="w-3.5 h-3.5 text-verde animate-fade-in-up" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3 h-3 text-gris-texto-secundario/30 opacity-0 group-hover:opacity-100 transition-opacity duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </span>
      </td>

      <td className="px-4 py-3.5">
        <p className="font-montserrat font-semibold text-gris-texto text-sm leading-tight">
          {producto.nombre}
        </p>
      </td>

      <td className="px-4 py-3.5 whitespace-nowrap">
        {categoria ? (
          <span className="inline-flex px-2.5 py-1 rounded-xl bg-azul/10 text-azul text-xs font-semibold font-fira">
            {categoria.nombre}
          </span>
        ) : (
          <span className="text-xs text-gris-texto-secundario/40 font-fira">&mdash;</span>
        )}
      </td>

      <td className="px-4 py-3.5 whitespace-nowrap">
        {bestOffer ? (() => {
          const pct = Math.round((1 - bestOffer.precioOferta / bestOffer.precioNormal) * 100);
          return (
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-xs text-gris-texto-secundario/50 line-through font-fira">
                  {formatPrice(bestOffer.precioNormal)}
                </span>
                <span className="font-montserrat font-extrabold text-sm text-verde">
                  {formatPrice(bestOffer.precioOferta)}
                </span>
              </div>
              <span className="shrink-0 inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-verde/10 text-verde text-xs font-extrabold font-montserrat">
                -{pct}%
              </span>
            </div>
          );
        })() : precio !== null ? (
          <span className="font-montserrat font-extrabold text-sm text-gris-texto">
            {formatPrice(precio)}
          </span>
        ) : (
          <span className="text-xs text-gris-texto-secundario/50 font-fira italic">
            Sin precio
          </span>
        )}
      </td>

      <td className="px-4 py-3.5 whitespace-nowrap">
        {bestOffer && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-verde/10 text-verde text-xs font-bold font-fira">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Oferta
          </span>
        )}
      </td>

      <td className="px-4 py-3.5 text-center">
        <div className="inline-flex items-center gap-1.5">
          <button
            ref={btnRef}
            onClick={(e) => {
              e.stopPropagation();
              if (!tieneImagen) return;
              if (tooltip) { handleMouseLeave(); return; }
              handleMouseEnter();
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            title={tieneImagen ? "Ver imagen" : "Sin imagen"}
            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 border ${
              tieneImagen
                ? "border-gris-borde/50 text-gris-texto-secundario hover:bg-gris-superficie hover:border-gris-borde hover:text-gris-texto cursor-pointer"
                : "border-gris-borde/20 text-gris-texto-secundario/20 cursor-default"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(producto);
            }}
            title="Ver detalle"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gris-borde/50 text-gris-texto-secundario hover:bg-gris-superficie hover:border-gris-borde hover:text-gris-texto transition-all duration-150 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {tooltip && tieneImagen &&
          createPortal(
            <div
              onMouseEnter={() => {}}
              onMouseLeave={handleMouseLeave}
              className="fixed z-[100] rounded-sm shadow-intensa border border-gris-borde/25 bg-white overflow-hidden animate-fade-in-up"
              style={{
                top: tooltip.top,
                left: tooltip.left,
                right: tooltip.right,
                width: 220,
              }}
            >
              <img
                src={producto.imagenUrl!}
                alt={producto.nombre}
                className="w-full h-auto max-h-48 object-cover"
              />
              <div className="px-3 py-2">
                <p className="text-sm text-gris-texto font-montserrat font-semibold truncate">
                  {producto.nombre}
                </p>
                <p className="text-xs text-gris-texto-secundario/60 font-fira mt-0.5">
                  #{producto.codigo}
                </p>
              </div>
            </div>,
            document.body
          )}
      </td>
    </tr>
  );
}
