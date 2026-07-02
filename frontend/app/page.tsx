import { Suspense } from "react";
import CatalogPage from "@/components/CatalogPage";

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <CatalogPage />
    </Suspense>
  );
}
