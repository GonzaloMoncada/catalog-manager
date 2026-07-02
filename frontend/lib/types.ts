export interface Region {
  id: number;
  nombre: string;
  numero_romano?: string;
}

export interface Categoria {
  id: number;
  nombre: string;
}

export interface OfertaInfo {
  id: number;
  nombre: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
}

export interface OfertaProducto {
  id: number;
  precio: number;
  estado: string;
  oferta: OfertaInfo;
}

export interface ProductoRegion {
  producto_id: number;
  codigo: string;
  precio: number;
  region_id: number;
  estado: string;
  region: Region;
  oferta_producto?: OfertaProducto[];
  producto?: {
    id: number;
    nombre: string;
    imagenUrl: string | null;
    categoria_id: number | null;
    Categorias?: { id: number; nombre: string } | null;
  };
}

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  estado: string;
  imagenUrl: string | null;
  categoria_id: number | null;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  Categorias?: { id: number; nombre: string } | null;
  producto_regiones: ProductoRegion[];
}
