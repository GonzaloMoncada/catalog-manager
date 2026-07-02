"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 2FA
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setTwoFactorError("");

    if (!email || !password) {
      setError("Completa todos los campos");
      return;
    }
    setLoading(true);

    try {
      const csrfRes = await fetch(apiUrl + "csrf-token", {
        credentials: "include",
      });
      const { token: csrfToken } = await csrfRes.json();

      const res = await fetch(apiUrl + "auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({ password: password, username: email.toLowerCase() }),
      });

      const data = await res.json().catch(() => ({}));

      if (data.two_factor_required) {
        setTwoFactorToken(data.token_2fa);
        setTwoFactorRequired(true);
      } else if (res.ok) {
        router.push("/dashboard");
      } else {
        setError(data.message || "Error al iniciar sesión");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyTwoFactor(e: FormEvent) {
    e.preventDefault();
    setTwoFactorError("");

    if (!twoFactorCode.trim() || twoFactorCode.trim().length !== 6) {
      setTwoFactorError("Ingresá el código de 6 dígitos.");
      return;
    }

    setLoading(true);
    try {
      const csrfRes = await fetch(apiUrl + "csrf-token", {
        credentials: "include",
      });
      const { token: csrfToken } = await csrfRes.json();

      const res = await fetch(apiUrl + "auth/verify-2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({ token_2fa: twoFactorToken, codigo: twoFactorCode.trim() }),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json().catch(() => ({}));
        setTwoFactorError(data.message || "Código inválido.");
      }
    } catch {
      setTwoFactorError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image
              src="/logoSolo.png"
              alt="Comercial Brich"
              width={36}
              height={36}
              className="rounded"
            />
            <span className="text-lg font-semibold text-gray-800 tracking-tight">
              Comercial Brich
            </span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {twoFactorRequired ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                Verificación en dos pasos
              </h1>
              <p className="text-sm text-gray-500 mb-8">
                Ingresá el código de tu app authenticator
              </p>

              {twoFactorError && (
                <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
                  {twoFactorError}
                </div>
              )}

              <form onSubmit={handleVerifyTwoFactor} className="space-y-5">
                <div>
                  <label
                    htmlFor="totp"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Código de 6 dígitos
                  </label>
                  <input
                    id="totp"
                    type="text"
                    inputMode="numeric"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    autoComplete="one-time-code"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono tracking-widest text-center"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  {loading ? "Verificando..." : "Verificar"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTwoFactorRequired(false);
                    setTwoFactorCode("");
                    setTwoFactorError("");
                  }}
                  className="w-full text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  Volver al inicio de sesión
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                Iniciar sesión
              </h1>
              <p className="text-sm text-gray-500 mb-8">
                Accede al panel de administración
              </p>

              {error && (
                <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejecutivo@comercialbrich.cl"
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Contraseña
                    </label>
                    <Link
                      href="/login/recuperar"
                      className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Recordarme</span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  {loading ? "Ingresando..." : "Ingresar"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          &copy; {new Date().getFullYear()} Comercial Brich — Panel ejecutivo
        </p>
      </div>
    </main>
  );
}