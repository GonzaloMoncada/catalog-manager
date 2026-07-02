"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/api";
import type { Producto, ProductoRegion } from "@/lib/types";
import RegionSelector from "./RegionSelector";
import SearchFilters from "./SearchFilters";
import ProductCard from "./ProductCard";
import ProductModal from "./ProductModal";
import Pagination from "./Pagination";

const LIMITE = 50;
const FETCH_LIMIT = LIMITE * 2;

function trimCache<T>(cache: Record<number, T>, around: number): Record<number, T> {
  const keep = [around - 1, around, around + 1];
  const trimmed: Record<number, T> = {};
  for (const key of keep) {
    if (cache[key]) trimmed[key] = cache[key];
  }
  return trimmed;
}

export default function CatalogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const regionId = searchParams.get("region") ? Number(searchParams.get("region")) : null;
  const search = searchParams.get("buscar") ?? "";
  const categoriaId = searchParams.get("categoria") ?? "";
  const sortBy = searchParams.get("orden")?.split("-")[0] ?? "producto";
  const sortDir = searchParams.get("orden")?.split("-")[1] ?? "asc";
  const page = Number(searchParams.get("pagina") ?? "1");
  const soloOfertas = searchParams.get("ofertas") === "1";

  const [productos, setProductos] = useState<Producto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalProducto, setModalProducto] = useState<Producto | null>(null);
  const productsRef = useRef<HTMLDivElement>(null);

  const cacheApiPageRef = useRef(0);
  const productosCacheRef = useRef<Record<number, Producto[]>>({});

  const totalPages = Math.max(1, Math.ceil(total / LIMITE));

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || (value === "1" && key === "pagina")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  }

  function handleRegionSelect(id: number | null) {
    updateParams({ region: id ? String(id) : null, pagina: null });
  }
  function handleSearchChange(v: string) {
    cacheApiPageRef.current = 0;
    productosCacheRef.current = {};
    updateParams({ buscar: v || null, pagina: null });
  }
  function handleCategoriaChange(v: string) {
    cacheApiPageRef.current = 0;
    productosCacheRef.current = {};
    updateParams({ categoria: v || null, pagina: null });
  }
  function handleSortChange(by: string, dir: string) {
    cacheApiPageRef.current = 0;
    productosCacheRef.current = {};
    updateParams({ orden: `${by}-${dir}`, pagina: null });
  }
  function handlePageChange(p: number) {
    updateParams({ pagina: String(p) });
    productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function handleToggleOfertas() {
    cacheApiPageRef.current = 0;
    productosCacheRef.current = {};
    updateParams({ ofertas: soloOfertas ? null : "1", pagina: null });
  }

  function normalizarRegionAResponse(item: ProductoRegion): Producto {
    return {
      id: item.producto_id,
      codigo: item.codigo,
      nombre: item.producto?.nombre ?? item.codigo,
      estado: item.estado,
      imagenUrl: item.producto?.imagenUrl ?? null,
      categoria_id: item.producto?.categoria_id ?? null,
      Categorias: item.producto?.Categorias ?? null,
      producto_regiones: [item],
    };
  }

  const loadProductos = useCallback(async () => {
    if (!regionId) {
      setLoading(false);
      setProductos([]);
      setTotal(0);
      return;
    }

    const apiPage = Math.floor((page - 1) / 2) + 1;

    if (apiPage === cacheApiPageRef.current) {
      setLoading(false);
      return;
    }

    const cached = productosCacheRef.current[apiPage];
    if (cached) {
      setProductos(cached);
      cacheApiPageRef.current = apiPage;
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      q.set("pagina", String(apiPage));
      q.set("limite", String(FETCH_LIMIT));
      q.set("region_id", String(regionId));
      q.set("estado", "HABILITADO");
      if (search) q.set("buscar", search);
      if (categoriaId) q.set("categoria_id", categoriaId);
      if (soloOfertas) q.set("solo_ofertas", "true");
      q.set("orderBy", sortBy);
      q.set("orderDir", sortDir);

      const data = await apiGet("product/regiones?" + q.toString());
      const list: ProductoRegion[] = Array.isArray(data)
        ? data
        : data.datos ?? data.data ?? [];
      const mapped = list.map(normalizarRegionAResponse);
      setProductos(mapped);
      setTotal(data.total ?? mapped.length);
      cacheApiPageRef.current = apiPage;
      const updated = trimCache({ ...productosCacheRef.current, [apiPage]: mapped }, apiPage);
      productosCacheRef.current = updated;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setProductos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, regionId, soloOfertas, categoriaId, sortBy, sortDir]);

  useEffect(() => {
    loadProductos();
  }, [loadProductos]);

  const displayedProductos = (() => {
    const apiPage = Math.floor((page - 1) / 2) + 1;
    const batch = productosCacheRef.current[apiPage] ?? productos;
    return batch.slice(((page - 1) % 2) * LIMITE, ((page - 1) % 2 + 1) * LIMITE);
  })();

  useEffect(() => {
    const isSecondHalf = (page - 1) % 2 === 1;
    if (!isSecondHalf) return;
    const nextApiPage = Math.floor((page - 1) / 2) + 2;
    if (nextApiPage === cacheApiPageRef.current) return;
    if (page + 1 > totalPages) return;

    const q = new URLSearchParams();
    q.set("pagina", String(nextApiPage));
    q.set("limite", String(FETCH_LIMIT));
    q.set("region_id", String(regionId!));
    q.set("estado", "HABILITADO");
    if (search) q.set("buscar", search);
    if (categoriaId) q.set("categoria_id", categoriaId);
    if (soloOfertas) q.set("solo_ofertas", "true");
    q.set("orderBy", sortBy);
    q.set("orderDir", sortDir);

    apiGet("product/regiones?" + q.toString())
      .then((data) => {
        const list: ProductoRegion[] = Array.isArray(data)
          ? data
          : data.datos ?? data.data ?? [];
        const mapped = list.map(normalizarRegionAResponse);
        const currentApiPage = Math.floor((page - 1) / 2) + 1;
        const updated = trimCache(
          { ...productosCacheRef.current, [nextApiPage]: mapped },
          currentApiPage,
        );
        productosCacheRef.current = updated;
      })
      .catch(() => {});
  }, [page, totalPages, search, categoriaId, soloOfertas, regionId, sortBy, sortDir]);

  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-verde/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-verde flex items-center justify-center">
              <Image
                src="/logoSolo.png"
                alt="Comercial Brich"
                width={28}
                height={28}
                className="rounded-lg"
              />
            </div>
            <span className="font-montserrat font-bold text-lg text-verde tracking-tight">
              Comercial Brich
            </span>
          </div>
          <a
            href="https://www.comercialbrich.cl/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gris-texto-secundario hover:text-azul transition-colors duration-200 font-fira font-semibold"
          >
            Acerca de
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-verde to-verde-oscuro">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 blur-3xl animate-blob pointer-events-none hidden lg:block"
          style={{ transform: "translate(30%, -25%)" }}
        />
        <div
          className="absolute top-[60%] left-[70%] w-[350px] h-[350px] bg-azul/10 blur-3xl animate-blob pointer-events-none hidden lg:block"
          style={{ transform: "translate(-50%, -50%)", animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-verde/30 blur-3xl animate-blob pointer-events-none hidden lg:block"
          style={{ transform: "translate(-20%, 20%)", animationDelay: "4s" }}
        />
        <div className="absolute top-16 right-[12%] w-40 h-40 rounded-full border-2 border-white/20 pointer-events-none hidden lg:block animate-float" />
        <div className="absolute bottom-20 left-[8%] w-56 h-56 rounded-full border-2 border-white/20 pointer-events-none hidden lg:block animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none hidden lg:block"
          style={{
            backgroundImage: "radial-gradient(circle, #FFF 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-[670px] mx-auto text-center">
            <h1 className="font-montserrat font-extrabold text-4xl sm:text-5xl text-white tracking-tight">
              Catálogo de Productos
            </h1>
            <p className="text-lg text-white/70 font-fira leading-relaxed mt-4">
              Selecciona tu región para ver los productos disponibles en tu zona
            </p>
          </div>
          <div className="mt-12 flex justify-center">
            <RegionSelector
              selected={regionId}
              onSelect={handleRegionSelect}
              variant="dark"
            />
          </div>
        </div>
      </section>

      <section ref={productsRef} className="relative overflow-hidden bg-verde/[0.04]">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-azul/5 blur-3xl pointer-events-none hidden lg:block" style={{ transform: "translate(40%, -40%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-verde/10 text-verde text-xs font-semibold font-fira mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-verde" />
                Catálogo
              </span>
              <h2 className="font-montserrat font-extrabold text-2xl text-gris-texto">
                Productos disponibles
              </h2>
              <p className="text-sm text-azul font-fira font-semibold mt-1 min-h-[20px]">
                {!loading && total > 0
                  ? `${total} producto${total !== 1 ? "s" : ""} encontrado${total !== 1 ? "s" : ""}`
                  : "\u00A0"}
              </p>
            </div>
            {regionId && (
              <button
                onClick={handleToggleOfertas}
                className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold font-fira transition-all duration-200 cursor-pointer border-2 ${
                  soloOfertas
                    ? "bg-verde text-white border-verde shadow-media"
                    : "bg-white text-verde border-verde/30 hover:bg-verde/5 hover:border-verde/50"
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                {soloOfertas ? "Ofertas activas" : "Solo ofertas"}
              </button>
            )}
          </div>
          <SearchFilters
            search={search}
            categoriaId={categoriaId}
            sortBy={sortBy}
            sortDir={sortDir}
            onSearchChange={handleSearchChange}
            onCategoriaChange={handleCategoriaChange}
            onSortChange={handleSortChange}
          />
        </div>
      </section>

      <section className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          {!regionId ? (
            <div className="text-center py-20">
              <div className="inline-flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full bg-verde/10 flex items-center justify-center animate-float">
                    <svg className="w-14 h-14 text-verde" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-verde flex items-center justify-center shadow-marcada animate-bounce">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="font-montserrat font-extrabold text-2xl text-gris-texto">
                    Elige tu región
                  </p>
                  <p className="font-fira text-gris-texto-secundario text-base mt-1">
                    Toca uno de los botones de arriba para empezar
                  </p>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-24">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
                <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="font-montserrat font-bold text-lg text-gris-texto">
                Error al cargar productos
              </p>
              <p className="font-fira text-gris-texto-secundario text-sm mt-1">
                {error}
              </p>
            </div>
          ) : loading ? (
            <div className="rounded-2xl border border-gris-borde/40 overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gris-borde/40 bg-gris-superficie">
                      {["Código", "Nombre", "Categoría", "Precio", "Oferta", ""].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold font-fira text-gris-texto-secundario uppercase tracking-wider">
                          {h || <span className="sr-only">Acciones</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-gris-borde/20 animate-pulse">
                        <td className="px-4 py-3.5"><div className="h-4 w-16 bg-gris-borde/20 rounded" /></td>
                        <td className="px-4 py-3.5"><div className="h-4 w-48 bg-gris-borde/20 rounded" /></td>
                        <td className="px-4 py-3.5"><div className="h-4 w-20 bg-gris-borde/20 rounded" /></td>
                        <td className="px-4 py-3.5"><div className="h-4 w-24 bg-gris-borde/20 rounded" /></td>
                        <td className="px-4 py-3.5"><div className="h-4 w-14 bg-gris-borde/20 rounded" /></td>
                        <td className="px-4 py-3.5"><div className="h-8 w-20 bg-gris-borde/20 rounded-full" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : displayedProductos.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-azul/10 flex items-center justify-center">
                <svg className="w-12 h-12 text-azul/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="font-montserrat font-bold text-lg text-gris-texto">
                No se encontraron productos
              </p>
              <p className="font-fira text-gris-texto-secundario text-sm mt-1">
                {soloOfertas ? "No hay ofertas activas en esta región" : "Intenta con otros filtros o términos de búsqueda"}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-gris-borde/40 overflow-hidden bg-white shadow-sutil">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gris-borde/40 bg-gris-superficie">
                        {["Código", "Nombre", "Categoría", "Precio", "Oferta", ""].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-bold font-fira text-gris-texto-secundario uppercase tracking-wider">
                            {h || <span className="sr-only">Acciones</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayedProductos.map((p, i) => (
                        <ProductCard
                          key={p.id}
                          producto={p}
                          index={i}
                          onClick={setModalProducto}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {total > 0 && (
                <p className="text-center text-sm text-gris-texto-secundario font-fira mt-8">
                  Mostrando {(page - 1) * LIMITE + 1}–
                  {Math.min(page * LIMITE, total)} de {total} productos
                </p>
              )}

              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </section>

      <footer className="relative bg-gris-superficie pt-16 pb-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
            <div className="animate-fade-in-up" style={{ animationDelay: "0ms" }}>
              <h3 className="font-montserrat font-extrabold text-lg text-gris-texto">
                Enlaces útiles
              </h3>
              <span className="block w-12 h-0.5 bg-verde/60 rounded-full mt-2 mb-5" />
              <ul className="flex flex-col gap-2.5">
                <li>
                  <a
                    href="https://www.comercialbrich.cl/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link inline-flex items-center gap-2 text-sm text-gris-texto-secundario hover:text-verde transition-colors duration-200 font-fira"
                  >
                    <svg className="w-2.5 h-2.5 shrink-0 transition-transform duration-200 group-hover/link:translate-x-1" viewBox="0 0 8 8" fill="currentColor">
                      <path d="M2 0L6 4L2 8V0Z" />
                    </svg>
                    Acerca de nosotros
                  </a>
                </li>
              </ul>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <h3 className="font-montserrat font-extrabold text-lg text-gris-texto">
                Contáctenos
              </h3>
              <span className="block w-12 h-0.5 bg-verde/60 rounded-full mt-2 mb-5" />
              <ul className="flex flex-col gap-2.5">
                <li>
                  <a
                    href="tel:+56996331421"
                    className="group/link inline-flex items-center gap-2 text-sm text-gris-texto-secundario hover:text-verde transition-colors duration-200 font-fira"
                  >
                    <svg className="w-2.5 h-2.5 shrink-0 transition-transform duration-200 group-hover/link:translate-x-1" viewBox="0 0 8 8" fill="currentColor">
                      <path d="M2 0L6 4L2 8V0Z" />
                    </svg>
                    +56 9 9633 1421
                  </a>
                </li>
                <li>
                  <a
                    href="tel:+56988689625"
                    className="group/link inline-flex items-center gap-2 text-sm text-gris-texto-secundario hover:text-verde transition-colors duration-200 font-fira"
                  >
                    <svg className="w-2.5 h-2.5 shrink-0 transition-transform duration-200 group-hover/link:translate-x-1" viewBox="0 0 8 8" fill="currentColor">
                      <path d="M2 0L6 4L2 8V0Z" />
                    </svg>
                    +56 9 8868 9625
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:contacto@comercialbrich.cl"
                    className="group/link inline-flex items-center gap-2 text-sm text-gris-texto-secundario hover:text-verde transition-colors duration-200 font-fira"
                  >
                    <svg className="w-2.5 h-2.5 shrink-0 transition-transform duration-200 group-hover/link:translate-x-1" viewBox="0 0 8 8" fill="currentColor">
                      <path d="M2 0L6 4L2 8V0Z" />
                    </svg>
                    contacto@comercialbrich.cl
                  </a>
                </li>
                <li>
                  <a
                    href="https://maps.app.goo.gl/XJ8hhq3Z6JgPR7Mo9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link inline-flex items-center gap-2 text-sm text-gris-texto-secundario hover:text-verde transition-colors duration-200 font-fira"
                  >
                    <svg className="w-2.5 h-2.5 shrink-0 transition-transform duration-200 group-hover/link:translate-x-1" viewBox="0 0 8 8" fill="currentColor">
                      <path d="M2 0L6 4L2 8V0Z" />
                    </svg>
                    Av. Las Parcelas 4229, Alto Hospicio
                  </a>
                </li>
              </ul>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              <h3 className="font-montserrat font-extrabold text-lg text-gris-texto">
                Ficha del proveedor
              </h3>
              <span className="block w-12 h-0.5 bg-verde/60 rounded-full mt-2 mb-5" />
              <a
                href="https://proveedor.mercadopublico.cl/ficha/15.009.829-7"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-2 rounded-2xl bg-white shadow-sutil w-fit"
              >
                <Image
                  src="/qr.png"
                  alt="QR Ficha del Proveedor"
                  width={88}
                  height={88}
                  className="rounded-lg shrink-0"
                />
                <span className="text-xs text-white px-3.5 py-1.5 bg-verde rounded-xl font-fira font-semibold hover:bg-verde-oscuro transition-colors duration-200">
                  FICHA DEL PROVEEDOR
                </span>
              </a>
            </div>
          </div>

          <div className="mt-14 pt-7 border-t border-verde/10 text-center">
            <p className="text-sm text-gris-texto-secundario/60 font-fira">
              &copy; {new Date().getFullYear()} Comercial Brich. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>

      {modalProducto && (
        <ProductModal
          producto={modalProducto}
          onClose={() => setModalProducto(null)}
        />
      )}
    </main>
  );
}
