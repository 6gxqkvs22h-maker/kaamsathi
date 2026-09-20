import {
  pgTable,
  serial,
  text,
  doublePrecision,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  trade: text("trade").notNull(),
  skills: text("skills").notNull().default(""),
  bio: text("bio").notNull().default(""),
  phone: text("phone").notNull().default(""),
  whatsapp: text("whatsapp").notNull().default(""),
  avatar: text("avatar").notNull().default("🧰"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  area: text("area").notNull().default(""),
  serviceAreas: text("service_areas").notNull().default(""),
  languages: text("languages").notNull().default("Nepali, English"),
  rating: doublePrecision("rating").notNull().default(4.5),
  ratingCount: integer("rating_count").notNull().default(0),
  jobsDone: integer("jobs_done").notNull().default(0),
  baseRate: integer("base_rate").notNull().default(500),
  priceUnit: text("price_unit").notNull().default("visit"),
  experienceYears: integer("experience_years").notNull().default(0),
  online: boolean("online").notNull().default(true),
  etaMins: integer("eta_mins").notNull().default(20),
  verified: boolean("verified").notNull().default(false),
  featured: boolean("featured").notNull().default(false),
  status: text("status").notNull().default("approved"),
  walletBalance: integer("wallet_balance").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  type: text("type").notNull().default("topup"), // topup | lead_fee | refund | admin_adjust
  amount: integer("amount").notNull(),
  method: text("method").notNull().default("esewa"), // esewa | khalti | bank | cash | system
  reference: text("reference").notNull().default(""),
  note: text("note").notNull().default(""),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  balanceAfter: integer("balance_after"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const jobRequests = pgTable("job_requests", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull().default(""),
  trade: text("trade").notNull(),
  description: text("description").notNull(),
  offerPrice: integer("offer_price").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  area: text("area").notNull().default(""),
  address: text("address").notNull().default(""),
  // Precise GPS pin so the accepted worker can navigate to the customer.
  pinLat: doublePrecision("pin_lat"),
  pinLng: doublePrecision("pin_lng"),
  urgency: text("urgency").notNull().default("today"),
  status: text("status").notNull().default("open"),
  acceptedOfferId: integer("accepted_offer_id"),
  targetProviderId: integer("target_provider_id"),
  radiusKm: doublePrecision("radius_km").notNull().default(1),
  customerId: integer("customer_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bids = pgTable("bids", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  providerId: integer("provider_id").notNull(),
  price: integer("price").notNull(),
  etaMins: integer("eta_mins").notNull().default(20),
  message: text("message").notNull().default(""),
  status: text("status").notNull().default("pending"),
  source: text("source").notNull().default("auto"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  requestId: integer("request_id"),
  stars: integer("stars").notNull(),
  comment: text("comment").notNull().default(""),
  author: text("author").notNull().default("Customer"),
  hidden: boolean("hidden").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  city: text("city").notNull().default("Kathmandu, Nepal"),
  currency: text("currency").notNull().default("Rs"),
  commissionPct: integer("commission_pct").notNull().default(12),
  serviceFee: integer("service_fee").notNull().default(50),
  minOffer: integer("min_offer").notNull().default(200),
  maxOffer: integer("max_offer").notNull().default(50000),
  maxRadiusKm: integer("max_radius_km").notNull().default(15),
  defaultRadiusKm: integer("default_radius_km").notNull().default(6),
  surgeMultiplier: doublePrecision("surge_multiplier").notNull().default(1),
  commissionEnabled: boolean("commission_enabled").notNull().default(true),
  requireWorkerApproval: boolean("require_worker_approval")
    .notNull()
    .default(true),
  autoBidEnabled: boolean("auto_bid_enabled").notNull().default(true),
  autoBidCount: integer("auto_bid_count").notNull().default(6),
  minRatingToBid: doublePrecision("min_rating_to_bid").notNull().default(0),
  tradeRates: jsonb("trade_rates")
    .$type<Record<string, number>>()
    .notNull()
    .default({}),
  disabledTrades: text("disabled_trades").notNull().default(""),
  announcement: text("announcement").notNull().default(""),
  customerLoginRequired: boolean("customer_login_required")
    .notNull()
    .default(true),
  apiKeys: jsonb("api_keys")
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  adminPassword: text("admin_password").notNull().default("admin123"),
  leadFee: integer("lead_fee").notNull().default(50),
  minTopup: integer("min_topup").notNull().default(100),
  walletRequired: boolean("wallet_required").notNull().default(true),
  appName: text("app_name").notNull().default("KaamSathi"),
  appTagline: text("app_tagline").notNull().default("Kathmandu Instant Services"),
  socialLinks: jsonb("social_links")
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  emergencyHotlines: jsonb("emergency_hotlines")
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  phone: text("phone").notNull().default(""),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  area: text("area").notNull().default(""),
  avatar: text("avatar").notNull().default("🙋"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customerSessions = pgTable("customer_sessions", {
  token: text("token").primaryKey(),
  customerId: integer("customer_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Provider = typeof providers.$inferSelect;
export type JobRequest = typeof jobRequests.$inferSelect;
export type Bid = typeof bids.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Customer = typeof customers.$inferSelect;
