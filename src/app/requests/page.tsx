import Link from "next/link";
import { db } from "@/db";
import { bids, jobRequests, providers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSettings } from "@/lib/settings";
import { tradeByKey } from "@/lib/trades";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const [rows, settings, bidRows] = await Promise.all([
    db.select().from(jobRequests).orderBy(desc(jobRequests.createdAt)).limit(50),
    getSettings(),
    db
      .select({ bid: bids, provider: providers })
      .from(bids)
      .innerJoin(providers, eq(bids.providerId, providers.id)),
  ]);

  const acceptedByRequest = new Map(
    bidRows
      .filter((b) => b.bid.status === "accepted")
      .map((b) => [b.bid.requestId, { price: b.bid.price, name: b.provider.name, phone: b.provider.phone }]),
  );
  const bidCount = new Map<number, number>();
  for (const b of bidRows) bidCount.set(b.bid.requestId, (bidCount.get(b.bid.requestId) ?? 0) + 1);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-extrabold">My bookings</h1>
      <p className="mb-4 text-sm text-slate-400">
        Every job posted in {settings.city} with its offers and booked worker.
      </p>
      <div className="space-y-3">
        {rows.length === 0 && (
          <p className="text-sm text-slate-500">
            Nothing yet —{" "}
            <Link href="/" className="text-lime-400">
              post a job on the map
            </Link>
            .
          </p>
        )}
        {rows.map((r) => {
          const t = tradeByKey(r.trade);
          const won = acceptedByRequest.get(r.id);
          return (
            <Link
              key={r.id}
              href={`/request/${r.id}`}
              className="block rounded-2xl border border-slate-800 bg-slate-900 p-4 hover:border-lime-400"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold">
                    {t.emoji} {t.label}{" "}
                    <span className="text-xs font-normal text-slate-500">
                      · {r.area} · {r.urgency}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {r.description || "No description"} · {r.customerName}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {bidCount.get(r.id) ?? 0} offers
                    {won ? ` · booked ${won.name} (${won.phone})` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-lime-400">
                    {settings.currency} {won ? won.price : r.offerPrice}
                  </div>
                  <div className="text-[11px] uppercase text-slate-500">
                    {r.status}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
