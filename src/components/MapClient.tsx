"use client";

import dynamic from "next/dynamic";

const MapClient = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-slate-900 text-sm text-slate-400">
      Loading map…
    </div>
  ),
});

export default MapClient;
