"use client";

import { HeroUIProvider } from "@heroui/react";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with MapLibre
const MapView = dynamic(() => import("./components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading map...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <HeroUIProvider>
      <main className="w-full h-screen overflow-hidden">
        <MapView />
      </main>
    </HeroUIProvider>
  );
}
