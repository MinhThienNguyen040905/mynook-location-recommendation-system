"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { LeafletMap } from "./leaflet-map";

const Map = dynamic(
  () => import("./leaflet-map").then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 animate-pulse">
        <div className="text-slate-400 text-sm">Loading map...</div>
      </div>
    ),
  },
);

export type DynamicMapProps = ComponentProps<typeof LeafletMap>;

export function DynamicMap(props: DynamicMapProps) {
  return <Map {...props} />;
}
