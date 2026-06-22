"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { apiGet } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard/productos", label: "Productos", permiso: "PRODUCTO_READ" },
  { href: "/dashboard/categorias", label: "Categorías", permiso: "CATEGORIA_READ" },
  { href: "/dashboard/ofertas", label: "Ofertas", permiso: "OFERTA_READ" },
  { href: "/dashboard/usuarios", label: "Usuarios", permiso: "USUARIO_READ" },
  { href: "/dashboard/roles", label: "Roles", permiso: "ROL_READ" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    apiGet("profile").then((data) => {
      setPermisos(data.permisos ?? []);
      setIsAdmin(data.isAdmin ?? false);
    }).catch(() => {});
  }, []);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  const filteredNav = NAV_ITEMS.filter(
    (item) => isAdmin || permisos.includes(item.permiso),
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={
          "fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-gray-100 flex flex-col transition-transform duration-200 " +
          "lg:relative lg:translate-x-0 lg:z-auto " +
          (sidebarOpen ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="h-14 flex items-center justify-between px-5 border-b border-gray-100">
          <Link href="/" className="text-sm font-semibold text-gray-800 tracking-tight">
            Comercial Brich
          </Link>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {filteredNav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className={
                  "block px-3 py-2 rounded-lg text-sm transition-colors " +
                  (active
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-800")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-gray-100">
          <Link
            href="/auth/logout"
            className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            Cerrar sesión
          </Link>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-white border-b border-gray-100 flex items-center px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 -ml-1 text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/" className="ml-3 text-sm font-semibold text-gray-800 tracking-tight">
          Comercial Brich
        </Link>
      </div>

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
