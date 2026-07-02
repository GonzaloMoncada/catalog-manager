"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost, apiPatch } from "@/lib/api";

type EstadoRegion =
  | "HABILITADO"
  | "DESHABILITADO"
  | "PENDIENTE"
  | "DESHABILITADO_POR_DISPERSION"
  | "DESHABILITADO_POR_PRECIO";

const ESTADOS: EstadoRegion[] = [
  "HABILITADO",
  "DESHABILITADO",
  "PENDIENTE",
  "DESHABILITADO_POR_DISPERSION",
  "DESHABILITADO_POR_PRECIO",
];

const ESTADO_LABEL: Record<EstadoRegion, string> = {
  HABILITADO: "Habilitado",
  DESHABILITADO: "Deshab.",
  PENDIENTE: "Pendiente",
  DESHABILITADO_POR_DISPERSION: "Desh. dispersión",
  DESHABILITADO_POR_PRECIO: "Desh. precio",
};

const ESTADO_ORDEN: Record<EstadoRegion, number> = {
  HABILITADO: 1,
  PENDIENTE: 2,
  DESHABILITADO: 3,
  DESHABILITADO_POR_PRECIO: 4,
  DESHABILITADO_POR_DISPERSION: 5,
};

const ESTADO_COLOR: Record<EstadoRegion, string> = {
  HABILITADO: "bg-green-100 text-green-700",
  PENDIENTE: "bg-amber-100 text-amber-700",
  DESHABILITADO: "bg-red-100 text-red-700",
  DESHABILITADO_POR_DISPERSION: "bg-orange-100 text-orange-700",
  DESHABILITADO_POR_PRECIO: "bg-purple-100 text-purple-700",
};

type SortableColumn = "estado" | "codigo" | "nombre" | "fecha_creacion" | "fecha_actualizacion";

interface Region {
  id: number;
  nombre: string;
}

interface OfertaProducto {
  id: number;
  precio: number;
  estado: string;
  oferta: {
    id: number;
    nombre: string;
    descripcion: string;
    fecha_inicio: string;
    fecha_fin: string;
    estado: string;
  };
}

interface ProductoRegion {
  producto_id: number;
  codigo: string;
  precio: number;
  region_id: number;
  estado: EstadoRegion;
  region: Region;
  oferta_producto?: OfertaProducto[];
}

interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  estado: EstadoRegion;
  imagenUrl: string | null;
  categoria_id: number | null;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  Categorias?: { id: number; nombre: string } | null;
  producto_regiones: ProductoRegion[];
}

interface Categoria {
  id: number;
  nombre: string;
}

function getBestOffer(pr: ProductoRegion): OfertaProducto | null {
  const offers = pr.oferta_producto ?? [];
  const active = offers.filter(
    (o) => o.oferta.estado === "ACTIVA"
  );
  if (active.length === 0) return null;
  return active.reduce((a, b) => (a.precio < b.precio ? a : b));
}

function hasActiveOffer(producto: Producto): boolean {
  return (producto.producto_regiones ?? []).some(
    (pr) => (pr.oferta_producto ?? []).some(
      (o) => o.estado === "HABILITADO" && o.oferta.estado === "ACTIVA"
    )
  );
}

function formatDateRange(inicio: string, fin: string): string {
  const i = new Date(inicio).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" });
  const f = new Date(fin).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" });
  return `${i} - ${f}`;
}


export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [perPage, setPerPage] = useState(20);
  const [customPerPage, setCustomPerPage] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [page, setPage] = useState(1);
  const [canUpdate, setCanUpdate] = useState(true);
  const [canCreate, setCanCreate] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [estadoMenuId, setEstadoMenuId] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [cacheApiPage, setCacheApiPage] = useState(0);
  const [productosCache, setProductosCache] = useState<Record<number, Producto[]>>({});
  const productosCacheRef = useRef<Record<number, Producto[]>>({});

  function trimCache<T>(cache: Record<number, T>, around: number): Record<number, T> {
    const keep = [around - 1, around, around + 1];
    const trimmed: Record<number, T> = {};
    for (const key of keep) {
      if (cache[key]) trimmed[key] = cache[key];
    }
    return trimmed;
  }
  const [sortBy, setSortBy] = useState<SortableColumn>("estado");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [modal, setModal] = useState<{ open: boolean; edit: Producto | null }>({
    open: false,
    edit: null,
  });
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    imagenUrl: "",
    categoria_id: "",
    estado: "PENDIENTE" as EstadoRegion,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "loading" } | null>(null);
  const [changingStatus, setChangingStatus] = useState<Set<number>>(new Set());
  const [savingProductId, setSavingProductId] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkEstado, setBulkEstado] = useState("");
  const [bulkCategoria, setBulkCategoria] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const [filterEstados, setFilterEstados] = useState<Set<EstadoRegion>>(new Set());
  const [filterCategoria, setFilterCategoria] = useState("");

  const activeFilterCount = filterEstados.size + (filterCategoria ? 1 : 0);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailProductId, setDetailProductId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<Producto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailContext, setDetailContext] = useState<"productos" | "regiones" | null>(null);

  const [regionForm, setRegionForm] = useState({
    region_id: "",
    codigo: "",
    precio: "",
    estado: "PENDIENTE" as EstadoRegion,
  });
  const [regionSaving, setRegionSaving] = useState(false);
  const [regionError, setRegionError] = useState("");

  const [pendingRegions, setPendingRegions] = useState<Array<{
    region_id: string;
    codigo: string;
    precio: string;
    estado: EstadoRegion;
  }>>([]);
  const [processingRegions, setProcessingRegions] = useState(false);
  const [failedRegions, setFailedRegions] = useState<Array<{ codigo: string; error: string }>>([]);
  const processingRef = useRef(false);
  const pendingRef = useRef<typeof pendingRegions>([]);
  const detailProductIdRef = useRef(detailProductId);
  useEffect(() => { detailProductIdRef.current = detailProductId; }, [detailProductId]);

  const [editingRegions, setEditingRegions] = useState<Set<string>>(new Set());
  const [editRegionsData, setEditRegionsData] = useState<Record<string, { codigo: string; precio: string; estado: EstadoRegion }>>({});
  const [editRegionsSaving, setEditRegionsSaving] = useState(false);

  const [regionList, setRegionList] = useState<ProductoRegion[]>([]);
  const [regionTotal, setRegionTotal] = useState(0);
  const [regionPage, setRegionPage] = useState(1);
  const [regionSearch, setRegionSearch] = useState("");
  const [regionSortBy, setRegionSortBy] = useState<"estado" | "codigo" | "precio" | "region">("estado");
  const [regionSortDir, setRegionSortDir] = useState<"asc" | "desc">("asc");
  const [regionLoading, setRegionLoading] = useState(false);

  const REGION_PER_PAGE = 10;

  const [regionesOpen, setRegionesOpen] = useState(false);
  const [globalRegionList, setGlobalRegionList] = useState<ProductoRegion[]>([]);
  const [globalRegionTotal, setGlobalRegionTotal] = useState(0);
  const [globalRegionPage, setGlobalRegionPage] = useState(1);
  const [globalRegionCachePage, setGlobalRegionCachePage] = useState(0);
  const [globalRegionListCache, setGlobalRegionListCache] = useState<Record<number, ProductoRegion[]>>({});
  const globalRegionCacheRef = useRef<Record<number, ProductoRegion[]>>({});
  const [globalRegionSearch, setGlobalRegionSearch] = useState("");
  const [globalRegionSortBy, setGlobalRegionSortBy] = useState<"estado" | "codigo" | "precio" | "region" | "producto">("producto");
  const [globalRegionSortDir, setGlobalRegionSortDir] = useState<"asc" | "desc">("asc");
  const [globalRegionLoading, setGlobalRegionLoading] = useState(false);
  const [globalFilterEstados, setGlobalFilterEstados] = useState<Set<EstadoRegion>>(new Set());
  const [globalFilterRegion, setGlobalFilterRegion] = useState("");
  const [globalFilterPrecioMin, setGlobalFilterPrecioMin] = useState("");
  const [globalFilterPrecioMax, setGlobalFilterPrecioMax] = useState("");
  const [globalRegionPerPage, setGlobalRegionPerPage] = useState(20);
  const [globalCustomPerPage, setGlobalCustomPerPage] = useState("");
  const [showGlobalCustomInput, setShowGlobalCustomInput] = useState(false);
  const [showGlobalFilters, setShowGlobalFilters] = useState(false);

  const globalActiveFilterCount =
    globalFilterEstados.size +
    (globalFilterRegion ? 1 : 0) +
    (globalFilterPrecioMin ? 1 : 0) +
    (globalFilterPrecioMax ? 1 : 0);

  const [globalEditingRegions, setGlobalEditingRegions] = useState<Set<string>>(new Set());
  const [globalEditRegionsData, setGlobalEditRegionsData] = useState<Record<string, { precio: string; estado: EstadoRegion; productoId: number }>>({});
  const [globalEditRegionsSaving, setGlobalEditRegionsSaving] = useState(false);

  const [globalSelectedRegions, setGlobalSelectedRegions] = useState<Set<string>>(new Set());
  const [globalBulkLoading, setGlobalBulkLoading] = useState(false);
  const [globalBulkEstado, setGlobalBulkEstado] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetchLimit = perPage <= 500 ? perPage * 2 : perPage;
      const apiPage = perPage <= 500 ? Math.floor((page - 1) / 2) + 1 : page;

      if (perPage <= 500 && apiPage === cacheApiPage) {
        setLoading(false);
        return;
      }

      const cached = productosCacheRef.current[apiPage];
      if (perPage <= 500 && cached) {
        setProductos(cached);
        setCacheApiPage(apiPage);
        setLoading(false);
        return;
      }

      const q = new URLSearchParams({ pagina: String(apiPage), limite: String(fetchLimit) });
      if (search) q.set("buscar", search);
      q.set("orderBy", sortBy);
      q.set("orderDir", sortDir);
      if (filterEstados.size > 0) {
        q.set("estado", Array.from(filterEstados).join(","));
      }
      if (filterCategoria) {
        q.set("categoria_id", filterCategoria);
      }
      const data = await apiGet("product?" + q.toString());
      const list: Producto[] = Array.isArray(data) ? data : data.datos ?? [];
      setProductos(list);
      setTotal(data.total ?? list.length ?? 0);
      if (perPage <= 500) {
        setCacheApiPage(apiPage);
        const updated = trimCache({ ...productosCacheRef.current, [apiPage]: list }, apiPage);
        productosCacheRef.current = updated;
        setProductosCache(updated);
      }
    } catch {
      setError("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }, [page, search, sortBy, sortDir, filterEstados, filterCategoria, perPage, cacheApiPage]);

  const displayedProductos = (() => {
    if (perPage > 500) return productos;
    const apiPage = Math.floor((page - 1) / 2) + 1;
    const batch = productosCache[apiPage] ?? productos;
    return batch.slice(((page - 1) % 2) * perPage, ((page - 1) % 2 + 1) * perPage);
  })();

  useEffect(() => {
    if (perPage > 500) return;
    const isSecondHalf = (page - 1) % 2 === 1;
    if (!isSecondHalf) return;
    const nextApiPage = Math.floor((page - 1) / 2) + 2;
    if (nextApiPage === cacheApiPage) return;
    const nextClientPage = page + 1;
    if (nextClientPage > Math.ceil(total / perPage)) return;

    const fetchLimit = perPage * 2;
    const q = new URLSearchParams({ pagina: String(nextApiPage), limite: String(fetchLimit) });
    if (search) q.set("buscar", search);
    q.set("orderBy", sortBy);
    q.set("orderDir", sortDir);
    if (filterEstados.size > 0) q.set("estado", Array.from(filterEstados).join(","));
    if (filterCategoria) q.set("categoria_id", filterCategoria);

    apiGet("product?" + q.toString()).then((data) => {
      const list: Producto[] = Array.isArray(data) ? data : data.datos ?? [];
      const currentApiPage = Math.floor((page - 1) / 2) + 1;
      const updated = trimCache({ ...productosCacheRef.current, [nextApiPage]: list }, currentApiPage);
      productosCacheRef.current = updated;
      setProductosCache(updated);
    }).catch(() => {});
  }, [page, perPage, total, cacheApiPage, search, sortBy, sortDir, filterEstados, filterCategoria]);

  const effectivePerPage = perPage;

  const loadCategorias = useCallback(async () => {
    try {
      const data = await apiGet("category?pagina=1&limite=500");
      const list = Array.isArray(data) ? data : data.datos ?? data.data ?? [];
      setCategorias(list);
    } catch {}
  }, []);

  const loadAllRegiones = useCallback(async () => {
    try {
      const data = await apiGet("region?limite=100");
      const list = Array.isArray(data) ? data : data.datos ?? data.data ?? [];
      setRegiones(list);
    } catch {}
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    loadCategorias();
  }, [loadCategorias]);
  useEffect(() => {
    loadAllRegiones();
  }, [loadAllRegiones]);

  useEffect(() => {
    apiGet("profile").then((data) => {
      const admin = data.isAdmin;
      const perms: string[] = data.permisos ?? [];
      setCanUpdate(admin || perms.includes("PRODUCTO_UPDATE"));
      setCanCreate(admin || perms.includes("PRODUCTO_CREATE"));
    }).catch(() => {});
  }, []);

  const hasUnsavedChanges = editingRegions.size > 0 || globalEditingRegions.size > 0 || pendingRegions.length > 0 || processingRegions || bulkLoading || globalBulkLoading || globalEditRegionsSaving || editRegionsSaving || savingProductId !== null;

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  function handleSort(col: SortableColumn) {
    setCacheApiPage(0);
    setProductosCache({});
    productosCacheRef.current = {};
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir(col === "estado" ? "asc" : col === "fecha_creacion" || col === "fecha_actualizacion" ? "desc" : "asc");
    }
    setPage(1);
  }

  function renderSortArrow(col: SortableColumn) {
    if (sortBy !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1 text-gray-600">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  function openCreate() {
    setForm({ codigo: "", nombre: "", imagenUrl: "", categoria_id: "", estado: "PENDIENTE" });
    setModal({ open: true, edit: null });
    setError("");
  }

  function openEdit(p: Producto) {
    setForm({
      codigo: p.codigo,
      nombre: p.nombre,
      imagenUrl: p.imagenUrl ?? "",
      categoria_id: p.categoria_id?.toString() ?? "",
      estado: p.estado,
    });
    setModal({ open: true, edit: p });
    setError("");
  }

  function closeModal() {
    setModal({ open: false, edit: null });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.codigo || !form.nombre) {
      setError("Código y nombre son obligatorios");
      return;
    }
    setError("");
    const editId = modal.edit?.id ?? null;
    const originalProduct = modal.edit;
    const isEdit = !!editId;
    if (isEdit) {
      setSavingProductId(editId);
      closeModal();
    }
    setSaving(true);
    try {
      const body = {
        codigo: form.codigo,
        nombre: form.nombre,
        imagenUrl: form.imagenUrl || undefined,
        categoria_id: form.categoria_id ? Number(form.categoria_id) : undefined,
        estado: form.estado,
      };
      if (editId && originalProduct) {
        await apiPatch("product/" + editId, body);
        const updated = {
          ...originalProduct,
          ...body,
          categoria_id: body.categoria_id ?? null,
        } as Producto;
        setProductosCache((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            next[+key] = next[+key].map((p) => (p.id === editId ? updated : p));
          }
          return next;
        });
        for (const key of Object.keys(productosCacheRef.current)) {
          productosCacheRef.current[+key] = productosCacheRef.current[+key].map((p) =>
            p.id === editId ? updated : p,
          );
        }
        setProductos((prev) => prev.map((p) => (p.id === editId ? updated : p)));
        if (detailOpen && detailProductId === editId) {
          const refreshed = await apiGet("product/" + editId);
          setDetailData(refreshed);
        }
      } else {
        setToast({ message: "Creando producto...", type: "loading" });
        const created: Producto = await apiPost("product", body);
        setToast({ message: `Producto "${form.nombre || form.codigo}" creado`, type: "success" });
        setTimeout(() => setToast(null), 4000);

        const newId = created.id;
        setPage(1);
        setCacheApiPage(0);
        setProductosCache({});
        productosCacheRef.current = {};

        const q = new URLSearchParams({ pagina: "1", limite: String(perPage <= 500 ? perPage * 2 : perPage), orderBy: sortBy, orderDir: sortDir });
        if (search) q.set("buscar", search);
        if (filterEstados.size > 0) q.set("estado", Array.from(filterEstados).join(","));
        if (filterCategoria) q.set("categoria_id", filterCategoria);
        const data = await apiGet("product?" + q.toString());
        const list: Producto[] = Array.isArray(data) ? data : data.datos ?? [];
        setProductos(list);
        setTotal(data.total ?? list.length ?? 0);
        if (perPage <= 500) {
          setCacheApiPage(1);
          const updated = trimCache({ 1: list }, 1);
          productosCacheRef.current = updated;
          setProductosCache(updated);
        }

        if (newId) {
          openDetail(newId);
          closeModal();
        }
      }
    } catch (e: any) {
      setError(e.message || "Error al guardar");
      setToast({ message: e.message || "Error al guardar", type: "error" });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSaving(false);
      setSavingProductId(null);
    }
  }

  async function handleChangeStatus(id: number, nuevoEstado: EstadoRegion) {
    setChangingStatus((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      await apiPatch("product/" + id, { estado: nuevoEstado } as any);
      setProductosCache((prev) => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          updated[+key] = updated[+key].map((p) =>
            p.id === id ? { ...p, estado: nuevoEstado } : p
          );
        }
        return updated;
      });
      productosCacheRef.current = { ...productosCacheRef.current };
      for (const key of Object.keys(productosCacheRef.current)) {
        productosCacheRef.current[+key] = productosCacheRef.current[+key].map((p) =>
          p.id === id ? { ...p, estado: nuevoEstado } : p
        );
      }
      setProductos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p))
      );
      if (detailOpen && detailProductId === id) {
        setDetailData((prev) => prev ? { ...prev, estado: nuevoEstado } : prev);
      }
    } catch (e: any) {
      alert(e.message || "Error al cambiar estado");
    } finally {
      setChangingStatus((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleBulkSetEstado() {
    if (selected.size === 0 || !bulkEstado) return;
    setBulkLoading(true);
    const targetEstado = bulkEstado;
    const ids = Array.from(selected);
    const results = await Promise.allSettled(
      ids.map((id) => apiPatch("product/" + id, { estado: targetEstado } as any)),
    );
    const count = results.filter((r) => r.status === "fulfilled").length;
    const errors = results.length - count;
    setBulkEstado("");
    setBulkLoading(false);
    setCacheApiPage(0);
    setProductosCache({});
    productosCacheRef.current = {};
    load();
    if (errors > 0) {
      alert(`Estado actualizado en ${count} productos.\n${errors} producto${errors !== 1 ? "s" : ""} fallaron.`);
    }
  }

  async function handleBulkSetCategoria() {
    if (selected.size === 0 || !bulkCategoria) return;
    setBulkLoading(true);
    const targetCategoria = Number(bulkCategoria);
    const ids = Array.from(selected);
    const results = await Promise.allSettled(
      ids.map((id) => apiPatch("product/" + id, { categoria_id: targetCategoria })),
    );
    const count = results.filter((r) => r.status === "fulfilled").length;
    const errors = results.length - count;
    setSelected(new Set());
    setBulkCategoria("");
    setBulkLoading(false);
    setCacheApiPage(0);
    setProductosCache({});
    productosCacheRef.current = {};
    load();
    if (errors > 0) {
      alert(`Categoría asignada en ${count} productos.\n${errors} producto${errors !== 1 ? "s" : ""} fallaron.`);
    }
  }

  async function openDetail(productId: number, context: "productos" | "regiones" = "regiones") {
    setDetailContext(context);
    setDetailProductId(productId);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    setRegionForm({ region_id: "", codigo: "", precio: "", estado: "PENDIENTE" });
    setRegionError("");
    setRegionPage(1);
    setRegionSearch("");
    setRegionSortBy("estado");
    setRegionSortDir("asc");
    try {
      const data = await apiGet("product/" + productId);
      setDetailData(data);
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  }

  const loadRegiones = useCallback(async () => {
    if (!detailProductId) return;
    setRegionLoading(true);
    try {
      const q = new URLSearchParams({
        pagina: String(regionPage),
        limite: String(REGION_PER_PAGE),
        orderBy: regionSortBy,
        orderDir: regionSortDir,
      });
      if (regionSearch) q.set("buscar", regionSearch);
      const data = await apiGet(
        "product/" + detailProductId + "/region?" + q.toString(),
      );
      const list = Array.isArray(data) ? data : data.datos ?? [];
      setRegionList(list);
      setRegionTotal(data.total ?? list.length ?? 0);
    } catch {} finally {
      setRegionLoading(false);
    }
  }, [detailProductId, regionPage, regionSearch, regionSortBy, regionSortDir]);

  useEffect(() => {
    if (detailOpen) loadRegiones();
  }, [loadRegiones, detailOpen]);

  const loadGlobalRegiones = useCallback(async () => {
    setGlobalRegionLoading(true);
    try {
      const fetchLimit = globalRegionPerPage <= 500 ? globalRegionPerPage * 2 : globalRegionPerPage;
      const apiPage = globalRegionPerPage <= 500
        ? Math.floor((globalRegionPage - 1) / 2) + 1
        : globalRegionPage;

      if (globalRegionPerPage <= 500 && apiPage === globalRegionCachePage) {
        setGlobalRegionLoading(false);
        return;
      }

      const cached = globalRegionCacheRef.current[apiPage];
      if (globalRegionPerPage <= 500 && cached) {
        setGlobalRegionList(cached);
        setGlobalRegionCachePage(apiPage);
        setGlobalRegionLoading(false);
        return;
      }

      const q = new URLSearchParams({
        pagina: String(apiPage),
        limite: String(fetchLimit),
        orderBy: globalRegionSortBy,
        orderDir: globalRegionSortDir,
      });
      if (globalRegionSearch) q.set("buscar", globalRegionSearch);
      if (globalFilterEstados.size > 0) {
        q.set("estado", Array.from(globalFilterEstados).join(","));
      }
      if (globalFilterRegion) q.set("region_id", globalFilterRegion);
      if (globalFilterPrecioMin) q.set("precio_min", globalFilterPrecioMin);
      if (globalFilterPrecioMax) q.set("precio_max", globalFilterPrecioMax);
      const data = await apiGet("product/regiones?" + q.toString());
      const list = Array.isArray(data) ? data : data.datos ?? [];
      setGlobalRegionList(list);
      setGlobalRegionTotal(data.total ?? list.length ?? 0);
      if (globalRegionPerPage <= 500) {
        setGlobalRegionCachePage(apiPage);
        const updated = trimCache({ ...globalRegionCacheRef.current, [apiPage]: list }, apiPage);
        globalRegionCacheRef.current = updated;
        setGlobalRegionListCache(updated);
      }
    } catch {} finally {
      setGlobalRegionLoading(false);
    }
  }, [globalRegionPage, globalRegionSearch, globalRegionSortBy, globalRegionSortDir, globalFilterEstados, globalRegionPerPage, globalFilterRegion, globalFilterPrecioMin, globalFilterPrecioMax, globalRegionCachePage]);

  useEffect(() => {
    loadGlobalRegiones();
  }, [loadGlobalRegiones]);

  const displayedGlobalRegions = (() => {
    if (globalRegionPerPage > 500) return globalRegionList;
    const apiPage = Math.floor((globalRegionPage - 1) / 2) + 1;
    const batch = globalRegionListCache[apiPage] ?? globalRegionList;
    return batch.slice(
      ((globalRegionPage - 1) % 2) * globalRegionPerPage,
      ((globalRegionPage - 1) % 2 + 1) * globalRegionPerPage,
    );
  })();

  useEffect(() => {
    if (globalRegionPerPage > 500) return;
    const isSecondHalf = (globalRegionPage - 1) % 2 === 1;
    if (!isSecondHalf) return;
    const nextApiPage = Math.floor((globalRegionPage - 1) / 2) + 2;
    if (nextApiPage === globalRegionCachePage) return;
    const nextClientPage = globalRegionPage + 1;
    if (nextClientPage > Math.ceil(globalRegionTotal / globalRegionPerPage)) return;

    const fetchLimit = globalRegionPerPage * 2;
    const q = new URLSearchParams({
      pagina: String(nextApiPage),
      limite: String(fetchLimit),
      orderBy: globalRegionSortBy,
      orderDir: globalRegionSortDir,
    });
    if (globalRegionSearch) q.set("buscar", globalRegionSearch);
    if (globalFilterEstados.size > 0) q.set("estado", Array.from(globalFilterEstados).join(","));
    if (globalFilterRegion) q.set("region_id", globalFilterRegion);
    if (globalFilterPrecioMin) q.set("precio_min", globalFilterPrecioMin);
    if (globalFilterPrecioMax) q.set("precio_max", globalFilterPrecioMax);

    apiGet("product/regiones?" + q.toString()).then((data) => {
      const list = Array.isArray(data) ? data : data.datos ?? [];
      const currentApiPage = Math.floor((globalRegionPage - 1) / 2) + 1;
      const updated = trimCache({ ...globalRegionCacheRef.current, [nextApiPage]: list }, currentApiPage);
      globalRegionCacheRef.current = updated;
      setGlobalRegionListCache(updated);
    }).catch(() => {});
  }, [globalRegionPage, globalRegionPerPage, globalRegionTotal, globalRegionCachePage, globalRegionSearch, globalRegionSortBy, globalRegionSortDir, globalFilterEstados, globalFilterRegion, globalFilterPrecioMin, globalFilterPrecioMax]);

  function openRegiones() {
    setRegionesOpen(true);
    setPage(1);
    setSearch("");
    setSortBy("estado");
    setSortDir("asc");
    setFilterEstados(new Set());
    setFilterCategoria("");
    setSelected(new Set());
    setBulkEstado("");
    setBulkCategoria("");
    setBulkLoading(false);
    setCacheApiPage(0);
    setProductosCache({});
    productosCacheRef.current = {};
  }

  function closeRegiones() {
    setRegionesOpen(false);
    setSelected(new Set());
    setBulkEstado("");
    setBulkCategoria("");
  }

  function handleCancelAllGlobalRegions() {
    setGlobalEditingRegions(new Set());
    setGlobalEditRegionsData({});
  }

  async function handleGlobalBulkSetEstado() {
    if (globalSelectedRegions.size === 0 || !globalBulkEstado) return;
    setGlobalBulkLoading(true);
    const targetEstado = globalBulkEstado;
    const codigos = Array.from(globalSelectedRegions);
    const displayed = displayedGlobalRegions.filter((pr) => globalSelectedRegions.has(pr.codigo));
    const results = await Promise.allSettled(
      displayed.map((pr) =>
        apiPatch("product/" + pr.producto_id + "/region/" + encodeURIComponent(pr.codigo), { estado: targetEstado } as any),
      ),
    );
    const count = results.filter((r) => r.status === "fulfilled").length;
    const errors = results.length - count;
    setGlobalBulkEstado("");
    setGlobalBulkLoading(false);
    setGlobalSelectedRegions(new Set());
    setGlobalRegionCachePage(0);
    setGlobalRegionListCache({});
    globalRegionCacheRef.current = {};
    setCacheApiPage(0);
    setProductosCache({});
    productosCacheRef.current = {};
    loadGlobalRegiones();
    load();
    if (errors > 0) {
      alert(`Estado actualizado en ${count} regiones.\n${errors} región${errors !== 1 ? "es" : ""} fallaron.`);
    }
  }

  async function handleSaveAllGlobalRegions() {
    if (globalEditingRegions.size === 0) return;
    setGlobalEditRegionsSaving(true);

    const edits = Array.from(globalEditingRegions).map((codigo) => ({
      codigo,
      data: globalEditRegionsData[codigo],
    })).filter((e) => e.data) as Array<{ codigo: string; data: { precio: string; estado: EstadoRegion; productoId: number } }>;

    const results = await Promise.allSettled(
      edits.map((e) =>
        apiPatch(
          "product/" + e.data.productoId + "/region/" + encodeURIComponent(e.codigo),
          { precio: Number(e.data.precio), estado: e.data.estado },
        ),
      ),
    );

    const errors = results.filter((r) => r.status === "rejected").length;
    const succeeded = edits.filter((_, i) => results[i].status === "fulfilled");

    const updateList = (list: ProductoRegion[]) =>
      list.map((pr) => {
        const hit = succeeded.find((e) => e.codigo === pr.codigo);
        if (!hit) return pr;
        return { ...pr, precio: Number(hit.data.precio), estado: hit.data.estado };
      });

    setGlobalRegionList((prev) => updateList(prev));
    setGlobalRegionListCache((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[+key] = updateList(next[+key]);
      }
      return next;
    });
    for (const key of Object.keys(globalRegionCacheRef.current)) {
      globalRegionCacheRef.current[+key] = updateList(globalRegionCacheRef.current[+key]);
    }

    setGlobalEditingRegions(new Set());
    setGlobalEditRegionsData({});
    setGlobalEditRegionsSaving(false);
    if (errors > 0) alert(`${errors} región${errors !== 1 ? "es" : ""} no se pudo guardar`);
  }

  const globalRegionTotalPages = Math.max(1, Math.ceil(globalRegionTotal / globalRegionPerPage));

  function handleGlobalRegionSort(col: "estado" | "codigo" | "precio" | "region" | "producto") {
    setGlobalRegionCachePage(0);
    setGlobalRegionListCache({});
    globalRegionCacheRef.current = {};
    if (globalRegionSortBy === col) {
      setGlobalRegionSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setGlobalRegionSortBy(col);
      setGlobalRegionSortDir("asc");
    }
    setGlobalRegionPage(1);
  }

  function renderGlobalRegionSortArrow(col: "estado" | "codigo" | "precio" | "region" | "producto") {
    if (globalRegionSortBy !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1 text-gray-600">{globalRegionSortDir === "asc" ? "↑" : "↓"}</span>;
  }

  function closeDetail() {
    if (pendingRegions.length > 0 || processingRegions) {
      if (!confirm("Hay regiones pendientes por agregar. Si cerrás ahora, las regiones en cola no se guardarán. ¿Cerrar de todas formas?")) return;
      processingRef.current = false;
      setProcessingRegions(false);
      pendingRef.current = [];
      setPendingRegions([]);
    }
    if (editRegionsSaving) {
      if (!confirm("Hay cambios guardándose. ¿Cerrar de todas formas?")) return;
    }
    if (editingRegions.size > 0) {
      if (!confirm("Tenés cambios sin guardar. ¿Cerrar de todas formas?")) return;
    }
    setDetailOpen(false);
    setDetailProductId(null);
    setDetailContext(null);
    setDetailData(null);
    setRegionForm({ region_id: "", codigo: "", precio: "", estado: "PENDIENTE" });
    setRegionError("");
    setEditingRegions(new Set());
    setEditRegionsData({});
    setRegionList([]);
    setRegionTotal(0);
    setRegionPage(1);
    setRegionSearch("");
    setFailedRegions([]);
  }

  const detailNavIds = useMemo(() => {
    if (!detailContext) return [] as number[];
    if (detailContext === "productos") {
      return displayedProductos.map((p) => p.id);
    }
    const seen = new Set<number>();
    return displayedGlobalRegions
      .map((pr) => pr.producto_id)
      .filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
  }, [detailContext, displayedProductos, displayedGlobalRegions]);

  const currentNavIndex = detailProductId !== null ? detailNavIds.indexOf(detailProductId) : -1;

  function navigateDetail(direction: "prev" | "next") {
    if (currentNavIndex === -1 || !detailContext) return;
    const newIndex = direction === "prev" ? currentNavIndex - 1 : currentNavIndex + 1;
    if (newIndex < 0 || newIndex >= detailNavIds.length) return;
    openDetail(detailNavIds[newIndex], detailContext);
  }

  async function processRegionQueue() {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessingRegions(true);
    const productId = detailProductIdRef.current;
    if (!productId) {
      processingRef.current = false;
      setProcessingRegions(false);
      return;
    }

    while (pendingRef.current.length > 0) {
      const item = pendingRef.current[0];
      try {
        await apiPost("product/" + productId + "/region", {
          producto_id: productId,
          codigo: item.codigo,
          precio: Number(item.precio),
          region_id: Number(item.region_id),
          estado: item.estado,
        });
      } catch (e: any) {
        setFailedRegions((prev) => [...prev, { codigo: item.codigo, error: e.message || "Error al agregar región" }]);
      }
      pendingRef.current = pendingRef.current.slice(1);
      setPendingRegions(pendingRef.current);
    }

    setProcessingRegions(false);
    processingRef.current = false;

    try {
      const refreshed = await apiGet("product/" + productId);
      setDetailData(refreshed);
      setProductosCache((prev) => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          updated[+key] = updated[+key].map((p) => (p.id === productId ? refreshed : p));
        }
        return updated;
      });
      for (const key of Object.keys(productosCacheRef.current)) {
        productosCacheRef.current[+key] = productosCacheRef.current[+key].map((p) =>
          p.id === productId ? refreshed : p,
        );
      }
      setProductos((prev) => prev.map((p) => (p.id === productId ? refreshed : p)));

      const q = new URLSearchParams({ pagina: "1", limite: String(REGION_PER_PAGE), orderBy: "estado", orderDir: "asc" });
      const regionData = await apiGet("product/" + productId + "/region?" + q.toString());
      const list = Array.isArray(regionData) ? regionData : regionData.datos ?? [];
      setRegionList(list);
      setRegionTotal(regionData.total ?? list.length ?? 0);
      setRegionPage(1);
    } catch {}
  }

  function handleAutoGenerateRegions() {
    if (!detailProductId || !detailData) return;
    const precio = prompt("Ingrese el precio para las 3 regiones:");
    if (!precio || isNaN(Number(precio)) || Number(precio) <= 0) {
      setRegionError("Debe ingresar un precio válido");
      return;
    }
    setRegionError("");
    setFailedRegions([]);

    const regionNames = ["Arica y Parinacota", "Tarapacá", "Antofagasta"];
    const parentCode = detailData.codigo;

    const parentCodeNum = Number(parentCode);
    if (isNaN(parentCodeNum)) {
      setRegionError("El código del producto no es numérico, no se puede auto-generar");
      return;
    }

    const newRegions = regionNames.map((name, i) => {
      const region = regiones.find((r) => r.nombre === name);
      return {
        region_id: region ? String(region.id) : "",
        codigo: String(parentCodeNum + i + 1),
        precio,
        estado: "HABILITADO" as EstadoRegion,
      };
    });

    const missing = newRegions.filter((r) => !r.region_id);
    if (missing.length > 0) {
      setRegionError(`Regiones no encontradas: ${missing.map((r) => r.codigo).join(", ")}. Asegúrate de que las regiones existen en el sistema.`);
      return;
    }

    pendingRef.current = [...pendingRef.current, ...newRegions];
    setPendingRegions(pendingRef.current);
    processRegionQueue();
  }

  function handleAddRegion(e: React.FormEvent) {
    e.preventDefault();
    if (!regionForm.region_id || !regionForm.codigo || !regionForm.precio) {
      setRegionError("Región, código y precio son obligatorios");
      return;
    }
    if (!detailProductId) return;
    setRegionError("");
    setFailedRegions([]);
    const newRegion = {
      region_id: regionForm.region_id,
      codigo: regionForm.codigo,
      precio: regionForm.precio,
      estado: regionForm.estado,
    };
    pendingRef.current = [...pendingRef.current, newRegion];
    setPendingRegions(pendingRef.current);
    setRegionForm({ region_id: "", codigo: "", precio: "", estado: "PENDIENTE" });
    processRegionQueue();
  }

  function startEditRegion(pr: ProductoRegion) {
    setEditingRegions((prev) => {
      const next = new Set(prev);
      next.add(pr.codigo);
      return next;
    });
    setEditRegionsData((prev) => ({
      ...prev,
      [pr.codigo]: prev[pr.codigo] ?? { codigo: pr.codigo, precio: String(pr.precio), estado: pr.estado },
    }));
  }

  function cancelEditRegion(codigo: string) {
    setEditingRegions((prev) => {
      const next = new Set(prev);
      next.delete(codigo);
      return next;
    });
    setEditRegionsData((prev) => {
      const next = { ...prev };
      delete next[codigo];
      return next;
    });
  }

  async function handleSaveAllRegions() {
    if (!detailProductId || editingRegions.size === 0) return;
    setEditRegionsSaving(true);

    const edits = Array.from(editingRegions).map((codigo) => ({
      codigo,
      data: editRegionsData[codigo],
    })).filter((e) => e.data) as Array<{ codigo: string; data: { precio: string; estado: EstadoRegion } }>;

    const results = await Promise.allSettled(
      edits.map((e) =>
        apiPatch(
          "product/" + detailProductId + "/region/" + encodeURIComponent(e.codigo),
          { precio: Number(e.data.precio), estado: e.data.estado },
        ),
      ),
    );

    const errors = results.filter((r) => r.status === "rejected").length;
    const succeeded = edits.filter((_, i) => results[i].status === "fulfilled");

    const updateList = (list: ProductoRegion[]) =>
      list.map((pr) => {
        const hit = succeeded.find((e) => e.codigo === pr.codigo);
        if (!hit) return pr;
        return { ...pr, precio: Number(hit.data.precio), estado: hit.data.estado };
      });

    setRegionList((prev) => updateList(prev));

    setEditingRegions(new Set());
    setEditRegionsData({});
    setEditRegionsSaving(false);
    if (errors > 0) alert(`${errors} región${errors !== 1 ? "es" : ""} no se pudo guardar`);
  }

  function handleCancelAllRegions() {
    setEditingRegions(new Set());
    setEditRegionsData({});
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const regionTotalPages = Math.max(1, Math.ceil(regionTotal / REGION_PER_PAGE));

  function handleRegionSort(col: "estado" | "codigo" | "precio" | "region") {
    if (regionSortBy === col) {
      setRegionSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setRegionSortBy(col);
      setRegionSortDir("asc");
    }
    setRegionPage(1);
  }

  function renderRegionSortArrow(col: "estado" | "codigo" | "precio" | "region") {
    if (regionSortBy !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1 text-gray-600">{regionSortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Regiones</h1>
          <p className="text-sm text-gray-500">
            {globalRegionTotal} región{globalRegionTotal !== 1 ? "es" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openRegiones}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Productos
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm flex items-center gap-3 ${
            toast.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : toast.type === "loading"
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : "bg-red-50 border-red-200 text-red-600"
          }`}
        >
          {toast.type === "loading" ? (
            <svg className="animate-spin w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : toast.type === "success" ? (
            <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-current opacity-40 hover:opacity-100 shrink-0 cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <input
            type="text"
            placeholder="Buscar por producto, código o región..."
            value={globalRegionSearch}
            onChange={(e) => {
              setGlobalRegionSearch(e.target.value);
              setGlobalRegionPage(1);
              setGlobalRegionCachePage(0);
              setGlobalRegionListCache({});
              globalRegionCacheRef.current = {};
            }}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowGlobalFilters((v) => !v)}
            className={`px-3 py-2 text-sm border rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              showGlobalFilters || globalActiveFilterCount > 0
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros
            {globalActiveFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                {globalActiveFilterCount}
              </span>
            )}
          </button>
          {showGlobalFilters && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl border border-gray-100 shadow-lg z-40 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Filtros</span>
                {globalActiveFilterCount > 0 && (
                  <button
                    onClick={() => {
                      setGlobalFilterEstados(new Set());
                      setGlobalFilterRegion("");
                      setGlobalFilterPrecioMin("");
                      setGlobalFilterPrecioMax("");
                      setGlobalRegionPage(1);
                      setGlobalRegionCachePage(0);
                      setGlobalRegionListCache({});
                      globalRegionCacheRef.current = {};
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Limpiar todo
                  </button>
                )}
              </div>

              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-2">Estado</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {ESTADOS.map((e) => (
                    <label key={e} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={globalFilterEstados.has(e)}
                        onChange={() => {
                          setGlobalFilterEstados((prev) => {
                            const next = new Set(prev);
                            if (next.has(e)) next.delete(e);
                            else next.add(e);
                            return next;
                          });
                          setGlobalRegionPage(1);
                          setGlobalRegionCachePage(0);
                          setGlobalRegionListCache({});
                          globalRegionCacheRef.current = {};
                        }}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600"
                      />
                      <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${ESTADO_COLOR[e]}`}>
                        {ESTADO_LABEL[e]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-2">Región</label>
                <select
                  value={globalFilterRegion}
                  onChange={(e) => {
                    setGlobalFilterRegion(e.target.value);
                    setGlobalRegionPage(1);
                    setGlobalRegionCachePage(0);
                    setGlobalRegionListCache({});
                    globalRegionCacheRef.current = {};
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="">Todas las regiones</option>
                  {regiones.map((r) => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Precio</label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-xs text-gray-400">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Min"
                      value={globalFilterPrecioMin}
                      onChange={(e) => {
                        setGlobalFilterPrecioMin(e.target.value.replace(/\D/g, ""));
                        setGlobalRegionPage(1);
                        setGlobalRegionCachePage(0);
                        setGlobalRegionListCache({});
                        globalRegionCacheRef.current = {};
                      }}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <span className="text-xs text-gray-400">—</span>
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-xs text-gray-400">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Max"
                      value={globalFilterPrecioMax}
                      onChange={(e) => {
                        setGlobalFilterPrecioMax(e.target.value.replace(/\D/g, ""));
                        setGlobalRegionPage(1);
                        setGlobalRegionCachePage(0);
                        setGlobalRegionListCache({});
                        globalRegionCacheRef.current = {};
                      }}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <label className="block text-xs font-medium text-gray-500 mb-2">Ordenar por</label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={globalRegionSortBy}
                    onChange={(e) => {
                      const v = e.target.value as "estado" | "codigo" | "precio" | "region" | "producto";
                      setGlobalRegionSortBy(v);
                      setGlobalRegionSortDir("asc");
                      setGlobalRegionPage(1);
                      setGlobalRegionCachePage(0);
                      setGlobalRegionListCache({});
                      globalRegionCacheRef.current = {};
                    }}
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="producto">Producto</option>
                    <option value="codigo">Código</option>
                    <option value="region">Región</option>
                    <option value="precio">Precio</option>
                    <option value="estado">Estado</option>
                  </select>
                  <button
                    onClick={() => {
                      setGlobalRegionSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      setGlobalRegionPage(1);
                      setGlobalRegionCachePage(0);
                      setGlobalRegionListCache({});
                      globalRegionCacheRef.current = {};
                    }}
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 cursor-pointer"
                    title={globalRegionSortDir === "asc" ? "Ascendente" : "Descendente"}
                  >
                    {globalRegionSortDir === "asc" ? "↑ Asc" : "↓ Desc"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {globalEditingRegions.size > 0 && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-2">
          <span className="text-xs text-blue-700">
            {globalEditingRegions.size} región{globalEditingRegions.size !== 1 ? "es" : ""} en edición
          </span>
          <div className="flex-1" />
          <button
            onClick={handleCancelAllGlobalRegions}
            disabled={globalEditRegionsSaving}
            className="px-3 py-1 text-xs text-gray-600 hover:bg-white/50 rounded transition-colors disabled:opacity-40 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveAllGlobalRegions}
            disabled={globalEditRegionsSaving}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            {globalEditRegionsSaving ? (
              <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Guardando...</>
            ) : (
              `Guardar ${globalEditingRegions.size} cambio${globalEditingRegions.size !== 1 ? "s" : ""}`
            )}
          </button>
        </div>
      )}

      {globalSelectedRegions.size > 0 && !globalEditingRegions.size && canUpdate && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-3 flex-wrap">
          <span className="text-sm text-blue-700 font-medium">
            {globalSelectedRegions.size} seleccionada{globalSelectedRegions.size !== 1 ? "s" : ""}
          </span>
          <select
            value={globalBulkEstado}
            onChange={(e) => setGlobalBulkEstado(e.target.value)}
            disabled={globalBulkLoading}
            className="px-2 py-1.5 text-sm border border-blue-200 rounded bg-white disabled:opacity-50"
          >
            <option value="">Cambiar estado...</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_LABEL[e]}
              </option>
            ))}
          </select>
          <button
            onClick={handleGlobalBulkSetEstado}
            disabled={!globalBulkEstado || globalBulkLoading}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            {globalBulkLoading ? (
              <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Aplicando...</>
            ) : (
              "Aplicar"
            )}
          </button>
        </div>
      )}

      {globalRegionLoading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Cargando...</div>
      ) : globalRegionList.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm">
          {globalRegionSearch || globalFilterEstados.size > 0 ? "Sin resultados" : "No hay regiones"}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="w-10 py-2.5 px-3">
                  <input
                    type="checkbox"
                    disabled={globalBulkLoading || globalEditRegionsSaving || !canUpdate}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setGlobalSelectedRegions(new Set(displayedGlobalRegions.map((pr) => pr.codigo)));
                      } else {
                        setGlobalSelectedRegions(new Set());
                      }
                    }}
                    checked={
                      displayedGlobalRegions.length > 0 &&
                      globalSelectedRegions.size === displayedGlobalRegions.length
                    }
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-500 text-xs w-[130px]">
                  <button onClick={() => handleGlobalRegionSort("producto")} className="inline-flex items-center hover:text-gray-700 cursor-pointer">
                    Producto{renderGlobalRegionSortArrow("producto")}
                  </button>
                </th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-500 text-xs w-[90px]">
                  <button onClick={() => handleGlobalRegionSort("codigo")} className="inline-flex items-center hover:text-gray-700 cursor-pointer">
                    Código{renderGlobalRegionSortArrow("codigo")}
                  </button>
                </th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-500 text-xs w-[100px]">
                  <button onClick={() => handleGlobalRegionSort("region")} className="inline-flex items-center hover:text-gray-700 cursor-pointer">
                    Región{renderGlobalRegionSortArrow("region")}
                  </button>
                </th>
                <th className="text-right py-2.5 px-3 font-medium text-gray-500 text-xs w-[90px]">
                  <button onClick={() => handleGlobalRegionSort("precio")} className="inline-flex items-center hover:text-gray-700 cursor-pointer">
                    Precio{renderGlobalRegionSortArrow("precio")}
                  </button>
                </th>
                <th className="text-right py-2.5 px-3 font-medium text-gray-500 text-xs w-[100px]">
                  <span className="text-gray-400 cursor-default">Precio Oferta</span>
                </th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-500 text-xs w-[110px]">
                  <button onClick={() => handleGlobalRegionSort("estado")} className="inline-flex items-center hover:text-gray-700 cursor-pointer">
                    Estado{renderGlobalRegionSortArrow("estado")}
                  </button>
                </th>
                <th className="w-[60px] py-2.5 px-3" />
                <th className="w-[36px] py-2.5 px-0" />
              </tr>
            </thead>
            <tbody>
              {(() => {
                let lastPid: number | null = null;
                let groupIdx = 0;
                return displayedGlobalRegions.map((pr, idx, arr) => {
                const isEditing = globalEditingRegions.has(pr.codigo);
                const editData = globalEditRegionsData[pr.codigo];
                const productoPadre = (pr as any).producto as { id: number; nombre: string; codigo: string; Categorias?: { nombre: string } | null };
                const isBulkSelected = globalSelectedRegions.has(pr.codigo);
                if (lastPid !== null && pr.producto_id !== lastPid) groupIdx++;
                const isNewGroup = lastPid === null || pr.producto_id !== lastPid;
                const hasNextSameProduct = isNewGroup && idx + 1 < arr.length && arr[idx + 1].producto_id === pr.producto_id;
                const showGroupMarker = hasNextSameProduct && (globalRegionSortBy === "producto" || globalRegionSortBy === "codigo");
                lastPid = pr.producto_id;
                const groupBg = (!globalBulkLoading && !globalEditRegionsSaving && !isBulkSelected)
                  ? ((globalRegionSortBy === "producto" || globalRegionSortBy === "codigo") && groupIdx % 2 === 0 ? "" : (globalRegionSortBy === "producto" || globalRegionSortBy === "codigo") ? "bg-gray-50/50" : "")
                  : "";
                return (
                  <tr key={pr.codigo} className={
                    "border-b border-gray-50 hover:bg-gray-100/50 transition-colors " + groupBg + " " +
                    (globalBulkLoading && isBulkSelected ? "bg-blue-100 animate-pulse" : 
                     globalEditRegionsSaving && isEditing ? "bg-blue-100 animate-pulse" : "")
                  }>
                    <td className="py-2.5 px-3 text-center relative">
                      {showGroupMarker && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-400/60 rounded-r" />
                      )}
                      <input
                        type="checkbox"
                        disabled={globalBulkLoading || globalEditingRegions.size > 0 || globalEditRegionsSaving || !canUpdate}
                        checked={isBulkSelected}
                        onChange={() => {
                          setGlobalSelectedRegions((s) => {
                            const next = new Set(s);
                            if (next.has(pr.codigo)) next.delete(pr.codigo);
                            else next.add(pr.codigo);
                            return next;
                          });
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <span className={"truncate block" + (showGroupMarker ? " font-semibold" : (globalRegionSortBy === "producto" || globalRegionSortBy === "codigo") && !isNewGroup ? " text-gray-400" : "")} title={productoPadre?.nombre ?? ""}>{productoPadre?.nombre ?? "—"}</span>
                      <span className="text-gray-400 text-xs">{productoPadre?.codigo ?? ""}</span>
                    </td>
                    <td className="py-2 px-3 font-mono text-gray-500 text-xs truncate">{pr.codigo}</td>
                    <td className="py-2 px-3 text-gray-900 truncate">{pr.region.nombre}</td>
                    <td className="py-2 px-3 text-right">
                      {isEditing && globalEditRegionsSaving ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                          <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          ${editData?.precio ?? pr.precio.toFixed(2)}
                        </span>
                      ) : isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editData?.precio ?? ""}
                          onChange={(e) =>
                            setGlobalEditRegionsData((prev) => ({
                              ...prev,
                              [pr.codigo]: { ...prev[pr.codigo], precio: e.target.value, estado: prev[pr.codigo]?.estado ?? pr.estado, productoId: prev[pr.codigo]?.productoId ?? productoPadre?.id ?? 0 },
                            }))
                          }
                          className="w-24 px-2 py-1 text-xs text-right border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : (
                        <span className="text-gray-900">${pr.precio.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {(() => {
                        const offer = getBestOffer(pr);
                        if (!offer) return <span className="text-gray-400 text-xs">—</span>;
                        return (
                          <span className="inline-flex flex-col items-end" title={`${offer.oferta.nombre} · ${formatDateRange(offer.oferta.fecha_inicio, offer.oferta.fecha_fin)}`}>
                            <span className="text-green-700 font-medium">${offer.precio.toFixed(2)}</span>
                            <span className="text-[10px] text-gray-400">{formatDateRange(offer.oferta.fecha_inicio, offer.oferta.fecha_fin)}</span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-2 px-3">
                      {isEditing && globalEditRegionsSaving ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-0.5 bg-gray-100 text-gray-400">
                          <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          {ESTADO_LABEL[pr.estado]}
                        </span>
                      ) : isEditing ? (
                        <select
                          value={editData?.estado ?? pr.estado}
                          onChange={(e) =>
                            setGlobalEditRegionsData((prev) => ({
                              ...prev,
                              [pr.codigo]: { ...prev[pr.codigo], precio: prev[pr.codigo]?.precio ?? String(pr.precio), estado: e.target.value as EstadoRegion, productoId: prev[pr.codigo]?.productoId ?? productoPadre?.id ?? 0 },
                            }))
                          }
                          className={`text-xs font-medium rounded-full px-2 py-0.5 border-0 cursor-pointer ${ESTADO_COLOR[editData?.estado ?? pr.estado]}`}
                          style={{ appearance: "auto" }}
                        >
                          {ESTADOS.map((e) => (
                            <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
                          ))}
                        </select>
                      ) : globalBulkLoading && isBulkSelected ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-0.5 bg-gray-100 text-gray-400">
                          <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          {ESTADO_LABEL[pr.estado]}
                        </span>
                      ) : (
                        <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${ESTADO_COLOR[pr.estado]}`}>
                          {ESTADO_LABEL[pr.estado]}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {(globalBulkLoading && isBulkSelected) || (globalEditRegionsSaving && isEditing) ? (
                        <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75 cursor-pointer" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <button
                          onClick={() => {
                          if (isEditing) {
                            setGlobalEditingRegions((prev) => {
                              const next = new Set(prev);
                              next.delete(pr.codigo);
                              return next;
                            });
                            setGlobalEditRegionsData((prev) => {
                              const next = { ...prev };
                              delete next[pr.codigo];
                              return next;
                            });
                          } else {
                            setGlobalEditingRegions((prev) => {
                              const next = new Set(prev);
                              next.add(pr.codigo);
                              return next;
                            });
                            setGlobalEditRegionsData((prev) => ({
                              ...prev,
                              [pr.codigo]: prev[pr.codigo] ?? { precio: String(pr.precio), estado: pr.estado, productoId: productoPadre?.id ?? 0 },
                            }));
                          }
                        }}
                        disabled={globalEditRegionsSaving || !canUpdate}
                        className={`px-2 py-1 text-xs rounded transition-colors cursor-pointer ${
                          isEditing
                            ? "text-red-400 hover:text-red-600 hover:bg-red-50"
                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        } disabled:opacity-40`}
                      >
                        {isEditing ? "Descartar" : "Editar"}
                      </button>
                      )}
                    </td>
                    <td className="py-2 px-0">
                      <button
                        onClick={() => openDetail(pr.producto_id, "regiones")}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                        title="Ver detalle del producto"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })})()}
            </tbody>
          </table>
            </div>
          </div>

          {globalRegionTotal > 0 && (
            <div className="flex items-center justify-between px-1 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  Página {globalRegionPage} de {globalRegionTotalPages}
                </span>
                <select
                  value={showGlobalCustomInput || ![10, 20, 50, 100].includes(globalRegionPerPage) ? -1 : globalRegionPerPage}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v === -1) {
                      setShowGlobalCustomInput(true);
                      setGlobalCustomPerPage("");
                    } else {
                      setShowGlobalCustomInput(false);
                      setGlobalRegionPerPage(v);
                      setGlobalRegionPage(1);
                      setGlobalRegionCachePage(0);
                      setGlobalRegionListCache({});
                      globalRegionCacheRef.current = {};
                    }
                  }}
                  disabled={globalBulkLoading || globalEditRegionsSaving}
                  className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-500 disabled:opacity-40"
                >
                  <option value={10}>10 / pág</option>
                  <option value={20}>20 / pág</option>
                  <option value={50}>50 / pág</option>
                  <option value={100}>100 / pág</option>
                  <option value={-1}>Personalizado...</option>
                </select>
                {(showGlobalCustomInput || ![10, 20, 50, 100].includes(globalRegionPerPage)) && (
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={globalBulkLoading || globalEditRegionsSaving}
                    value={showGlobalCustomInput ? globalCustomPerPage : String(globalRegionPerPage)}
                    onFocus={(e) => {
                      if (!showGlobalCustomInput) {
                        setShowGlobalCustomInput(true);
                        setGlobalCustomPerPage(String(globalRegionPerPage));
                      }
                    }}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setGlobalCustomPerPage(raw);
                    }}
                    onBlur={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (n > 0) { setGlobalRegionPerPage(n); setShowGlobalCustomInput(false); setGlobalRegionPage(1); setGlobalRegionCachePage(0); setGlobalRegionListCache({}); globalRegionCacheRef.current = {}; }
                      else if (n <= 0) { setShowGlobalCustomInput(false); }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const n = parseInt((e.target as HTMLInputElement).value, 10);
                        if (n > 0) { setGlobalRegionPerPage(n); setShowGlobalCustomInput(false); setGlobalRegionPage(1); setGlobalRegionCachePage(0); setGlobalRegionListCache({}); globalRegionCacheRef.current = {}; }
                      }
                    }}
                    className="w-16 text-xs border border-gray-200 rounded px-2 py-1 text-gray-500 disabled:opacity-40"
                  />
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setGlobalRegionPage((p) => Math.max(1, p - 1))}
                  disabled={globalRegionPage === 1 || globalBulkLoading || globalEditRegionsSaving}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setGlobalRegionPage((p) => Math.min(globalRegionTotalPages, p + 1))}
                  disabled={globalRegionPage === globalRegionTotalPages || globalBulkLoading || globalEditRegionsSaving}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          {error}
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-gray-900 mb-4">
              {modal.edit ? "Editar producto" : "Nuevo producto"}
            </h2>
            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs">
                {error}
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Código</label>
                <input
                  value={form.codigo}
                  onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">URL de imagen</label>
                <input
                  value={form.imagenUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imagenUrl: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
                <select
                  value={form.categoria_id}
                  onChange={(e) => setForm((f) => ({ ...f, categoria_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoRegion }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>
                      {ESTADO_LABEL[e]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closeDetail} />
          <div className="relative bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-gray-900 truncate max-w-[280px]" title={detailData?.nombre}>
                {detailData ? detailData.nombre : "Detalle del producto"}
              </h2>
              <div className="flex items-center gap-2 shrink-0">
                {detailContext && detailNavIds.length > 1 && (
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => navigateDetail("prev")}
                      disabled={currentNavIndex <= 0}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Producto anterior"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-xs text-gray-400 tabular-nums min-w-[2rem] text-center">
                      {currentNavIndex + 1}/{detailNavIds.length}
                    </span>
                    <button
                      onClick={() => navigateDetail("next")}
                      disabled={currentNavIndex >= detailNavIds.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Producto siguiente"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
                {(processingRegions || editRegionsSaving) && (
                  <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {processingRegions ? "Enviando..." : "Guardando..."}
                  </span>
                )}
                <button
                  onClick={closeDetail}
                  disabled={processingRegions || editRegionsSaving}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-gray-400 text-sm">Cargando...</div>
            ) : !detailData ? (
              <div className="py-12 text-center text-gray-400 text-sm">Producto no encontrado</div>
            ) : (
              <>
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">Código</span>
                      <p className="text-gray-900 font-mono">{detailData.codigo}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Estado</span>
                      {canUpdate ? (
                        <select
                          value={detailData.estado}
                          disabled={changingStatus.has(detailData.id)}
                          onChange={(e) => handleChangeStatus(detailData.id, e.target.value as EstadoRegion)}
                          className={`text-xs font-medium rounded-full px-2.5 py-0.5 border-0 cursor-pointer ${ESTADO_COLOR[detailData.estado]}`}
                          style={{ appearance: "auto" }}
                        >
                          {ESTADOS.map((e) => (
                            <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
                          ))}
                        </select>
                      ) : (
                        <p>
                          <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${ESTADO_COLOR[detailData.estado]}`}>
                            {ESTADO_LABEL[detailData.estado]}
                          </span>
                        </p>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-400">Categoría</span>
                      <p className="text-gray-900">{detailData.Categorias?.nombre ?? "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Imagen</span>
                      <p className="text-gray-900 truncate">{detailData.imagenUrl ?? "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Oferta</span>
                      {(() => {
                        const allOffers = (detailData.producto_regiones ?? [])
                          .flatMap((pr) => (pr.oferta_producto ?? [])
                            .filter((o) => o.estado === "HABILITADO" && o.oferta.estado === "ACTIVA")
                            .map((o) => ({ ...o, regionCodigo: pr.codigo }))
                          );
                        if (allOffers.length === 0) return <p className="text-gray-900">—</p>;
                        const best = allOffers.reduce((a, b) => (a.precio < b.precio ? a : b));
                        return (
                          <div>
                            <p className="text-green-700 font-medium">${best.precio.toFixed(2)}</p>
                            <p className="text-xs text-gray-400">
                              {best.oferta.nombre} · {formatDateRange(best.oferta.fecha_inicio, best.oferta.fecha_fin)}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <span className="text-gray-400">Creado</span>
                      <p className="text-gray-900 text-xs">
                        {detailData.fecha_creacion
                          ? new Date(detailData.fecha_creacion).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Actualizado</span>
                      <p className="text-gray-900 text-xs">
                        {detailData.fecha_actualizacion
                          ? new Date(detailData.fecha_actualizacion).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900">
                      Regiones ({regionTotal})
                    </h3>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar región..."
                        value={regionSearch}
                        onChange={(e) => {
                          setRegionSearch(e.target.value);
                          setRegionPage(1);
                        }}
                        className="w-44 pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  {editingRegions.size > 0 && (
                    <div className="mb-3 p-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-2">
                      <span className="text-xs text-blue-700">
                        {editingRegions.size} región{editingRegions.size !== 1 ? "es" : ""} en edición
                      </span>
                      <div className="flex-1" />
                      <button
                        onClick={handleCancelAllRegions}
                        disabled={editRegionsSaving}
                        className="px-3 py-1 text-xs text-gray-600 hover:bg-white/50 rounded transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveAllRegions}
                        disabled={editRegionsSaving}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        {editRegionsSaving ? (
                          <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Guardando...</>
                        ) : (
                          `Guardar ${editingRegions.size} cambio${editingRegions.size !== 1 ? "s" : ""}`
                        )}
                      </button>
                    </div>
                  )}

                  {regionLoading ? (
                    <div className="py-8 text-center text-gray-400 text-sm">Cargando regiones...</div>
                  ) : regionList.length === 0 ? (
                    <p className="text-sm text-gray-400 py-8 text-center border border-dashed border-gray-200 rounded-lg">
                      {regionSearch ? "Sin resultados" : "Sin regiones asignadas"}
                    </p>
                  ) : (
                    <>
                      <div className="border border-gray-100 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                              <th className="text-left py-2.5 px-3 font-medium text-gray-500 text-xs">
                                <button onClick={() => handleRegionSort("region")} className="inline-flex items-center hover:text-gray-700 cursor-pointer">
                                  Región{renderRegionSortArrow("region")}
                                </button>
                              </th>
                              <th className="text-left py-2.5 px-3 font-medium text-gray-500 text-xs">
                                <button onClick={() => handleRegionSort("codigo")} className="inline-flex items-center hover:text-gray-700 cursor-pointer">
                                  Código{renderRegionSortArrow("codigo")}
                                </button>
                              </th>
                              <th className="text-right py-2.5 px-3 font-medium text-gray-500 text-xs">
                                <button onClick={() => handleRegionSort("precio")} className="inline-flex items-center hover:text-gray-700 cursor-pointer">
                                  Precio{renderRegionSortArrow("precio")}
                                </button>
                              </th>
                              <th className="text-left py-2.5 px-3 font-medium text-gray-500 text-xs">
                                <button onClick={() => handleRegionSort("estado")} className="inline-flex items-center hover:text-gray-700 cursor-pointer">
                                  Estado{renderRegionSortArrow("estado")}
                                </button>
                              </th>
                              <th className="w-10 py-2.5 px-3" />
                            </tr>
                          </thead>
                          <tbody>
                            {regionList.map((pr) => {
                              const isEditing = editingRegions.has(pr.codigo);
                              const editData = editRegionsData[pr.codigo];
                              return (
                                <tr key={pr.codigo} className={
                                  "border-b border-gray-50 " +
                                  (editRegionsSaving && isEditing ? "bg-blue-100 animate-pulse" : "")
                                }>
                                  <td className="py-2 px-3 text-gray-900">{pr.region.nombre}</td>
                                  <td className="py-2 px-3 font-mono text-gray-500 text-xs">
                                    {isEditing && editRegionsSaving ? (
                                      <span className="text-gray-400">{editData?.codigo ?? pr.codigo}</span>
                                    ) : isEditing ? (
                                      <input
                                        type="text"
                                        value={editData?.codigo ?? ""}
                                        onChange={(e) =>
                                          setEditRegionsData((prev) => ({
                                            ...prev,
                                            [pr.codigo]: {
                                              codigo: e.target.value,
                                              precio: prev[pr.codigo]?.precio ?? String(pr.precio),
                                              estado: prev[pr.codigo]?.estado ?? pr.estado,
                                            },
                                          }))
                                        }
                                        className="w-24 px-1.5 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                      />
                                    ) : (
                                      pr.codigo
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {isEditing && editRegionsSaving ? (
                                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        ${editData?.precio ?? pr.precio.toFixed(2)}
                                      </span>
                                    ) : isEditing ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={editData?.precio ?? ""}
                                        onChange={(e) =>
                                          setEditRegionsData((prev) => ({
                                            ...prev,
                                            [pr.codigo]: { ...prev[pr.codigo], precio: e.target.value, estado: prev[pr.codigo]?.estado ?? pr.estado },
                                          }))
                                        }
                                        className="w-24 px-1.5 py-0.5 text-xs text-right border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                    ) : (
                                      <span className="text-gray-900">${pr.precio.toFixed(2)}</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3">
                                    {isEditing && editRegionsSaving ? (
                                      <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-0.5 bg-gray-100 text-gray-400">
                                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        {ESTADO_LABEL[pr.estado]}
                                      </span>
                                    ) : isEditing ? (
                                      <select
                                        value={editData?.estado ?? pr.estado}
                                        onChange={(e) =>
                                          setEditRegionsData((prev) => ({
                                            ...prev,
                                            [pr.codigo]: { ...prev[pr.codigo], precio: prev[pr.codigo]?.precio ?? String(pr.precio), estado: e.target.value as EstadoRegion },
                                          }))
                                        }
                                        className={`text-xs font-medium rounded-full px-2 py-0.5 border-0 cursor-pointer ${ESTADO_COLOR[editData?.estado ?? pr.estado]}`}
                                        style={{ appearance: "auto" }}
                                      >
                                        {ESTADOS.map((e) => (
                                          <option key={e} value={e}>
                                            {ESTADO_LABEL[e]}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${ESTADO_COLOR[pr.estado]}`}>
                                        {ESTADO_LABEL[pr.estado]}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3">
                                    {editRegionsSaving && isEditing ? (
                                      <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                      </svg>
                                    ) : (
                                      <button
                                        onClick={() => isEditing ? cancelEditRegion(pr.codigo) : startEditRegion(pr)}
                                        disabled={editRegionsSaving || !canUpdate}
                                        className={`px-1.5 py-0.5 text-xs rounded transition-colors disabled:opacity-40 ${
                                          isEditing
                                            ? "text-red-400 hover:text-red-600 hover:bg-red-50"
                                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                        }`}
                                      >
                                        {isEditing ? "Descartar" : "Editar"}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {regionTotalPages > 1 && (
                        <div className="flex items-center justify-between px-1 py-2">
                          <span className="text-xs text-gray-400">
                            Página {regionPage} de {regionTotalPages}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setRegionPage((p) => Math.max(1, p - 1))}
                              disabled={regionPage === 1 || editRegionsSaving}
                              className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                            >
                              Anterior
                            </button>
                            <button
                              onClick={() => setRegionPage((p) => Math.min(regionTotalPages, p + 1))}
                              disabled={regionPage === regionTotalPages || editRegionsSaving}
                              className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                            >
                              Siguiente
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {processingRegions && (
                  <div className="mb-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="font-medium">Enviando {pendingRegions.length} región{pendingRegions.length !== 1 ? "es" : ""} pendiente{pendingRegions.length !== 1 ? "s" : ""}...</span>
                    </div>
                    <p className="text-blue-600 text-xs">No cierres esta pestaña ni el panel hasta que termine.</p>
                  </div>
                )}

                {!processingRegions && pendingRegions.length > 0 && (
                  <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                    <span className="font-medium">{pendingRegions.length} región{pendingRegions.length !== 1 ? "es" : ""} en cola.</span>
                  </div>
                )}

                {failedRegions.length > 0 && (
                  <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
                    <p className="font-medium mb-1">
                      {failedRegions.length} región{failedRegions.length !== 1 ? "es" : ""} no se pudo agregar:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {failedRegions.map((f) => (
                        <li key={f.codigo}>
                          <span className="font-mono">{f.codigo}</span> — {f.error}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => setFailedRegions([])}
                      className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
                    >
                      Descartar avisos
                    </button>
                  </div>
                )}

                {canUpdate && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900">Agregar región</h3>
                    <button
                      type="button"
                      onClick={handleAutoGenerateRegions}
                      disabled={processingRegions}
                      className="px-2.5 py-1 text-xs border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors cursor-pointer"
                      title="Generar automáticamente Arica y Parinacota, Tarapacá y Antofagasta"
                    >
                      Generar 3 regiones
                    </button>
                  </div>
                  {regionError && (
                    <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs">
                      {regionError}
                    </div>
                  )}
                  <form onSubmit={handleAddRegion} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Región</label>
                      <select
                        value={regionForm.region_id}
                        onChange={(e) => setRegionForm((f) => ({ ...f, region_id: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        required
                      >
                        <option value="">Seleccionar región...</option>
                        {regiones.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Código</label>
                        <input
                          value={regionForm.codigo}
                          onChange={(e) => setRegionForm((f) => ({ ...f, codigo: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Precio</label>
                        <input
                          type="number"
                          step="0.01"
                          value={regionForm.precio}
                          onChange={(e) => setRegionForm((f) => ({ ...f, precio: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                      <select
                        value={regionForm.estado}
                        onChange={(e) => setRegionForm((f) => ({ ...f, estado: e.target.value as EstadoRegion }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        {ESTADOS.map((e) => (
                          <option key={e} value={e}>
                            {ESTADO_LABEL[e]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={processingRegions}
                      className="w-full px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {processingRegions ? `Enviando (${pendingRegions.length + 1} en cola)...` : pendingRegions.length > 0 ? `Agregar a cola (${pendingRegions.length + 1})` : "Agregar región"}
                    </button>
                  </form>
                </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {regionesOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closeRegiones} />
          <div className="relative bg-white w-full max-w-6xl h-full overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-gray-900">Productos</h2>
                <p className="text-sm text-gray-500">
                  {total} producto{total !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openCreate}
                  disabled={!canCreate}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  + Nuevo
                </button>
                <button
                  onClick={closeRegiones}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {selected.size > 0 && canUpdate && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-3 flex-wrap">
                <span className="text-sm text-blue-700 font-medium">
                  {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
                </span>
                <select
                  value={bulkEstado}
                  onChange={(e) => setBulkEstado(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-blue-200 rounded bg-white"
                >
                  <option value="">Cambiar estado...</option>
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>
                      {ESTADO_LABEL[e]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBulkSetEstado}
                  disabled={!bulkEstado || bulkLoading}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {bulkLoading ? (
                    <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Aplicando...</>
                  ) : (
                    "Aplicar"
                  )}
                </button>
                <div className="w-px h-5 bg-blue-200" />
                <select
                  value={bulkCategoria}
                  onChange={(e) => setBulkCategoria(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-blue-200 rounded bg-white"
                >
                  <option value="">Asignar categoría...</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBulkSetCategoria}
                  disabled={!bulkCategoria || bulkLoading}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {bulkLoading ? (
                    <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Asignando...</>
                  ) : (
                    "Asignar"
                  )}
                </button>
              </div>
            )}

            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <input
                  type="text"
                  placeholder="Buscar por nombre o código..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                    setCacheApiPage(0);
                    setProductosCache({});
                    productosCacheRef.current = {};
                    setSortBy("estado");
                    setSortDir("asc");
                  }}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className={`px-3 py-2 text-sm border rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                    showFilters || activeFilterCount > 0
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filtros
                  {activeFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                {showFilters && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl border border-gray-100 shadow-lg z-40 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Filtros avanzados</span>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={() => {
                            setFilterEstados(new Set());
                            setFilterCategoria("");
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          Limpiar todo
                        </button>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-500 mb-2">Estado</label>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {ESTADOS.map((e) => (
                          <label key={e} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filterEstados.has(e)}
                              onChange={() => {
                                setFilterEstados((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(e)) next.delete(e);
                                  else next.add(e);
                                  return next;
                                });
                                setPage(1);
                                setCacheApiPage(0);
                                setProductosCache({});
                                productosCacheRef.current = {};
                              }}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600"
                            />
                            <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${ESTADO_COLOR[e]}`}>
                              {ESTADO_LABEL[e]}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">Categoría</label>
                      <select
                        value={filterCategoria}
                        onChange={(e) => {
                          setFilterCategoria(e.target.value);
                          setPage(1);
                          setCacheApiPage(0);
                          setProductosCache({});
                          productosCacheRef.current = {};
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                      >
                        <option value="">Todas las categorías</option>
                        {categorias.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">Ordenar por</label>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={sortBy}
                          onChange={(e) => {
                            const v = e.target.value as SortableColumn;
                            setSortBy(v);
                            setSortDir(v === "fecha_creacion" || v === "fecha_actualizacion" ? "desc" : v === "estado" ? "asc" : "asc");
                            setPage(1);
                            setCacheApiPage(0);
                            setProductosCache({});
                            productosCacheRef.current = {};
                          }}
                          className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                        >
                          <option value="fecha_creacion">Fecha creación</option>
                          <option value="fecha_actualizacion">Fecha actualización</option>
                          <option value="codigo">Código</option>
                          <option value="nombre">Nombre</option>
                          <option value="estado">Estado</option>
                        </select>
                        <button
                          onClick={() => {
                            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                            setPage(1);
                            setCacheApiPage(0);
                            setProductosCache({});
                            productosCacheRef.current = {};
                          }}
                          className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 cursor-pointer"
                          title={sortDir === "asc" ? "Ascendente" : "Descendente"}
                        >
                          {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-gray-400 text-sm">Cargando...</div>
            ) : total === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                No hay productos
              </div>
            ) : (
              <>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm table-fixed min-w-[700px]">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          <th className="w-10 py-3 px-4">
                            <input
                              type="checkbox"
                              disabled={bulkLoading || savingProductId !== null || !canUpdate}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelected(new Set(displayedProductos.map((p) => p.id)));
                                } else {
                                  setSelected(new Set());
                                }
                              }}
                              checked={
                                selected.size === displayedProductos.length && displayedProductos.length > 0
                              }
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                          </th>
                          <th className="text-left py-2.5 px-3 font-medium text-gray-500 w-[80px]">
                            <button onClick={() => handleSort("codigo")} className="inline-flex items-center hover:text-gray-700 transition-colors cursor-pointer">
                              Código{renderSortArrow("codigo")}
                            </button>
                          </th>
                          <th className="text-left py-2.5 px-3 font-medium text-gray-500 min-w-[200px]">
                            <button onClick={() => handleSort("nombre")} className="inline-flex items-center hover:text-gray-700 transition-colors cursor-pointer">
                              Nombre{renderSortArrow("nombre")}
                            </button>
                          </th>
                          <th className="text-left py-2.5 px-3 font-medium text-gray-500 w-[50px] lg:w-[155px]">
                            <button onClick={() => handleSort("estado")} className="inline-flex items-center hover:text-gray-700 transition-colors cursor-pointer">
                              <span className="hidden lg:inline">Estado</span>{renderSortArrow("estado")}
                            </button>
                          </th>
                          <th className="text-left py-2.5 px-3 font-medium text-gray-500 w-[80px]">Categoría</th>
                          <th className="text-left py-2.5 px-3 font-medium text-gray-500 w-[60px]">Regiones</th>
                          <th className="text-center py-2.5 px-3 font-medium text-gray-500 w-[55px]">Oferta</th>
                          <th className="w-[80px] py-2.5 px-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {displayedProductos.map((p) => (
                          <tr
                            key={p.id}
                            className={
                              "border-b border-gray-50 hover:bg-gray-50/50 transition-colors " +
                              (savingProductId === p.id ? "bg-blue-100 animate-pulse" : bulkLoading && selected.has(p.id) ? "bg-blue-100 animate-pulse" : selected.has(p.id) ? "bg-blue-50/50" : "")
                            }
                          >
                            <td className="py-2.5 px-4">
                              <input
                                type="checkbox"
                                disabled={bulkLoading || savingProductId === p.id || !canUpdate}
                                checked={selected.has(p.id)}
                                onChange={() => {
                                  setSelected((s) => {
                                    const next = new Set(s);
                                    if (next.has(p.id)) next.delete(p.id);
                                    else next.add(p.id);
                                    return next;
                                  });
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="py-2 px-3 font-mono text-gray-500 text-xs truncate">{p.codigo}</td>
                            <td className="py-2 px-3 text-gray-900">
                              <span className="truncate block" title={p.nombre}>{p.nombre}</span>
                            </td>
                            <td className="py-2 px-3 relative">
                              <div className="hidden lg:block">
                                {(bulkLoading && selected.has(p.id)) || changingStatus.has(p.id) || savingProductId === p.id ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-0.5 bg-gray-100 text-gray-400">
                                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    {ESTADO_LABEL[p.estado]}
                                  </span>
                                ) : (
                                  <select
                                    value={p.estado}
                                    onChange={(e) => handleChangeStatus(p.id, e.target.value as EstadoRegion)}
                                    disabled={!canUpdate}
                                    className={`text-xs font-medium rounded-full px-2 py-0.5 border-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${ESTADO_COLOR[p.estado]}`}
                                    style={{ appearance: "auto" }}
                                  >
                                    {ESTADOS.map((e) => (
                                      <option key={e} value={e}>
                                        {ESTADO_LABEL[e]}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                              <div className="lg:hidden">
                                {(bulkLoading && selected.has(p.id)) || changingStatus.has(p.id) || savingProductId === p.id ? (
                                  <svg className="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  <button
                                    onClick={() => setEstadoMenuId(estadoMenuId === p.id ? null : p.id)}
                                    disabled={bulkLoading || savingProductId === p.id || !canUpdate}
                                    className={`w-4 h-4 rounded-full border-2 border-white ring-1 ${p.estado === 'HABILITADO' ? 'bg-green-500 ring-green-300' : p.estado === 'PENDIENTE' ? 'bg-amber-500 ring-amber-300' : p.estado === 'DESHABILITADO' ? 'bg-red-500 ring-red-300' : p.estado === 'DESHABILITADO_POR_PRECIO' ? 'bg-purple-500 ring-purple-300' : 'bg-orange-500 ring-orange-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                    title={ESTADO_LABEL[p.estado]}
                                  />
                                )}
                                {estadoMenuId === p.id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setEstadoMenuId(null)} />
                                    <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-gray-100 rounded-lg shadow-lg z-20 py-1">
                                      {ESTADOS.map((e) => (
                                        <button
                                          key={e}
                                          onClick={() => {
                                            handleChangeStatus(p.id, e);
                                            setEstadoMenuId(null);
                                          }}
                                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 ${p.estado === e ? 'font-medium text-gray-900' : 'text-gray-600'}`}
                                        >
                                          <span className={`w-2.5 h-2.5 rounded-full ${e === 'HABILITADO' ? 'bg-green-500' : e === 'PENDIENTE' ? 'bg-amber-500' : e === 'DESHABILITADO' ? 'bg-red-500' : e === 'DESHABILITADO_POR_PRECIO' ? 'bg-purple-500' : 'bg-orange-500'}`} />
                                          {ESTADO_LABEL[e]}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-gray-500 text-xs truncate">
                              {p.Categorias?.nombre ?? "—"}
                            </td>
                            <td className="py-2 px-3 text-gray-500 text-xs">
                              {p.producto_regiones?.length ?? 0}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {hasActiveOffer(p) ? (
                                <span className="text-green-600 font-bold text-xs" title="Tiene oferta activa">Sí</span>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>
                            <td className="py-2 px-3 relative">
                              <div className="hidden lg:flex items-center gap-0.5">
                                {(bulkLoading && selected.has(p.id)) || savingProductId === p.id ? (
                                  <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => openEdit(p)}
                                      disabled={!canUpdate}
                                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                      title="Editar"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => openDetail(p.id, "productos")}
                                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                      title="Detalle"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                      </svg>
                                    </button>
                                  </>
                                )}
                              </div>
                              <div className="lg:hidden">
                                {(bulkLoading && selected.has(p.id)) || savingProductId === p.id ? (
                                  <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  <button
                                    onClick={() => setMenuOpenId(menuOpenId === p.id ? null : p.id)}
                                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                    title="Acciones"
                                  >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                      <circle cx="12" cy="5" r="1.5" />
                                      <circle cx="12" cy="12" r="1.5" />
                                      <circle cx="12" cy="19" r="1.5" />
                                    </svg>
                                  </button>
                                )}
                                {menuOpenId === p.id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                                    <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-100 rounded-lg shadow-lg z-20 py-1">
                                      {canUpdate && (
                                      <button
                                        onClick={() => { setMenuOpenId(null); openEdit(p); }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Editar
                                      </button>
                                      )}
                                      <button
                                        onClick={() => { setMenuOpenId(null); openDetail(p.id, "productos"); }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                        </svg>
                                        Detalle
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {total > 0 && (
                  <div className="flex items-center justify-between px-1 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        Página {page} de {totalPages}
                      </span>
                      <select
                        value={showCustomInput || ![10, 20, 50, 100].includes(perPage) ? -1 : perPage}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (v === -1) {
                            setShowCustomInput(true);
                            setCustomPerPage("");
                          } else {
                            setShowCustomInput(false);
                            setPerPage(v);
                            setPage(1);
                            setCacheApiPage(0);
                            setProductosCache({});
                            productosCacheRef.current = {};
                          }
                        }}
                        disabled={bulkLoading || savingProductId !== null}
                        className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-500 disabled:opacity-40"
                      >
                        <option value={10}>10 / pág</option>
                        <option value={20}>20 / pág</option>
                        <option value={50}>50 / pág</option>
                        <option value={100}>100 / pág</option>
                        <option value={-1}>Personalizado...</option>
                      </select>
                      {(showCustomInput || ![10, 20, 50, 100].includes(perPage)) && (
                        <input
                          type="text"
                          inputMode="numeric"
                          disabled={bulkLoading || savingProductId !== null}
                          value={showCustomInput ? customPerPage : String(perPage)}
                          onFocus={(e) => {
                            if (!showCustomInput) {
                              setShowCustomInput(true);
                              setCustomPerPage(String(perPage));
                            }
                          }}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "");
                            setCustomPerPage(raw);
                          }}
                          onBlur={(e) => {
                            const n = parseInt(e.target.value, 10);
                            if (n > 0) { setPerPage(n); setShowCustomInput(false); setPage(1); setCacheApiPage(0); setProductosCache({}); productosCacheRef.current = {}; }
                            else if (n <= 0) { setShowCustomInput(false); }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const n = parseInt((e.target as HTMLInputElement).value, 10);
                              if (n > 0) { setPerPage(n); setShowCustomInput(false); setPage(1); setCacheApiPage(0); setProductosCache({}); productosCacheRef.current = {}; }
                            }
                          }}
                          className="w-16 text-xs border border-gray-200 rounded px-2 py-1 text-gray-500"
                        />
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || bulkLoading || savingProductId !== null}
                        className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || bulkLoading || savingProductId !== null}
                        className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
