"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

type EstadoUsuario = "pendiente" | "confirmado" | "deshabilitado";

const ESTADOS_USUARIO: EstadoUsuario[] = ["pendiente", "confirmado", "deshabilitado"];

const ESTADO_LABEL: Record<EstadoUsuario, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  deshabilitado: "Deshabilitado",
};

const ESTADO_COLOR: Record<EstadoUsuario, string> = {
  pendiente: "bg-yellow-50 text-yellow-700",
  confirmado: "bg-green-50 text-green-700",
  deshabilitado: "bg-red-50 text-red-700",
};

interface Usuario {
  id: number;
  nombre_usuario: string;
  correo: string;
  estado: string;
  fecha_creacion: string;
  image_url: string | null;
  usuarios_roles: Array<{
    tipo_rol: { id: number; nombre: string };
  }>;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [customPerPage, setCustomPerPage] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [search, setSearch] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const [filterEstados, setFilterEstados] = useState<Set<EstadoUsuario>>(new Set());
  const [sortBy, setSortBy] = useState("fecha_creacion");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const activeFilterCount = filterEstados.size;

  const [modal, setModal] = useState<{ open: boolean; edit: Usuario | null }>({ open: false, edit: null });
  const [form, setForm] = useState({ nombre_usuario: "", correo: "", contrasena: "", estado: "pendiente" });
  const [saving, setSaving] = useState(false);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "loading" } | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<Usuario | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [allRoles, setAllRoles] = useState<Array<{ id: number; nombre: string }>>([]);
  const [roleAssignId, setRoleAssignId] = useState("");
  const [roleActionLoading, setRoleActionLoading] = useState(false);

  const [actividades, setActividades] = useState<any[]>([]);
  const [actividadesLoading, setActividadesLoading] = useState(false);
  const [actividadesPage, setActividadesPage] = useState(1);
  const [actividadesTotal, setActividadesTotal] = useState(0);
  const ACTIVIDADES_PER_PAGE = 10;
  const [detalleModal, setDetalleModal] = useState<object | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ pagina: String(page), limite: String(perPage), orderBy: sortBy, orderDir: sortDir });
      if (search) q.set("buscar", search);
      if (filterEstados.size > 0) q.set("estado", Array.from(filterEstados).join(","));
      const data = await apiGet("users?" + q.toString());
      setUsuarios(Array.isArray(data) ? data : data.datos ?? []);
      setTotal(data.total ?? data.length ?? 0);
    } catch {
      setError("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, filterEstados, sortBy, sortDir]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  function openCreate() {
    setForm({ nombre_usuario: "", correo: "", contrasena: "", estado: "pendiente" });
    setModal({ open: true, edit: null });
    setError("");
  }

  function openEdit(u: Usuario) {
    setForm({ nombre_usuario: u.nombre_usuario, correo: u.correo, contrasena: "", estado: u.estado });
    setModal({ open: true, edit: u });
    setError("");
  }

  function closeModal() {
    setModal({ open: false, edit: null });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre_usuario || !form.correo || (!modal.edit && !form.contrasena)) {
      setError("Completá todos los campos obligatorios");
      return;
    }
    setError("");
    const editId = modal.edit?.id ?? null;
    const originalUser = modal.edit;
    if (editId) setSavingUserId(editId);
    closeModal();
    setSaving(true);
    try {
      const body: Record<string, unknown> = { nombre_usuario: form.nombre_usuario, correo: form.correo, estado: form.estado };
      if (form.contrasena) body.contrasena = form.contrasena;
      if (editId && originalUser) {
        await apiPatch("users/" + editId, body);
        const updated: Usuario = { ...originalUser, ...body } as unknown as Usuario;
        setUsuarios((prev) => prev.map((u) => (u.id === editId ? updated : u)));
      } else {
        setToast({ message: "Creando usuario...", type: "loading" });
        await apiPost("users", body);
        setToast({ message: `Usuario "${form.nombre_usuario || form.correo}" creado`, type: "success" });
        setTimeout(() => setToast(null), 4000);
        load();
      }
    } catch (e: any) {
      setError(e.message || "Error al guardar");
      setToast({ message: e.message || "Error al guardar", type: "error" });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSaving(false);
      setSavingUserId(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este usuario?")) return;
    try {
      await apiDelete("users/" + id);
      load();
    } catch (e: any) {
      alert(e.message || "Error al eliminar");
    }
  }

  async function openDetail(u: Usuario) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    setRoleAssignId("");
    setActividadesPage(1);
    try {
      const [userData, rolesData] = await Promise.all([
        apiGet("users/" + u.id),
        apiGet("rol?limite=100"),
      ]);
      setDetailData(userData);
      setAllRoles(Array.isArray(rolesData) ? rolesData : rolesData.datos ?? []);
      loadActividades(u.id, 1);
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadActividades(userId: number, pageNum: number) {
    setActividadesLoading(true);
    try {
      const q = new URLSearchParams({ usuario_id: String(userId), pagina: String(pageNum), limite: String(ACTIVIDADES_PER_PAGE) });
      const data = await apiGet("registro-actividades?" + q.toString());
      const list = Array.isArray(data) ? data : data.datos ?? [];
      setActividades(list);
      setActividadesTotal(data.total ?? list.length ?? 0);
    } catch {} finally {
      setActividadesLoading(false);
    }
  }

  function closeDetail() {
    setDetailOpen(false);
    setDetailData(null);
    setRoleAssignId("");
  }

  async function assignRole() {
    if (!roleAssignId || !detailData) return;
    setRoleActionLoading(true);
    try {
      await apiPost(`users/${detailData.id}/rol`, { rol_id: Number(roleAssignId) });
      const fresh = await apiGet("users/" + detailData.id);
      setDetailData(fresh);
      setUsuarios((prev) => prev.map((u) => (u.id === fresh.id ? fresh : u)));
      setRoleAssignId("");
    } catch (e: any) {
      alert(e.message || "Error al asignar rol");
    } finally {
      setRoleActionLoading(false);
    }
  }

  async function removeRole(rolId: number) {
    if (!detailData) return;
    setRoleActionLoading(true);
    try {
      await apiDelete(`users/${detailData.id}/rol/${rolId}`);
      const fresh = await apiGet("users/" + detailData.id);
      setDetailData(fresh);
      setUsuarios((prev) => prev.map((u) => (u.id === fresh.id ? fresh : u)));
    } catch (e: any) {
      alert(e.message || "Error al quitar rol");
    } finally {
      setRoleActionLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500">{total} usuario{total !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          + Nuevo
        </button>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm flex items-center gap-3 ${
          toast.type === "success" ? "bg-green-50 border-green-200 text-green-700" :
          toast.type === "loading" ? "bg-blue-50 border-blue-200 text-blue-700" :
          "bg-red-50 border-red-200 text-red-600"
        }`}>
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

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              disabled={savingUserId !== null}
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
              showFilters || activeFilterCount > 0 ? "bg-blue-50 border-blue-200 text-blue-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"
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
            <div className="absolute top-full right-0 mt-2 w-60 bg-white rounded-xl border border-gray-100 shadow-lg z-40 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Filtros</span>
                {activeFilterCount > 0 && (
                  <button onClick={() => { setFilterEstados(new Set()); setPage(1); }} className="text-xs text-blue-600 hover:text-blue-800">
                    Limpiar
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Estado</label>
                <div className="space-y-1.5">
                  {ESTADOS_USUARIO.map((e) => (
                    <label key={e} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterEstados.has(e)}
                        onChange={() => {
                          setFilterEstados((prev) => { const next = new Set(prev); next.has(e) ? next.delete(e) : next.add(e); return next; });
                          setPage(1);
                        }}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600"
                      />
                      <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${ESTADO_COLOR[e]}`}>{ESTADO_LABEL[e]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-500 mb-2">Ordenar por</label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setSortDir(e.target.value === "fecha_creacion" ? "desc" : "asc");
                      setPage(1);
                    }}
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="fecha_creacion">Fecha creación</option>
                    <option value="nombre_usuario">Nombre</option>
                    <option value="correo">Correo</option>
                    <option value="estado">Estado</option>
                  </select>
                  <button
                    onClick={() => { setSortDir((d) => (d === "asc" ? "desc" : "asc")); setPage(1); }}
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
          <table className="w-full text-sm table-fixed min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left py-2.5 px-3 font-medium text-gray-500">Usuario</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-500">Correo</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-500">Roles</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-500 w-[90px]">Creado</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-500 w-[115px]">Estado</th>
                <th className="w-[80px] py-2.5 px-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">Cargando...</td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                    {search || filterEstados.size > 0 ? "Sin resultados" : "No hay usuarios"}
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${savingUserId === u.id ? "bg-blue-100 animate-pulse" : ""}`}>
                    <td className="py-2 px-3 text-gray-900 font-medium truncate">{u.nombre_usuario}</td>
                    <td className="py-2 px-3 text-gray-500 truncate">{u.correo}</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {u.usuarios_roles?.length > 0
                          ? u.usuarios_roles.map((ur, i) => (
                              <span key={i} className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                {ur.tipo_rol.nombre}
                              </span>
                            ))
                          : <span className="text-gray-400 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-gray-500 text-xs">
                      {u.fecha_creacion
                        ? new Date(u.fecha_creacion).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="py-2 px-3">
                      {savingUserId === u.id ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-0.5 bg-gray-100 text-gray-400">
                          <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          {ESTADO_LABEL[u.estado as EstadoUsuario] ?? u.estado}
                        </span>
                      ) : (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLOR[u.estado as EstadoUsuario] ?? "bg-gray-50 text-gray-600"}`}>
                          {ESTADO_LABEL[u.estado as EstadoUsuario] ?? u.estado}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {savingUserId === u.id ? (
                        <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => openEdit(u)} disabled={savingUserId !== null} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-40" title="Editar">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => openDetail(u)} disabled={savingUserId !== null} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-40" title="Detalle">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
            <select
              value={showCustomInput || ![10, 20, 50, 100].includes(perPage) ? -1 : perPage}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v === -1) { setShowCustomInput(true); setCustomPerPage(""); }
                else { setShowCustomInput(false); setPerPage(v); setPage(1); }
              }}
              disabled={savingUserId !== null}
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
                disabled={savingUserId !== null}
                value={showCustomInput ? customPerPage : String(perPage)}
                onFocus={(e) => { if (!showCustomInput) { setShowCustomInput(true); setCustomPerPage(String(perPage)); } }}
                onChange={(e) => setCustomPerPage(e.target.value.replace(/\D/g, ""))}
                onBlur={(e) => { const n = parseInt(e.target.value, 10); if (n > 0) { setPerPage(n); setShowCustomInput(false); setPage(1); } else if (n <= 0) { setShowCustomInput(false); } }}
                onKeyDown={(e) => { if (e.key === "Enter") { const n = parseInt((e.target as HTMLInputElement).value, 10); if (n > 0) { setPerPage(n); setShowCustomInput(false); setPage(1); } } }}
                className="w-16 text-xs border border-gray-200 rounded px-2 py-1 text-gray-500 disabled:opacity-40"
              />
            )}
          </div>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || savingUserId !== null}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors">
              Anterior
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || savingUserId !== null}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors">
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-6 mx-4">
            <h2 className="text-base font-bold text-gray-900 mb-4">{modal.edit ? "Editar usuario" : "Nuevo usuario"}</h2>
            {error && <div className="mb-4 p-2.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs">{error}</div>}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre de usuario</label>
                <input value={form.nombre_usuario} onChange={(e) => setForm((f) => ({ ...f, nombre_usuario: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Correo</label>
                <input type="email" value={form.correo} onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña {modal.edit && "(dejar vacío para no cambiar)"}</label>
                <input type="password" value={form.contrasena} onChange={(e) => setForm((f) => ({ ...f, contrasena: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" required={!modal.edit} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                <select value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="deshabilitado">Deshabilitado</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail slide-out */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closeDetail} />
          <div className="relative bg-white w-full max-w-xl h-full overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-gray-900">{detailData?.nombre_usuario ?? "Detalle del usuario"}</h2>
              <button onClick={closeDetail} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {detailLoading ? (
              <div className="py-12 text-center text-gray-400 text-sm">Cargando...</div>
            ) : !detailData ? (
              <div className="py-12 text-center text-gray-400 text-sm">Usuario no encontrado</div>
            ) : (
              <>
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">Usuario</span>
                      <p className="text-gray-900 font-medium">{detailData.nombre_usuario}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Correo</span>
                      <p className="text-gray-900">{detailData.correo}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Estado</span>
                      <p>
                        <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${ESTADO_COLOR[detailData.estado as EstadoUsuario] ?? "bg-gray-50 text-gray-600"}`}>
                          {ESTADO_LABEL[detailData.estado as EstadoUsuario] ?? detailData.estado}
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Creado</span>
                      <p className="text-gray-900 text-xs">
                        {detailData.fecha_creacion
                          ? new Date(detailData.fecha_creacion).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Roles ({detailData.usuarios_roles?.length ?? 0})</h3>

                  <div className="mb-3 flex gap-2">
                    <select
                      value={roleAssignId}
                      onChange={(e) => setRoleAssignId(e.target.value)}
                      disabled={roleActionLoading}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value="">Asignar rol...</option>
                      {allRoles
                        .filter((r) => !detailData.usuarios_roles?.find((ur) => ur.tipo_rol.id === r.id))
                        .map((r) => (
                          <option key={r.id} value={r.id}>{r.nombre}</option>
                        ))}
                    </select>
                    <button
                      onClick={assignRole}
                      disabled={!roleAssignId || roleActionLoading}
                      className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                    >
                      {roleActionLoading ? (
                        <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Asignando...</>
                      ) : "Asignar"}
                    </button>
                  </div>

                  {detailData.usuarios_roles?.length > 0 ? (
                    <div className="space-y-1">
                      {detailData.usuarios_roles.map((ur, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                          <span className="text-gray-800 font-mono text-xs">{ur.tipo_rol.nombre}</span>
                          <button
                            onClick={() => removeRole(ur.tipo_rol.id)}
                            disabled={roleActionLoading}
                            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">Sin roles asignados</p>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4 mt-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Actividad ({actividadesTotal})</h3>
                  {actividadesLoading ? (
                    <div className="py-8 text-center text-gray-400 text-sm">Cargando...</div>
                  ) : actividades.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">Sin actividad registrada</p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {actividades.map((a: any, i: number) => {
                          const accionColor =
                            a.accion === "CREATE" ? "bg-green-50 text-green-700" :
                            a.accion === "UPDATE" ? "bg-blue-50 text-blue-700" :
                            a.accion === "DELETE" ? "bg-red-50 text-red-700" :
                            "bg-gray-50 text-gray-600";
                          let detalleNombre = "";
                          try {
                            const d = JSON.parse(a.detalles || "{}");
                            detalleNombre = d.nombre || d.nombre_usuario || d.codigo || "";
                          } catch {}
                          return (
                            <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-xs">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${accionColor}`}>
                                  {a.accion}
                                </span>
                                <span className="text-gray-500 font-mono text-[10px]">{a.nombre_tabla}</span>
                                {detalleNombre && (
                                  <span className="text-gray-700 truncate font-medium">"{detalleNombre}"</span>
                                )}
                                {!detalleNombre && a.id_registro && (
                                  <span className="text-gray-400">#{a.id_registro}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-3 shrink-0">
                                <span className="text-gray-400 whitespace-nowrap">
                                  {a.marca_tiempo
                                    ? new Date(a.marca_tiempo).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " +
                                      new Date(a.marca_tiempo).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
                                    : ""}
                                </span>
                                <button
                                  onClick={() => {
                                    try { setDetalleModal(JSON.parse(a.detalles || "{}")); } catch { setDetalleModal({}); }
                                  }}
                                  className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded p-0.5 transition-colors"
                                  title="Ver detalles"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {Math.ceil(actividadesTotal / ACTIVIDADES_PER_PAGE) > 1 && (
                        <div className="flex items-center justify-between pt-3">
                          <span className="text-xs text-gray-400">
                            Página {actividadesPage} de {Math.ceil(actividadesTotal / ACTIVIDADES_PER_PAGE)}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => { const np = actividadesPage - 1; setActividadesPage(np); loadActividades(detailData!.id, np); }}
                              disabled={actividadesPage === 1}
                              className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
                            >
                              Anterior
                            </button>
                            <button
                              onClick={() => { const np = actividadesPage + 1; setActividadesPage(np); loadActividades(detailData!.id, np); }}
                              disabled={actividadesPage >= Math.ceil(actividadesTotal / ACTIVIDADES_PER_PAGE)}
                              className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
                            >
                              Siguiente
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Detalle actividad modal */}
      {detalleModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-6 mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Detalles del registro</h2>
              <button onClick={() => setDetalleModal(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-4 overflow-x-auto font-mono whitespace-pre-wrap">
              {JSON.stringify(detalleModal, null, 2)}
            </pre>
            <div className="flex justify-end pt-4">
              <button onClick={() => setDetalleModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
