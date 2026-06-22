"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Recuperar() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Ingresa tu correo electrónico");
      return;
    }

    setLoading(true);

    // TODO: conectar con API del backend
    // const res = await fetch("/api/auth/forgot-password", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ email }),
    // });

    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 800);
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
          {sent ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Revisa tu correo
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                Si la cuenta existe, recibirás un enlace para restablecer tu
                contraseña.
              </p>
              <Link
                href="/login"
                className="block text-center text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                Volver al inicio de sesión
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                Recuperar contraseña
              </h1>
              <p className="text-sm text-gray-500 mb-8">
                Te enviaremos un enlace de restablecimiento
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {loading ? "Enviando..." : "Enviar enlace"}
                </button>
              </form>

              <Link
                href="/login"
                className="block text-center text-sm text-gray-500 hover:text-gray-700 transition-colors mt-6"
              >
                Volver al inicio de sesión
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
