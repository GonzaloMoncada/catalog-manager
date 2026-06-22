import Link from "next/link";
import Image from "next/image";

const regiones = [
  {
    nombre: "Arica y Parinacota",
    slug: "arica-y-parinacota",
    color: "from-orange-600 to-red-600",
    descripcion: "Región XV",
  },
  {
    nombre: "Tarapacá",
    slug: "tarapaca",
    color: "from-sky-600 to-blue-700",
    descripcion: "Región I",
  },
  {
    nombre: "Antofagasta",
    slug: "antofagasta",
    color: "from-amber-500 to-orange-600",
    descripcion: "Región II",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Image
            src="/logoSolo.png"
            alt="Comercial Brich"
            width={40}
            height={40}
            className="rounded"
          />
          <span className="text-lg font-semibold text-gray-800 tracking-tight">
            Comercial Brich
          </span>
        </div>
        <a
          href="https://www.comercialbrich.cl/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Acerca de
        </a>
      </header>

      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">
          Catálogo de Productos
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Selecciona tu región para ver los productos disponibles en tu zona
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {regiones.map((region) => (
            <Link
              key={region.slug}
              href={`/catalogo?region=${region.slug}`}
              className="group relative overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div
                className={`h-2 bg-gradient-to-r ${region.color}`}
              />
              <div className="p-8">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  {region.descripcion}
                </p>
                <h2 className="text-xl font-bold text-gray-800 group-hover:text-gray-600 transition-colors mb-3">
                  {region.nombre}
                </h2>
                <span className="inline-flex items-center text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors">
                  Ver productos
                  <svg
                    className="ml-1 w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="text-center pb-8 text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Comercial Brich
      </footer>
    </main>
  );
}
