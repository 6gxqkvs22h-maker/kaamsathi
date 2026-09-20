export type Trade = {
  key: string;
  label: string;
  emoji: string;
  color: string;
  defaultRate: number;
  skills: string[];
};

export const DEFAULT_CENTER = { lat: 27.7172, lng: 85.324 };

export const KTM_AREAS: { name: string; lat: number; lng: number }[] = [
  { name: "Thamel", lat: 27.7154, lng: 85.3123 },
  { name: "Lazimpat", lat: 27.7239, lng: 85.3209 },
  { name: "Baluwatar", lat: 27.7272, lng: 85.3318 },
  { name: "Maharajgunj", lat: 27.7375, lng: 85.3324 },
  { name: "Baneshwor", lat: 27.6893, lng: 85.3403 },
  { name: "Koteshwor", lat: 27.6786, lng: 85.3496 },
  { name: "Chabahil", lat: 27.7178, lng: 85.3468 },
  { name: "Gongabu", lat: 27.7361, lng: 85.3064 },
  { name: "Kalanki", lat: 27.6939, lng: 85.2814 },
  { name: "Kupondole", lat: 27.6864, lng: 85.3143 },
  { name: "Jhamsikhel", lat: 27.6792, lng: 85.3098 },
  { name: "Patan (Lalitpur)", lat: 27.6766, lng: 85.3241 },
  { name: "Bhaktapur", lat: 27.6710, lng: 85.4298 },
  { name: "Budhanilkantha", lat: 27.7677, lng: 85.3620 },
  { name: "Kirtipur", lat: 27.6796, lng: 85.2777 },
  { name: "Sitapaila", lat: 27.7153, lng: 85.2875 },
  { name: "Sinamangal", lat: 27.6949, lng: 85.3497 },
  { name: "Gwarko", lat: 27.6674, lng: 85.3328 },
];

export const TRADES: Trade[] = [
  {
    key: "electrician",
    label: "Electrician",
    emoji: "⚡",
    color: "#f59e0b",
    defaultRate: 700,
    skills: [
      "Wiring & rewiring",
      "Inverter / solar setup",
      "Fan & light fitting",
      "MCB & fuse box",
      "Motor rewinding",
    ],
  },
  {
    key: "plumber",
    label: "Plumber",
    emoji: "🚰",
    color: "#0ea5e9",
    defaultRate: 800,
    skills: [
      "Tap & pipe leakage",
      "Water tank & pump",
      "Toilet & bathroom fitting",
      "Drain unclogging",
      "Geyser / water heater",
    ],
  },
  {
    key: "painter",
    label: "Painter",
    emoji: "🎨",
    color: "#a855f7",
    defaultRate: 1200,
    skills: [
      "Interior emulsion",
      "Exterior weather coat",
      "Putty & wall repair",
      "Waterproofing",
      "Texture & stencil",
    ],
  },
  {
    key: "mechanic",
    label: "Mechanic",
    emoji: "🔧",
    color: "#ef4444",
    defaultRate: 1000,
    skills: [
      "Bike / scooter service",
      "Car engine repair",
      "Battery & electrical",
      "Brake & clutch",
      "Roadside breakdown",
    ],
  },
  {
    key: "gardener",
    label: "Gardener",
    emoji: "🌿",
    color: "#22c55e",
    defaultRate: 600,
    skills: [
      "Lawn mowing",
      "Planting & potting",
      "Tree pruning",
      "Terrace garden setup",
      "Pest & fertilizer",
    ],
  },
  {
    key: "helper",
    label: "Helper / Labour",
    emoji: "💪",
    color: "#6366f1",
    defaultRate: 500,
    skills: [
      "Loading & shifting",
      "House shifting",
      "Cleaning support",
      "Construction helper",
      "Event setup",
    ],
  },
  {
    key: "carpenter",
    label: "Carpenter",
    emoji: "🪚",
    color: "#b45309",
    defaultRate: 900,
    skills: [
      "Door & window repair",
      "Furniture making",
      "Modular kitchen",
      "Wardrobe & cabinet",
      "Wood polishing",
    ],
  },
  {
    key: "ac-repair",
    label: "AC / Fridge",
    emoji: "❄️",
    color: "#06b6d4",
    defaultRate: 1100,
    skills: [
      "AC gas refill",
      "AC servicing & cleaning",
      "Compressor repair",
      "Fridge repair",
      "Installation / uninstall",
    ],
  },
  {
    key: "cleaner",
    label: "Cleaner",
    emoji: "🧹",
    color: "#14b8a6",
    defaultRate: 700,
    skills: [
      "Deep house cleaning",
      "Sofa & carpet shampoo",
      "Kitchen degreasing",
      "Water tank cleaning",
      "Post-renovation clean",
    ],
  },
  {
    key: "mason",
    label: "Mason / Concrete",
    emoji: "🧱",
    color: "#78716c",
    defaultRate: 900,
    skills: [
      "Tiling & marble",
      "Plaster & cement work",
      "Brick & block wall",
      "Waterproofing",
      "Plinth & flooring",
    ],
  },
  {
    key: "appliance-repair",
    label: "Appliance Repair",
    emoji: "🔌",
    color: "#8b5cf6",
    defaultRate: 800,
    skills: [
      "Washing machine",
      "Microwave & oven",
      "Water pump & motor",
      "Rice cooker / mixer",
      "Induction & heater",
    ],
  },
  {
    key: "security-tech",
    label: "CCTV / Internet",
    emoji: "📷",
    color: "#0f766e",
    defaultRate: 1000,
    skills: [
      "CCTV installation",
      "Wi-Fi / router setup",
      "LAN cabling",
      "Intercom & doorbell",
      "DVR configuration",
    ],
  },
];

const fallbackTrade = {
  key: "other",
  label: "Service pro",
  emoji: "🧰",
  color: "#64748b",
  defaultRate: 700,
  skills: [],
};

export const tradeByKey = (key: string): Trade =>
  TRADES.find((t) => t.key === key) ?? { ...fallbackTrade, key };

export const enabledTrades = (disabled: string) =>
  TRADES.filter((t) => !disabled.split(",").map((d) => d.trim()).includes(t.key));

export function money(amount: number, currency = "Rs") {
  return `${currency} ${Math.round(amount).toLocaleString("en-IN")}`;
}

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestArea(lat: number, lng: number) {
  let best = KTM_AREAS[0];
  let bestD = Infinity;
  for (const a of KTM_AREAS) {
    const d = distanceKm({ lat, lng }, a);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best.name;
}
