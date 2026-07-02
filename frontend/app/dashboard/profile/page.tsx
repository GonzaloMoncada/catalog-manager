"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

interface Profile {
  userId: string;
  correo: string;
  nombre_usuario: string;
  image_url: string | null;
  isAdmin: boolean;
  permisos: string[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // username
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  // image
  const [editingImage, setEditingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [savingImage, setSavingImage] = useState(false);
  const [imageError, setImageError] = useState("");

  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(true);
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [twoFactorQrUrl, setTwoFactorQrUrl] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const [twoFactorSaving, setTwoFactorSaving] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    apiGet("profile")
      .then((data: Profile) => setProfile(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    apiPost("auth/2fa/generate")
      .then((data: { secret: string; qrCodeUrl: string }) => {
        setTwoFactorSecret(data.secret);
        setTwoFactorQrUrl(data.qrCodeUrl);
        setTwoFactorEnabled(false);
      })
      .catch(() => {
        setTwoFactorEnabled(true);
      })
      .finally(() => setTwoFactorLoading(false));
  }, []);

  function startEditUsername() {
    if (!profile) return;
    setNewUsername(profile.nombre_usuario);
    setUsernameError("");
    setEditingUsername(true);
  }

  async function handleSaveUsername(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newUsername.trim();
    if (!trimmed) {
      setUsernameError("El nombre de usuario no puede estar vacío.");
      return;
    }
    if (trimmed === profile?.nombre_usuario) {
      setEditingUsername(false);
      return;
    }
    setSavingUsername(true);
    setUsernameError("");
    try {
      const data: Profile = await apiPatch("profile", { nombre_usuario: trimmed });
      setProfile(data);
      setEditingUsername(false);
    } catch (e: any) {
      if (e.message?.toLowerCase().includes("409") || e.message?.toLowerCase().includes("conflict") || e.message?.toLowerCase().includes("uso")) {
        setUsernameError("Ese nombre de usuario ya está en uso.");
      } else {
        setUsernameError(e.message || "Error al actualizar el nombre.");
      }
    } finally {
      setSavingUsername(false);
    }
  }

  function startEditImage() {
    if (!profile) return;
    setNewImageUrl(profile.image_url ?? "");
    setImageError("");
    setEditingImage(true);
  }

  async function handleSaveImage(e: React.FormEvent) {
    e.preventDefault();
    const url = newImageUrl.trim();
    if (!url) {
      setImageError("La URL de imagen no puede estar vacía.");
      return;
    }
    setSavingImage(true);
    setImageError("");
    try {
      const data: Profile = await apiPatch("profile", { image_url: url });
      setProfile(data);
      setEditingImage(false);
    } catch (e: any) {
      setImageError(e.message || "Error al actualizar la imagen.");
    } finally {
      setSavingImage(false);
    }
  }

  async function handleRemoveImage() {
    if (!profile?.image_url) return;
    setSavingImage(true);
    setImageError("");
    try {
      const data: Profile = await apiPatch("profile", { image_url: null });
      setProfile(data);
    } catch (e: any) {
      setImageError(e.message || "Error al eliminar la imagen.");
    } finally {
      setSavingImage(false);
    }
  }

  function openTwoFactorSetup() {
    setTwoFactorCode("");
    setTwoFactorError("");
    setShowSetup(true);

    if (!twoFactorSecret) {
      apiPost("auth/2fa/generate")
        .then((data: { secret: string; qrCodeUrl: string }) => {
          setTwoFactorSecret(data.secret);
          setTwoFactorQrUrl(data.qrCodeUrl);
        })
        .catch((e: any) => {
          setTwoFactorError(e.message || "Error al generar secreto 2FA.");
        });
    }
  }

  async function handleEnableTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    if (!twoFactorCode.trim()) {
      setTwoFactorError("Ingresá el código de tu authenticator.");
      return;
    }
    setTwoFactorSaving(true);
    setTwoFactorError("");
    try {
      await apiPost("auth/2fa/enable", { secret: twoFactorSecret, codigo: twoFactorCode.trim() });
      setTwoFactorEnabled(true);
      setShowSetup(false);
      setTwoFactorCode("");
    } catch (e: any) {
      setTwoFactorError(e.message || "Código inválido.");
    } finally {
      setTwoFactorSaving(false);
    }
  }

  async function handleDisableTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    if (!twoFactorCode.trim()) {
      setTwoFactorError("Ingresá un código TOTP válido.");
      return;
    }
    if (!confirm("¿Desactivar 2FA? Necesitarás volver a configurarlo para habilitarlo de nuevo.")) return;
    setTwoFactorSaving(true);
    setTwoFactorError("");
    try {
      const res = await apiFetch("auth/2fa", {
        method: "DELETE",
        body: JSON.stringify({ codigo: twoFactorCode.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Error al desactivar 2FA.");
      }
      setTwoFactorEnabled(false);
      setTwoFactorSecret("");
      setTwoFactorQrUrl("");
      setTwoFactorCode("");
    } catch (e: any) {
      setTwoFactorError(e.message || "Error al desactivar 2FA.");
    } finally {
      setTwoFactorSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-500">No se pudo cargar el perfil.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-8 space-y-6">
      {/* --- Profile Card --- */}
      <div className="bg-white rounded-xl border border-gray-100 p-8">
        <div className="flex flex-col items-center gap-4 mb-6">
          {profile.image_url ? (
            <img
              src={profile.image_url}
              alt={profile.nombre_usuario}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-2xl font-medium">
              {profile.nombre_usuario.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-semibold text-gray-900">{profile.nombre_usuario}</h1>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500">Correo</span>
            <span className="text-sm text-gray-800">{profile.correo}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500">Admin</span>
            <span className="text-sm text-gray-800">{profile.isAdmin ? "Sí" : "No"}</span>
          </div>
        </div>
      </div>

      {/* --- Username --- */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Nombre de usuario</h2>
          {!editingUsername && (
            <button
              onClick={startEditUsername}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
            >
              Editar
            </button>
          )}
        </div>

        {editingUsername ? (
          <form onSubmit={handleSaveUsername} className="space-y-3">
            <div>
              <input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
                autoFocus
              />
            </div>
            {usernameError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">{usernameError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditingUsername(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingUsername}
                className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {savingUsername ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-700">{profile.nombre_usuario}</p>
        )}
      </div>

      {/* --- Profile Image --- */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Imagen de perfil</h2>
          {!editingImage && (
            <button
              onClick={startEditImage}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
            >
              Editar
            </button>
          )}
        </div>

        {editingImage ? (
          <form onSubmit={handleSaveImage} className="space-y-3">
            <div>
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-400">Ingresá la URL de tu imagen de perfil.</p>
            </div>
            {imageError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">{imageError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditingImage(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingImage}
                className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {savingImage ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-3">
            {profile.image_url ? (
              <>
                <p className="text-xs text-gray-400 truncate max-w-[300px]">{profile.image_url}</p>
                <button
                  onClick={handleRemoveImage}
                  disabled={savingImage}
                  className="text-xs text-red-500 hover:text-red-600 shrink-0 cursor-pointer"
                >
                  Eliminar
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-400">Sin imagen</p>
            )}
          </div>
        )}
      </div>

      {/* --- 2FA --- */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Autenticación en dos pasos (2FA)
        </h2>

        {twoFactorLoading ? (
          <p className="text-sm text-gray-400">Verificando...</p>
        ) : twoFactorEnabled ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-gray-700">Activado</span>
            </div>

            <form onSubmit={handleDisableTwoFactor} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Código TOTP para desactivar
                </label>
                <input
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono tracking-widest"
                />
              </div>
              {twoFactorError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">{twoFactorError}</p>
              )}
              <button
                type="submit"
                disabled={twoFactorSaving}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {twoFactorSaving ? "Desactivando..." : "Desactivar 2FA"}
              </button>
            </form>
          </div>
        ) : showSetup ? (
          <div className="space-y-4">
            {twoFactorQrUrl && (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFactorQrUrl)}`}
                  alt="QR 2FA"
                  className="w-40 h-40 rounded-lg border border-gray-100"
                />
                <p className="text-xs text-gray-400 text-center max-w-[280px]">
                  Escaneá este QR con tu app authenticator (Google Authenticator, Authy, etc.)
                </p>
              </div>
            )}

            <form onSubmit={handleEnableTwoFactor} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Código de verificación
                </label>
                <input
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono tracking-widest"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-400">
                  Ingresá el código de 6 dígitos de tu authenticator.
                </p>
              </div>
              {twoFactorError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">{twoFactorError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSetup(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={twoFactorSaving}
                  className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {twoFactorSaving ? "Verificando..." : "Activar 2FA"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            onClick={openTwoFactorSetup}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Activar 2FA
          </button>
        )}
      </div>

      <div className="text-center">
        <button
          onClick={async () => {
            try { await apiPost("auth/logout"); } catch {}
            router.push("/login");
          }}
          className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors cursor-pointer"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
