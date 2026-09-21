"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { tradeByKey } from "@/lib/trades";

export type MapProvider = {
  id: number;
  name: string;
  trade: string;
  lat: number;
  lng: number;
  rating: number;
  ratingCount: number;
  baseRate: number;
  online: boolean;
  etaMins: number;
  distanceKm?: number;
  skills: string;
  bio: string;
  phone: string;
  whatsapp: string;
  avatar: string;
  area: string;
  serviceAreas: string;
  languages: string;
  priceUnit: string;
  experienceYears: number;
  jobsDone: number;
  verified: boolean;
  featured: boolean;
  status: string;
};

function pinIcon(
  trade: string,
  online: boolean,
  selected: boolean,
  priceLabel?: string,
) {
  const t = tradeByKey(trade);
  const pill = priceLabel
    ? `<div style="
        margin-top:2px;
        background:${selected ? "#a3e635" : "rgba(2,6,23,.92)"};
        color:${selected ? "#020617" : "#e2e8f0"};
        border:1px solid ${selected ? "#a3e635" : "rgba(255,255,255,.35)"};
        font-size:10px;font-weight:800;line-height:1;
        padding:3px 7px;border-radius:999px;white-space:nowrap;
        box-shadow:0 2px 6px rgba(0,0,0,.5);">${priceLabel}</div>`
    : ``;
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-6px);">
      <div style="
        width:${selected ? 44 : 38}px;height:${selected ? 44 : 38}px;
        border-radius:50% 50% 50% 8%;
        transform:rotate(45deg);
        background:${online ? t.color : "#475569"};
        border:${selected ? "3px solid #a3e635" : "2px solid rgba(255,255,255,.85)"};
        box-shadow:0 4px 10px rgba(0,0,0,.45);
        display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(-45deg);font-size:17px;line-height:1">${t.emoji}</span>
      </div>${pill}
    </div>`,
    iconSize: [64, 62],
    iconAnchor: [32, 58],
    popupAnchor: [0, -52],
  });
}

const meIcon = L.divIcon({
  className: "",
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#a3e635;border:3px solid #0f172a;box-shadow:0 0 0 6px rgba(163,230,53,.25)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

function ClickHandler({
  onPick,
}: {
  onPick?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapView({
  center,
  providers,
  radiusKm,
  selectedId,
  onSelect,
  onPick,
  height = "100%",
  currency = "Rs",
  showPrices = true,
}: {
  center: { lat: number; lng: number };
  providers: MapProvider[];
  radiusKm: number;
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  onPick?: (lat: number, lng: number) => void;
  height?: string;
  currency?: string;
  showPrices?: boolean;
}) {
  const markers = useMemo(() => providers, [providers]);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      scrollWheelZoom
      style={{ height, width: "100%", background: "#0f172a" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=cb1_3rw9_1_8bab93b88ca1f98cc7de76f8"
      />
      <Recenter lat={center.lat} lng={center.lng} />
      <ClickHandler onPick={onPick} />
      <Circle
        center={[center.lat, center.lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: "#a3e635", weight: 1, fillOpacity: 0.06 }}
      />
      <Marker position={[center.lat, center.lng]} icon={meIcon} />
      {markers.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={pinIcon(
            p.trade,
            p.online,
            selectedId === p.id,
            showPrices ? `${currency} ${p.baseRate}` : undefined,
          )}
          eventHandlers={{ click: () => onSelect?.(p.id) }}
        >
          <Popup>
            <div className="min-w-[170px] text-slate-900">
              <div className="font-bold">{p.name}</div>
              <div className="text-xs capitalize text-slate-600">
                {tradeByKey(p.trade).label} ·{" "}
                {p.online ? "Online now" : "Offline"}
              </div>
              <div className="mt-1 text-sm">
                ⭐ {p.rating.toFixed(1)}{" "}
                <span className="text-slate-500">({p.ratingCount})</span>
              </div>
              <div className="text-sm">
                {currency} {p.baseRate}/{p.priceUnit ?? "visit"} · ETA {p.etaMins}m
              </div>
              {typeof p.distanceKm === "number" && (
                <div className="text-xs text-slate-500">
                  {p.distanceKm.toFixed(1)} km away · {p.experienceYears ?? 0} yrs exp
                  {p.verified ? " · verified ✔" : ""}
                </div>
              )}
              {(p.skills || "") && (
                <div className="mt-1 text-[11px] text-slate-600">
                  {(p.skills || "").split("|").filter(Boolean).slice(0, 3).join(" · ")}
                </div>
              )}
              <a
                href={`/provider/${p.id}`}
                className="mt-2 inline-block rounded bg-slate-900 px-2 py-1 text-xs font-semibold text-lime-300"
              >
                View profile
              </a>
              <div className="mt-1 text-[10px] text-slate-500">
                Phone hidden · send a request to reveal.
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
