"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface Rol {
  id: number;
  nombre: string;
}

interface Permiso {
  id: number;
  nombre: string;
}

const PER_PAGE = 20;

export default function RolesPage() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [rolePermisos, setRolePermisos] = useState<Record<number, Permiso[]>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState<{ open: boolean; edit: Rol | null }>({
    open: false,
    edit: null,
  });
  const [form, setForm] = useState({ nombre: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [permisoModal, setPermisoModal] = useState<{
    open: boolean;
    rolId: number;
    rolNombre: string;
    assigned: Permiso[];
  }>({ open: false, rolId: 0, rolNombre: "", assigned: [] });
  const [permisoForm, setPermisoForm] = useState({ nombre: "" });
  const [selectedPermisos, setSelectedPermisos] = useState<Set<number>>(new Set());
  const [permisoLoading, setPermisoLoading] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ pagina: String(page), limite: String(PER_PAGE) });
      const data = await apiGet("rol?" + q.toString());
      const list = Array.isArray(data) ? data : data.datos ?? [];
      setRoles(list);
      setTotal(data.total ?? list.length ?? 0);
    } catch {
      setError("Error al cargar roles");
    } finally {
      setLoading(false);
    }
  }, [page]);

  const loadPermisos = useCallback(async () => {
    try {
      const data = await apiGet("permiso?limite=1000");
      console.log(data);

      setPermisos(Array.isArray(data) ? data : data.datos ?? []);
    } catch {}
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);
  useEffect(() => { loadPermisos(); }, [loadPermisos]);

  function openCreate() {
    setForm({ nombre: "" });
    setModal({ open: true, edit: null });
    setError("");
  }

  function openEdit(r: Rol) {
    setForm({ nombre: r.nombre });
    setModal({ open: true, edit: r });
    setError("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre) { setError("Nombre obligatorio"); return; }
    setSaving(true);
    setError("");
    try {
      if (modal.edit) {
        await apiPatch("rol/" + modal.edit.id, { nombre: form.nombre });
      } else {
        await apiPost("rol", { nombre: form.nombre });
      }
      setModal({ open: false, edit: null });
      loadRoles();
    } catch (e: any) {
      setError(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este rol?")) return;
    try {
      await apiDelete("rol/" + id);
      loadRoles();
    } catch (e: any) {
      alert(e.message || "Error al eliminar");
    }
  }

  async function openPermisos(rol: Rol) {
    setPermisoLoading(true);
    setSelectedPermisos(new Set());
    try {
      const data = await apiGet(`rol/${rol.id}/permiso`);      
      const raw = Array.isArray(data) ? data : data.data ?? [];
      const assigned: Permiso[] = raw.map((item: any) => item.permiso ?? item);
      setPermisoModal({ open: true, rolId: rol.id, rolNombre: rol.nombre, assigned });
    } catch {
      setPermisoModal({ open: true, rolId: rol.id, rolNombre: rol.nombre, assigned: [] });
    } finally {
      setPermisoLoading(false);
    }
  }

  async function assignPermisos() {
    if (selectedPermisos.size === 0) return;
    setAssignSaving(true);
    let errors = 0;
    const ids = Array.from(selectedPermisos);
    const results = await Promise.allSettled(
      ids.map((id) =>
        apiPost(`rol/${permisoModal.rolId}/permiso`, { permiso_id: id }),
      ),
    );
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        const p = permisos.find((x) => x.id === ids[i]);
        if (p) {
          setPermisoModal((m) => ({ ...m, assigned: [...m.assigned, p] }));
        }
      } else {
        errors++;
      }
    });
    setSelectedPermisos(new Set());
    setAssignSaving(false);
    if (errors > 0) alert(`${errors} permiso${errors !== 1 ? "s" : ""} no se pudo asignar`);
  }

  async function removePermiso(permisoId: number) {
    try {
      await apiDelete(`rol/${permisoModal.rolId}/permiso/${permisoId}`);
      setPermisoModal((m) => ({
        ...m,
        assigned: m.assigned.filter((x) => x.id !== permisoId),
      }));
    } catch (e: any) {
      alert(e.message || "Error");
    }
  }

  async function createPermiso() {
    if (!permisoForm.nombre) return;
    try {
      await apiPost("permiso", { nombre: permisoForm.nombre });
      setPermisoForm({ nombre: "" });
      loadPermisos();
    } catch (e: any) {
      alert(e.message || "Error al crear permiso");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Roles y permisos</h1>
          <p className="text-sm text-gray-500">{total} rol{total !== 1 ? "es" : ""}</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          + Nuevo rol
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
                <th className="text-left py-3 px-4 font-medium text-gray-500">Rol</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Permisos</th>
                <th className="w-40 py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-gray-400 text-sm">Cargando...</td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-gray-400 text-sm">No hay roles</td>
                </tr>
              ) : (
                roles.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 px-4 text-gray-900 font-medium">{r.nombre}</td>
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => openPermisos(r)}
                        disabled={permisoLoading}
                        className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        {permisoLoading ? (
                          <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Cargando...</>
                        ) : (
                          "Gestionar permisos"
                        )}
                      </button>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(r)}
                          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
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
              {modal.edit ? "Editar rol" : "Nuevo rol"}
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

      {permisoModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setPermisoModal({ open: false, rolId: 0, rolNombre: "", assigned: [] })}>
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-6 mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-gray-900 mb-1">
              Permisos de {permisoModal.rolNombre}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {permisoModal.assigned.length} permiso{permisoModal.assigned.length !== 1 ? "s" : ""} asignado{permisoModal.assigned.length !== 1 ? "s" : ""}
            </p>

            <div className="mb-4">
              <div className="mb-2 text-xs font-medium text-gray-600">Permisos disponibles</div>
              <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2">
                {permisos
                  .filter((p) => !permisoModal.assigned.find((a) => a?.id === p.id))
                  .map((p) => (
                    <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={selectedPermisos.has(p.id)}
                        onChange={() => {
                          setSelectedPermisos((prev) => {
                            const next = new Set(prev);
                            next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                            return next;
                          });
                        }}
                        disabled={assignSaving}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-gray-700 font-mono text-xs">{p.nombre}</span>
                    </label>
                  ))}
                {permisos.filter((p) => !permisoModal.assigned.find((a) => a?.id === p.id)).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">Todos los permisos ya están asignados</p>
                )}
              </div>
              <button
                onClick={assignPermisos}
                disabled={selectedPermisos.size === 0 || assignSaving}
                className="mt-2 w-full px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                {assignSaving ? (
                  <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Asignando...</>
                ) : (
                  `Asignar ${selectedPermisos.size > 0 ? `(${selectedPermisos.size})` : ""}`
                )}
              </button>
            </div>

            {permisoModal.assigned.length > 0 && (
              <div className="mb-4 space-y-1">
                {permisoModal.assigned.filter((p) => p).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm"
                  >
                    <span className="text-gray-800 font-mono text-xs">{p.nombre}</span>
                    <button
                      onClick={() => removePermiso(p.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 mb-4">
              <p className="text-xs font-medium text-gray-600 mb-2">Crear nuevo permiso</p>
              <div className="flex gap-2">
                <input
                  value={permisoForm.nombre}
                  onChange={(e) => setPermisoForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="ej: reportes:exportar"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                  onClick={createPermiso}
                  disabled={!permisoForm.nombre}
                  className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  Crear
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPermisoModal({ open: false, rolId: 0, rolNombre: "", assigned: [] })}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
