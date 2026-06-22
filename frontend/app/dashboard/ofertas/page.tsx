"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface Oferta {
  id: number;
  nombre: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  productos?: OfertaProducto[];
}

interface OfertaProducto {
  id: number;
  oferta_id: number;
  precio: number;
  region_id: string;
  estado: string;
  region: {
    codigo: string;
    producto_id: number;
    precio: number;
    region_id: number;
    estado: string;
    producto: { id: number; codigo: string; nombre: string };
  };
}

interface ProductoSearch {
  id: number;
  codigo: string;
  nombre: string;
  estado: string;
  Categorias?: { id: number; nombre: string } | null;
}

interface RegionOferta {
  producto_id: number;
  codigo: string;
  precio: number;
  region_id: number;
  estado: string;
  region: { id: number; nombre: string };
}

type EstadoOferta = "ACTIVA" | "INACTIVA" | "EXPIRADA";

const ESTADOS: EstadoOferta[] = ["ACTIVA", "INACTIVA", "EXPIRADA"];

const ESTADO_LABEL: Record<EstadoOferta, string> = {
  ACTIVA: "Activa",
  INACTIVA: "Inactiva",
  EXPIRADA: "Expirada",
};

const ESTADO_COLOR: Record<EstadoOferta, string> = {
  ACTIVA: "bg-green-100 text-green-700",
  INACTIVA: "bg-gray-100 text-gray-600",
  EXPIRADA: "bg-red-100 text-red-700",
};

type SortableColumn = "nombre" | "estado" | "fecha_inicio" | "fecha_fin";

export default function OfertasPage() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [loading, setLoading] = useState(true);
  const [perPage, setPerPage] = useState(20);
  const [customPerPage, setCustomPerPage] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortableColumn>("nombre");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [cacheApiPage, setCacheApiPage] = useState(0);
  const [ofertasCache, setOfertasCache] = useState<Record<number, Oferta[]>>({});
  const ofertasCacheRef = useRef<Record<number, Oferta[]>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [filterEstados, setFilterEstados] = useState<Set<EstadoOferta>>(new Set());

  const activeFilterCount = filterEstados.size;

  const [modal, setModal] = useState<{ open: boolean; edit: Oferta | null }>({
    open: false,
    edit: null,
  });
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    fecha_inicio: "",
    fecha_fin: "",
    hora_inicio: "00:00",
    hora_fin: "00:00",
    estado: "ACTIVA",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "loading" } | null>(null);
  const [changingStatus, setChangingStatus] = useState<Set<number>>(new Set());
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<Oferta | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [productosOferta, setProductosOferta] = useState<OfertaProducto[]>([]);
  const [productosOfertaLoading, setProductosOfertaLoading] = useState(false);
  const [showAddProducto, setShowAddProducto] = useState(false);
  const [productoSearch, setProductoSearch] = useState("");
  const [productoSearchResults, setProductoSearchResults] = useState<ProductoSearch[]>([]);
  const [productoSearchLoading, setProductoSearchLoading] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<ProductoSearch | null>(null);
  const [selectedRegiones, setSelectedRegiones] = useState<RegionOferta[]>([]);
  const [regionesLoading, setRegionesLoading] = useState(false);
  const [regionesSeleccionadas, setRegionesSeleccionadas] = useState<Record<string, string>>({});
  const [removingProductoId, setRemovingProductoId] = useState<number | null>(null);
  const [takenRegiones, setTakenRegiones] = useState<Set<string>>(new Set());
  const [regiones, setRegiones] = useState<{ id: number; nombre: string }[]>([]);
  const [editingProductos, setEditingProductos] = useState<Set<number>>(new Set());
  const [editProductosData, setEditProductosData] = useState<Record<number, string>>({});
  const [editProductosSaving, setEditProductosSaving] = useState(false);
  const [pendingAdditions, setPendingAdditions] = useState<Array<{ region_id: string; precio: number }>>([]);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [failedAdditions, setFailedAdditions] = useState<Array<{ region_id: string; error: string }>>([]);
  const processingRef = useRef(false);
  const pendingRef = useRef<typeof pendingAdditions>([]);
  const detailDataRef = useRef<Oferta | null>(null);
  useEffect(() => { detailDataRef.current = detailData; }, [detailData]);

  function trimCache<T>(cache: Record<number, T>, around: number): Record<number, T> {
    const keep = [around - 1, around, around + 1];
    const trimmed: Record<number, T> = {};
    for (const key of keep) {
      if (cache[key]) trimmed[key] = cache[key];
    }
    return trimmed;
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetchLimit = perPage <= 500 ? perPage * 2 : perPage;
      const apiPage = perPage <= 500 ? Math.floor((page - 1) / 2) + 1 : page;

      if (perPage <= 500 && apiPage === cacheApiPage) {
        setLoading(false);
        return;
      }

      const cached = ofertasCacheRef.current[apiPage];
      if (perPage <= 500 && cached) {
        setOfertas(cached);
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
      const data = await apiGet("oferta/todas?" + q.toString());
      const list: Oferta[] = Array.isArray(data) ? data : data.datos ?? [];
      setOfertas(list);
      setTotal(data.total ?? list.length ?? 0);
      if (perPage <= 500) {
        setCacheApiPage(apiPage);
        const updated = trimCache({ ...ofertasCacheRef.current, [apiPage]: list }, apiPage);
        ofertasCacheRef.current = updated;
        setOfertasCache(updated);
      }
    } catch {
      setError("Error al cargar ofertas");
    } finally {
      setLoading(false);
    }
  }, [page, search, sortBy, sortDir, filterEstados, perPage, cacheApiPage]);

  const displayedOfertas = (() => {
    if (perPage > 500) return ofertas;
    const apiPage = Math.floor((page - 1) / 2) + 1;
    const batch = ofertasCache[apiPage] ?? ofertas;
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

    apiGet("oferta/todas?" + q.toString()).then((data) => {
      const list: Oferta[] = Array.isArray(data) ? data : data.datos ?? [];
      const currentApiPage = Math.floor((page - 1) / 2) + 1;
      const updated = trimCache({ ...ofertasCacheRef.current, [nextApiPage]: list }, currentApiPage);
      ofertasCacheRef.current = updated;
      setOfertasCache(updated);
    }).catch(() => {});
  }, [page, perPage, total, cacheApiPage, search, sortBy, sortDir, filterEstados]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSort(col: SortableColumn) {
    setCacheApiPage(0);
    setOfertasCache({});
    ofertasCacheRef.current = {};
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir(col === "fecha_inicio" || col === "fecha_fin" ? "desc" : "asc");
    }
    setPage(1);
  }

  function renderSortArrow(col: SortableColumn) {
    if (sortBy !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1 text-gray-600">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  function openCreate() {
    setForm({ nombre: "", descripcion: "", fecha_inicio: "", fecha_fin: "", hora_inicio: "00:00", hora_fin: "00:00", estado: "ACTIVA" });
    setModal({ open: true, edit: null });
    setError("");
  }

  function openEdit(o: Oferta) {
    setForm({
      nombre: o.nombre,
      descripcion: o.descripcion,
      fecha_inicio: o.fecha_inicio?.slice(0, 10) ?? "",
      fecha_fin: o.fecha_fin?.slice(0, 10) ?? "",
      hora_inicio: o.fecha_inicio?.slice(11, 16) ?? "00:00",
      hora_fin: o.fecha_fin?.slice(11, 16) ?? "00:00",
      estado: o.estado,
    });
    setModal({ open: true, edit: o });
    setError("");
  }

  function closeModal() {
    setModal({ open: false, edit: null });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre || !form.fecha_inicio || !form.fecha_fin) {
      setError("Nombre y fechas son obligatorios");
      return;
    }
    setError("");
    const isEdit = !!modal.edit;
    const editId = modal.edit?.id ?? null;
    closeModal();
    setSaving(true);
    try {
      const body = {
        nombre: form.nombre,
        descripcion: form.descripcion,
        fecha_inicio: new Date(form.fecha_inicio + "T" + form.hora_inicio).toISOString(),
        fecha_fin: new Date(form.fecha_fin + "T" + form.hora_fin).toISOString(),
        estado: form.estado,
      };
      if (isEdit) {
        setToast({ message: "Guardando oferta...", type: "loading" });
        await apiPatch("oferta/" + editId, body);
        setToast({ message: `Oferta "${form.nombre}" actualizada`, type: "success" });
        setTimeout(() => setToast(null), 4000);
      } else {
        setToast({ message: "Creando oferta...", type: "loading" });
        await apiPost("oferta", { ...body, productos: [] });
        setToast({ message: `Oferta "${form.nombre}" creada`, type: "success" });
        setTimeout(() => setToast(null), 4000);
      }
      setPage(1);
      setCacheApiPage(0);
      setOfertasCache({});
      ofertasCacheRef.current = {};
      load();
    } catch (e: any) {
      setToast({ message: e.message || "Error al guardar", type: "error" });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeStatus(id: number, nuevoEstado: string) {
    setChangingStatus((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      await apiPatch("oferta/" + id, { estado: nuevoEstado });
      setOfertasCache((prev) => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          updated[+key] = updated[+key].map((o) =>
            o.id === id ? { ...o, estado: nuevoEstado } : o
          );
        }
        return updated;
      });
      ofertasCacheRef.current = { ...ofertasCacheRef.current };
      for (const key of Object.keys(ofertasCacheRef.current)) {
        ofertasCacheRef.current[+key] = ofertasCacheRef.current[+key].map((o) =>
          o.id === id ? { ...o, estado: nuevoEstado } : o
        );
      }
      setOfertas((prev) =>
        prev.map((o) => (o.id === id ? { ...o, estado: nuevoEstado } : o))
      );
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

  async function openDetail(id: number) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    setProductosOferta([]);
    setShowAddProducto(false);
    setSelectedProducto(null);
    setSelectedRegiones([]);
    setRegionesSeleccionadas({});
    setTakenRegiones(new Set());
    try {
      const data = await apiGet("oferta/" + id);
      setDetailData(data);
      setProductosOferta(data.productos ?? []);
      if (regiones.length === 0) {
        apiGet("region?limite=100").then((r) => {
          const list = Array.isArray(r) ? r : r.datos ?? r.data ?? [];
          setRegiones(list);
        }).catch(() => {});
      }
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    if (editProductosSaving) {
      if (!confirm("Hay cambios guardándose. ¿Cerrar de todas formas?")) return;
    }
    if (editingProductos.size > 0) {
      if (!confirm("Tenés cambios sin guardar. ¿Cerrar de todas formas?")) return;
    }
    if (pendingAdditions.length > 0 || processingQueue) {
      if (!confirm("Hay regiones pendientes por agregar. ¿Cerrar de todas formas?")) return;
      processingRef.current = false;
      setProcessingQueue(false);
      pendingRef.current = [];
      setPendingAdditions([]);
    }
    setDetailOpen(false);
    setDetailData(null);
    setShowAddProducto(false);
    setSelectedProducto(null);
    setSelectedRegiones([]);
    setRegionesSeleccionadas({});
    setTakenRegiones(new Set());
    setEditingProductos(new Set());
    setEditProductosData({});
    setFailedAdditions([]);
  }

  async function loadProductosOferta() {
    if (!detailData) return;
    setProductosOfertaLoading(true);
    try {
      const data = await apiGet("oferta/" + detailData.id);
      setProductosOferta(data.productos ?? []);
      setDetailData(data);
    } catch {} finally {
      setProductosOfertaLoading(false);
    }
  }

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function searchProductos(q?: string) {
    const query = q ?? productoSearch;
    if (!query.trim() || query.trim().length < 3) {
      setProductoSearchResults([]);
      return;
    }
    setProductoSearchLoading(true);
    try {
      const params = new URLSearchParams({ pagina: "1", limite: "10", orderBy: "nombre", orderDir: "asc" });
      params.set("buscar", query);
      const data = await apiGet("product?" + params.toString());
      const list = Array.isArray(data) ? data : data.datos ?? [];
      setProductoSearchResults(list);
    } catch {} finally {
      setProductoSearchLoading(false);
    }
  }

  async function selectProducto(p: ProductoSearch) {
    setSelectedProducto(p);
    setRegionesLoading(true);
    setSelectedRegiones([]);
    setRegionesSeleccionadas({});
    try {
      const data = await apiGet("product/" + p.id);
      setSelectedRegiones(data.producto_regiones ?? []);
    } catch {} finally {
      setRegionesLoading(false);
    }
  }

  function toggleRegion(codigo: string, precioDefault: number) {
    setRegionesSeleccionadas((prev) => {
      if (prev[codigo]) {
        const next = { ...prev };
        delete next[codigo];
        return next;
      }
      return { ...prev, [codigo]: String(precioDefault) };
    });
  }

  async function processAddQueue() {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessingQueue(true);
    setFailedAdditions([]);
    const ofertaId = detailDataRef.current?.id;
    if (!ofertaId) {
      processingRef.current = false;
      setProcessingQueue(false);
      return;
    }

    const currentProductos = productosOferta.map((op) => ({
      region_id: op.region_id,
      precio: op.precio ?? 0,
    }));

    while (pendingRef.current.length > 0) {
      const item = pendingRef.current[0];
      try {
        await apiPatch("oferta/" + ofertaId, {
          productos: [...currentProductos, item],
        });
        currentProductos.push(item);
      } catch (e: any) {
        setFailedAdditions((prev) => [...prev, { region_id: item.region_id, error: e.message || "Error" }]);
        setTakenRegiones((prev) => {
          const next = new Set(prev);
          next.add(item.region_id);
          return next;
        });
      }
      pendingRef.current = pendingRef.current.slice(1);
      setPendingAdditions(pendingRef.current);
    }

    setProcessingQueue(false);
    processingRef.current = false;
    loadProductosOferta();
  }

  function handleAddProductoRegiones() {
    if (!detailData || !selectedProducto || Object.keys(regionesSeleccionadas).length === 0) return;
    setFailedAdditions([]);
    const newItems = Object.entries(regionesSeleccionadas).map(([codigo, precio]) => ({
      region_id: codigo,
      precio: Number(precio) || 0,
    }));
    pendingRef.current = [...pendingRef.current, ...newItems];
    setPendingAdditions(pendingRef.current);
    setSelectedProducto(null);
    setSelectedRegiones([]);
    setRegionesSeleccionadas({});
    setProductoSearch("");
    setProductoSearchResults([]);
    processAddQueue();
  }

  async function handleRemoveProducto(op: OfertaProducto) {
    if (!detailData) return;
    if (!confirm("¿Quitar " + op.region.producto.nombre + " (" + op.region_id + ") de la oferta?")) return;
    setRemovingProductoId(op.id);
    try {
      const filtered = productosOferta
        .filter((p) => p.id !== op.id)
        .map((p) => ({
          region_id: p.region_id,
          precio: p.precio ?? 0,
        }));
      await apiPatch("oferta/" + detailData.id, { productos: filtered });
      loadProductosOferta();
    } catch (e: any) {
      alert(e.message || "Error al quitar producto");
    } finally {
      setRemovingProductoId(null);
    }
  }

  function startEditProducto(op: OfertaProducto) {
    setEditingProductos((prev) => {
      const next = new Set(prev);
      next.add(op.id);
      return next;
    });
    setEditProductosData((prev) => ({
      ...prev,
      [op.id]: prev[op.id] ?? String(op.precio),
    }));
  }

  function cancelEditProducto(id: number) {
    setEditingProductos((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setEditProductosData((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function handleSaveAllProductos() {
    if (!detailData || editingProductos.size === 0) return;
    setEditProductosSaving(true);
    try {
      const updated = productosOferta.map((op) => {
        if (editingProductos.has(op.id)) {
          return { region_id: op.region_id, precio: Number(editProductosData[op.id]) || 0 };
        }
        return { region_id: op.region_id, precio: op.precio };
      });
      await apiPatch("oferta/" + detailData.id, { productos: updated });
      setEditingProductos(new Set());
      setEditProductosData({});
      loadProductosOferta();
    } catch (e: any) {
      alert(e.message || "Error al guardar");
    } finally {
      setEditProductosSaving(false);
    }
  }

  function handleCancelAllProductos() {
    setEditingProductos(new Set());
    setEditProductosData({});
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta oferta?")) return;
    try {
      await apiDelete("oferta/" + id);
      closeDetail();
      setCacheApiPage(0);
      setOfertasCache({});
      ofertasCacheRef.current = {};
      load();
    } catch (e: any) {
      alert(e.message || "Error al eliminar");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Ofertas</h1>
          <p className="text-sm text-gray-500">{total} oferta{total !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          + Nueva
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
              setCacheApiPage(0);
              setOfertasCache({});
              ofertasCacheRef.current = {};
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
            className={`px-3 py-2 text-sm border rounded-lg transition-colors inline-flex items-center gap-1.5 ${
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
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
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
                          setOfertasCache({});
                          ofertasCacheRef.current = {};
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
                <label className="block text-xs font-medium text-gray-500 mb-2">Ordenar por</label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      const v = e.target.value as SortableColumn;
                      setSortBy(v);
                      setSortDir(v === "fecha_inicio" || v === "fecha_fin" ? "desc" : "asc");
                      setPage(1);
                      setCacheApiPage(0);
                      setOfertasCache({});
                      ofertasCacheRef.current = {};
                    }}
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="nombre">Nombre</option>
                    <option value="fecha_inicio">Fecha inicio</option>
                    <option value="fecha_fin">Fecha fin</option>
                    <option value="estado">Estado</option>
                  </select>
                  <button
                    onClick={() => {
                      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      setPage(1);
                      setCacheApiPage(0);
                      setOfertasCache({});
                      ofertasCacheRef.current = {};
                    }}
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
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

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left py-3 px-4 font-medium text-gray-500">
                  <button onClick={() => handleSort("nombre")} className="inline-flex items-center hover:text-gray-700 transition-colors">
                    Nombre{renderSortArrow("nombre")}
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">
                  <button onClick={() => handleSort("fecha_inicio")} className="inline-flex items-center hover:text-gray-700 transition-colors">
                    Inicio{renderSortArrow("fecha_inicio")}
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">
                  <button onClick={() => handleSort("fecha_fin")} className="inline-flex items-center hover:text-gray-700 transition-colors">
                    Fin{renderSortArrow("fecha_fin")}
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">
                  <button onClick={() => handleSort("estado")} className="inline-flex items-center hover:text-gray-700 transition-colors">
                    Estado{renderSortArrow("estado")}
                  </button>
                </th>
                <th className="w-20 py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400 text-sm">Cargando...</td>
                </tr>
              ) : total === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400 text-sm">
                    {search || filterEstados.size > 0 ? "Sin resultados" : "No hay ofertas"}
                  </td>
                </tr>
              ) : (
                displayedOfertas.map((o) => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 px-4 text-gray-900 font-medium">{o.nombre}</td>
                    <td className="py-2.5 px-4 text-gray-500 font-mono text-xs">
                      {o.fecha_inicio ? new Date(o.fecha_inicio).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 font-mono text-xs">
                      {o.fecha_fin ? new Date(o.fecha_fin).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-2.5 px-4">
                      {changingStatus.has(o.id) ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-0.5 bg-gray-100 text-gray-400">
                          <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          {ESTADO_LABEL[o.estado as EstadoOferta] ?? o.estado}
                        </span>
                      ) : (
                        <select
                          value={o.estado}
                          onChange={(e) => handleChangeStatus(o.id, e.target.value)}
                          className={`text-xs font-medium rounded-full px-2 py-0.5 border-0 cursor-pointer ${ESTADO_COLOR[o.estado as EstadoOferta] ?? "bg-gray-100 text-gray-600"}`}
                          style={{ appearance: "auto" }}
                        >
                          {ESTADOS.map((e) => (
                            <option key={e} value={e}>
                              {ESTADO_LABEL[e]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => openEdit(o)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDetail(o.id)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Detalle"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
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
                    setOfertasCache({});
                    ofertasCacheRef.current = {};
                  }
                }}
                className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-500"
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
                    if (n > 0) { setPerPage(n); setShowCustomInput(false); setPage(1); setCacheApiPage(0); setOfertasCache({}); ofertasCacheRef.current = {}; }
                    else if (n <= 0) { setShowCustomInput(false); }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const n = parseInt((e.target as HTMLInputElement).value, 10);
                      if (n > 0) { setPerPage(n); setShowCustomInput(false); setPage(1); setCacheApiPage(0); setOfertasCache({}); ofertasCacheRef.current = {}; }
                    }
                  }}
                  className="w-16 text-xs border border-gray-200 rounded px-2 py-1 text-gray-500"
                />
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-6 mx-4">
            <h2 className="text-base font-bold text-gray-900 mb-4">
              {modal.edit ? "Editar oferta" : "Nueva oferta"}
            </h2>
            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs">{error}</div>
            )}
            <form onSubmit={handleSave} className="space-y-4">
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Inicio</label>
                  <input
                    type="date"
                    value={form.fecha_inicio}
                    onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                  <input
                    type="time"
                    value={form.hora_inicio}
                    onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))}
                    className="w-full mt-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fin</label>
                  <input
                    type="date"
                    value={form.fecha_fin}
                    onChange={(e) => setForm((f) => ({ ...f, fecha_fin: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                  <input
                    type="time"
                    value={form.hora_fin}
                    onChange={(e) => setForm((f) => ({ ...f, hora_fin: e.target.value }))}
                    className="w-full mt-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="ACTIVA">Activa</option>
                  <option value="INACTIVA">Inactiva</option>
                  <option value="EXPIRADA">Expirada</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closeDetail} />
          <div className="relative bg-white w-full max-w-xl h-full overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-gray-900">
                {detailData ? detailData.nombre : "Detalle de oferta"}
              </h2>
              <button
                onClick={closeDetail}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-gray-400 text-sm">Cargando...</div>
            ) : !detailData ? (
              <div className="py-12 text-center text-gray-400 text-sm">Oferta no encontrada</div>
            ) : (
              <>
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">Nombre</span>
                      <p className="text-gray-900">{detailData.nombre}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Estado</span>
                      <p>
                        <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${ESTADO_COLOR[detailData.estado as EstadoOferta] ?? "bg-gray-100 text-gray-600"}`}>
                          {ESTADO_LABEL[detailData.estado as EstadoOferta] ?? detailData.estado}
                        </span>
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-400">Descripción</span>
                      <p className="text-gray-900">{detailData.descripcion || "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Inicio</span>
                      <p className="text-gray-900 text-xs">
                        {detailData.fecha_inicio
                          ? new Date(detailData.fecha_inicio).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Fin</span>
                      <p className="text-gray-900 text-xs">
                        {detailData.fecha_fin
                          ? new Date(detailData.fecha_fin).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900">
                      Productos ({productosOferta.length})
                    </h3>
                    <button
                      onClick={() => {
                        setShowAddProducto((v) => !v);
                        setSelectedProducto(null);
                        setSelectedRegiones([]);
    setRegionesSeleccionadas({});
                        setProductoSearch("");
                        setProductoSearchResults([]);
                      }}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors inline-flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {showAddProducto ? "Cancelar" : "Agregar"}
                    </button>
                  </div>

                  {showAddProducto && (
                    <div className="mb-4 p-3 border border-blue-100 rounded-lg bg-blue-50/50">
                      <div className="relative mb-2">
                        <input
                          type="text"
                          placeholder="Buscar producto por nombre o código..."
                          value={productoSearch}
                          onChange={(e) => {
                            const v = e.target.value;
                            setProductoSearch(v);
                            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                            if (v.trim().length >= 3) {
                              searchTimeoutRef.current = setTimeout(() => searchProductos(v), 250);
                            } else {
                              setProductoSearchResults([]);
                              setSelectedProducto(null);
                              setSelectedRegiones([]);
                              setRegionesSeleccionadas({});
                            }
                          }}
                          className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>

                      {productoSearchLoading ? (
                        <div className="py-3 text-center text-gray-400 text-xs">Buscando...</div>
                      ) : productoSearchResults.length > 0 ? (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {productoSearchResults.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => selectProducto(p)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                                selectedProducto?.id === p.id
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-100"
                              }`}
                            >
                              <span className="font-medium">{p.nombre}</span>
                              <span className="text-gray-400 ml-1.5 font-mono">{p.codigo}</span>
                            </button>
                          ))}
                        </div>
                      ) : productoSearch.trim() ? (
                        <p className="text-xs text-gray-400 py-2 text-center">Sin resultados</p>
                      ) : null}

                      {selectedProducto && (
                        <div className="mt-3 border-t border-blue-100 pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-700">
                              Regiones de {selectedProducto.nombre}
                            </span>
                            <span className="text-xs text-gray-400">{selectedProducto.codigo}</span>
                          </div>
                          {regionesLoading ? (
                            <div className="py-3 text-center text-gray-400 text-xs">Cargando regiones...</div>
                          ) : selectedRegiones.length === 0 ? (
                            <p className="text-xs text-gray-400 py-2">Sin regiones</p>
                          ) : (
                            <>
                              <div className="space-y-1 max-h-60 overflow-y-auto mb-3">
                                {selectedRegiones.map((pr) => {
                                  const isChecked = pr.codigo in regionesSeleccionadas;
                                  const enEstaOferta = productosOferta.some((op) => op.region_id === pr.codigo);
                                  const enOtraOferta = takenRegiones.has(pr.codigo);
                                  const isTaken = enEstaOferta || enOtraOferta;
                                  return (
                                    <label
                                      key={pr.codigo}
                                      className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                                        isTaken ? "opacity-50 bg-red-50/50" : "hover:bg-white/50 cursor-pointer"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => !isTaken && toggleRegion(pr.codigo, pr.precio)}
                                        disabled={isTaken}
                                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
                                      />
                                      <span className="text-gray-700 font-mono">{pr.codigo}</span>
                                      <span className="text-gray-400">{pr.region.nombre}</span>
                                      <span className="text-gray-400 text-xs">Base ${pr.precio.toFixed(2)}</span>
                                      {isTaken && (
                                        <span className="text-xs ml-auto font-medium text-red-500">
                                          {enEstaOferta ? "Ya en esta oferta" : "Ya en otra oferta"}
                                        </span>
                                      )}
                                      {isChecked && !isTaken && (
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          value={regionesSeleccionadas[pr.codigo]}
                                          onChange={(e) => {
                                            const raw = e.target.value.replace(/[^0-9.]/g, "");
                                            setRegionesSeleccionadas((prev) => ({
                                              ...prev,
                                              [pr.codigo]: raw,
                                            }));
                                          }}
                                          placeholder={String(pr.precio)}
                                          className="w-20 px-1.5 py-0.5 text-xs border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500/20 ml-auto text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      )}
                                    </label>
                                  );
                                })}
                              </div>
                              {(() => {
                                const entries = Object.entries(regionesSeleccionadas);
                                const sinModificar = entries.some(
                                  ([, precio]) => !precio || Number(precio) <= 0
                                );
                                const noModificados = entries.some(([codigo, precio]) => {
                                  const pr = selectedRegiones.find((r) => r.codigo === codigo);
                                  return pr ? precio === String(pr.precio) : false;
                                });
                                const precioMayor = entries.some(([codigo, precio]) => {
                                  const pr = selectedRegiones.find((r) => r.codigo === codigo);
                                  return pr ? Number(precio) >= pr.precio : false;
                                });
                                const disabled = entries.length === 0 || sinModificar || noModificados || precioMayor;
                                return (
                              <button
                                onClick={handleAddProductoRegiones}
                                disabled={disabled}
                                className="w-full px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-1.5"
                              >
                                {processingQueue ? (
                                  <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> {Object.keys(regionesSeleccionadas).length + pendingAdditions.length} en cola</>
                                ) : noModificados ? (
                                  "Modificá el precio antes de agregar"
                                ) : sinModificar ? (
                                  "El precio debe ser mayor a 0"
                                ) : precioMayor ? (
                                  "El precio debe ser menor al base"
                                ) : (
                                  `Agregar ${entries.length} región${entries.length !== 1 ? "es" : ""}`
                                )}
                              </button>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {processingQueue && (
                    <div className="mb-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="font-medium">Agregando {pendingAdditions.length} región{pendingAdditions.length !== 1 ? "es" : ""}...</span>
                      </div>
                      <p className="text-blue-600">No cierres el panel hasta que termine.</p>
                    </div>
                  )}

                  {!processingQueue && pendingAdditions.length > 0 && (
                    <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                      <span className="font-medium">{pendingAdditions.length} región{pendingAdditions.length !== 1 ? "es" : ""} en cola.</span>
                    </div>
                  )}

                  {failedAdditions.length > 0 && !processingQueue && (
                    <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
                      <p className="font-medium mb-1">
                        {failedAdditions.length} región{failedAdditions.length !== 1 ? "es" : ""} no se pudo agregar:
                      </p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {failedAdditions.map((f) => (
                          <li key={f.region_id}>
                            <span className="font-mono">{f.region_id}</span> — {f.error}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => setFailedAdditions([])}
                        className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
                      >
                        Descartar avisos
                      </button>
                    </div>
                  )}

                  {productosOfertaLoading ? (
                    <div className="py-6 text-center text-gray-400 text-xs">Cargando productos...</div>
                  ) : productosOferta.length === 0 ? (
                    <p className="text-xs text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-lg">
                      Sin productos asociados
                    </p>
                  ) : (
                    <>
                      {editingProductos.size > 0 && (
                        <div className="mb-3 p-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-2">
                          <span className="text-xs text-blue-700">
                            {editingProductos.size} producto{editingProductos.size !== 1 ? "s" : ""} en edición
                          </span>
                          <div className="flex-1" />
                          <button
                            onClick={handleCancelAllProductos}
                            disabled={editProductosSaving}
                            className="px-3 py-1 text-xs text-gray-600 hover:bg-white/50 rounded transition-colors disabled:opacity-40"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveAllProductos}
                            disabled={editProductosSaving}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                          >
                            {editProductosSaving ? (
                              <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Guardando...</>
                            ) : (
                              `Guardar ${editingProductos.size} cambio${editingProductos.size !== 1 ? "s" : ""}`
                            )}
                          </button>
                        </div>
                      )}
                      <div className="border border-gray-100 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                              <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs">Producto</th>
                              <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs">Código</th>
                              <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs">Región</th>
                              <th className="text-right py-2 px-3 font-medium text-gray-500 text-xs">P. Base</th>
                              <th className="text-right py-2 px-3 font-medium text-gray-500 text-xs">P. Oferta</th>
                              <th className="text-right py-2 px-3 font-medium text-gray-500 text-xs">% Desc.</th>
                              <th className="w-16 py-2 px-3" />
                            </tr>
                          </thead>
                          <tbody>
                            {productosOferta.map((op) => {
                              const isEditing = editingProductos.has(op.id);
                              return (
                                <tr key={op.id} className={
                                  "border-b border-gray-50 " +
                                  (removingProductoId === op.id || (editProductosSaving && isEditing) ? "opacity-50" : "")
                                }>
                                  <td className="py-2 px-3 text-gray-900 text-xs">
                                    {op.region.producto.nombre}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-gray-500 text-xs">{op.region_id}</td>
                                  <td className="py-2 px-3 text-gray-500 text-xs">
                                    {regiones.find((r) => r.id === op.region.region_id)?.nombre ?? `#${op.region.region_id}`}
                                  </td>
                                  <td className="py-2 px-3 text-gray-500 text-xs text-right">
                                    ${op.region.precio.toFixed(2)}
                                  </td>
                                  <td className="py-2 px-3 text-xs text-right">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={editProductosData[op.id] ?? ""}
                                        onChange={(e) =>
                                          setEditProductosData((prev) => ({
                                            ...prev,
                                            [op.id]: e.target.value,
                                          }))
                                        }
                                        className="w-20 px-1.5 py-0.5 text-xs border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500/20 text-right"
                                      />
                                    ) : (
                                      <span className="text-gray-900 font-medium">${op.precio.toFixed(2)}</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-xs text-right">
                                    <span className={
                                      op.region.precio > 0 && op.precio < op.region.precio
                                        ? "text-green-600 font-medium"
                                        : "text-gray-400"
                                    }>
                                      {op.region.precio > 0
                                        ? `-${(((op.region.precio - op.precio) / op.region.precio) * 100).toFixed(0)}%`
                                        : "—"}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3">
                                    {editProductosSaving && isEditing ? (
                                      <svg className="animate-spin w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                      </svg>
                                    ) : removingProductoId === op.id ? (
                                      <svg className="animate-spin w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                      </svg>
                                    ) : (
                                      <div className="flex items-center gap-0.5">
                                        <button
                                          onClick={() => isEditing ? cancelEditProducto(op.id) : startEditProducto(op)}
                                          disabled={editProductosSaving || removingProductoId !== null}
                                          className={`px-1.5 py-0.5 text-xs rounded transition-colors disabled:opacity-40 ${
                                            isEditing
                                              ? "text-red-400 hover:text-red-600 hover:bg-red-50"
                                              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                          }`}
                                        >
                                          {isEditing ? "Descartar" : "Editar"}
                                        </button>
                                        {!isEditing && (
                                          <button
                                            onClick={() => handleRemoveProducto(op)}
                                            disabled={editProductosSaving || removingProductoId !== null}
                                            className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                                            title="Quitar"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

              </>
            )}
          </div>
        </div>
      )}

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
          <button onClick={() => setToast(null)} className="ml-2 text-current opacity-40 hover:opacity-100 shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
