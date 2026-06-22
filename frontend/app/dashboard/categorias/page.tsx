"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface Categoria {
  id: number;
  nombre: string;
  parent_id: number | null;
  Parent?: { id: number; nombre: string } | null;
}

const PER_PAGE = 20;

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [allCats, setAllCats] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState<{ open: boolean; edit: Categoria | null }>({
    open: false,
    edit: null,
  });
  const [form, setForm] = useState({ nombre: "", parent_id: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ pagina: String(page), limite: String(PER_PAGE) });
      const data = await apiGet("category?" + q.toString());
      setCategorias(Array.isArray(data) ? data : data.datos ?? []);
      setTotal(data.total ?? data.length ?? 0);
    } catch {
      setError("Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  }, [page]);

  const loadAll = useCallback(async () => {
    try {
      const data = await apiGet("category?limite=1000");
      setAllCats(Array.isArray(data) ? data : data.datos ?? []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadAll(); }, [loadAll]);

  function openCreate() {
    setForm({ nombre: "", parent_id: "" });
    setModal({ open: true, edit: null });
    setError("");
  }

  function openEdit(c: Categoria) {
    setForm({
      nombre: c.nombre,
      parent_id: c.parent_id?.toString() ?? "",
    });
    setModal({ open: true, edit: c });
    setError("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre) { setError("Nombre obligatorio"); return; }
    setSaving(true);
    setError("");
    try {
      const body = {
        nombre: form.nombre,
        parent_id: form.parent_id ? Number(form.parent_id) : undefined,
      };
      if (modal.edit) {
        await apiPatch("category/" + modal.edit.id, body);
      } else {
        await apiPost("category", body);
      }
      setModal({ open: false, edit: null });
      load();
      loadAll();
    } catch (e: any) {
      setError(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      await apiDelete("category/" + id);
      load();
      loadAll();
    } catch (e: any) {
      alert(e.message || "Error al eliminar");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Categorías</h1>
          <p className="text-sm text-gray-500">{total} categoría{total !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          + Nueva
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Nombre</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Padre</th>
                <th className="w-20 py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-gray-400 text-sm">Cargando...</td>
                </tr>
              ) : categorias.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-gray-400 text-sm">No hay categorías</td>
                </tr>
              ) : (
                categorias.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 px-4 text-gray-900">{c.nombre}</td>
                    <td className="py-2.5 px-4 text-gray-400">{c.Parent?.nombre ?? "—"}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
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
              {modal.edit ? "Editar categoría" : "Nueva categoría"}
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoría padre</label>
                <select
                  value={form.parent_id}
                  onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Ninguna (raíz)</option>
                  {allCats
                    .filter((c) => c.id !== modal.edit?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setModal({ open: false, edit: null })}
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
    </div>
  );
}
