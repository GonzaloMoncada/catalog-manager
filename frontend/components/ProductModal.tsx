"use client";

import { useEffect } from "react";
import type { Producto } from "@/lib/types";

interface Props {
  producto: Producto | null;
  onClose: () => void;
}

export default function ProductModal({ producto, onClose }: Props) {
  useEffect(() => {
    if (!producto) return;
    document.body.style.overflow = "hidden";
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEsc);
    };
  }, [producto, onClose]);

  if (!producto) return null;

  const categoria = producto.Categorias;
  const tieneImagen = producto.imagenUrl && producto.imagenUrl.trim().length > 0;

  const allOfertas = (producto.producto_regiones ?? []).flatMap((pr) => {
    const offers = pr.oferta_producto ?? [];
    const active = offers.filter((op) => op.oferta.estado === "ACTIVA");
    if (active.length === 0) return [];
    const best = active.reduce((a, b) => (a.precio < b.precio ? a : b));
    return [{
      regionNombre: pr.region.nombre,
      precioOferta: best.precio,
      precioNormal: pr.precio,
      ofertaNombre: best.oferta.nombre,
      fechaInicio: best.oferta.fecha_inicio,
      fechaFin: best.oferta.fecha_fin,
      descripcion: best.oferta.descripcion,
    }];
  });

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(n);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-gris-texto/60 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-3xl shadow-intensa max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-up border border-verde/10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow-media hover:shadow-intensa hover:scale-110 transition-all duration-200 cursor-pointer border border-gris-borde/30"
        >
          <svg
            className="w-5 h-5 text-gris-texto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="aspect-[16/10] bg-verde/5 rounded-t-3xl overflow-hidden relative">
          {tieneImagen ? (
            <img
              src={producto.imagenUrl!}
              alt={producto.nombre}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                className="w-24 h-24 text-verde/15"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
        </div>

        <div className="p-6 sm:p-8">
          {categoria && (
            <span className="inline-flex px-3 py-1.5 rounded-xl bg-verde text-white text-xs font-bold font-fira mb-3 shadow-media">
              {categoria.nombre}
            </span>
          )}

          <h2 className="font-montserrat font-extrabold text-2xl text-gris-texto mb-1">
            {producto.nombre}
          </h2>
          <p className="text-sm text-azul font-fira mb-6">
            Código: {producto.codigo}
          </p>

          {allOfertas.length > 0 ? (
            <div className="mb-6">
              <h3 className="font-montserrat font-bold text-sm text-verde mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Ofertas activas
              </h3>
              <div className="space-y-3">
                {allOfertas.map((o, i) => (
                  <div
                    key={i}
                    className="bg-verde/5 border border-verde/15 rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-fira font-semibold text-sm text-verde">
                        {o.ofertaNombre}
                      </span>
                      <span className="text-xs text-gris-texto-secundario font-fira bg-white/60 px-2 py-0.5 rounded-full">
                        {o.regionNombre}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-montserrat font-extrabold text-xl text-gris-texto">
                        {formatPrice(o.precioOferta)}
                      </span>
                      <span className="text-sm text-gris-texto-secundario/60 line-through font-fira">
                        {formatPrice(o.precioNormal)}
                      </span>
                    </div>
                    <p className="text-xs text-gris-texto-secundario font-fira">
                      {formatDate(o.fechaInicio)} — {formatDate(o.fechaFin)}
                    </p>
                    {o.descripcion && (
                      <p className="text-xs text-gris-texto-secundario/80 font-fira mt-1">
                        {o.descripcion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gris-texto-secundario font-fira text-sm bg-azul/[0.02] rounded-2xl">
              Este producto no tiene ofertas activas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
