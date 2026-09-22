"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: string };

const WORKER: Item[] = [
  { href: "/work", label: "Jobs", icon: "briefcase" },
  { href: "/work/applications", label: "Applied", icon: "clipboard" },
  { href: "/", label: "Map", icon: "map" },
  { href: "/profile", label: "Profile", icon: "user" },
];

const HIRE: Item[] = [
  { href: "/hire", label: "Dashboard", icon: "grid" },
  { href: "/hire/post", label: "Post", icon: "plus" },
  { href: "/", label: "Map", icon: "map" },
  { href: "/profile", label: "Profile", icon: "user" },
];

const PATHS: Record<string, string> = {
  briefcase:
    "M20.25 14.15v4.073a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a9.797 9.797 0 0 1-5.396 0l-1.32-.377a2.25 2.25 0 0 1-1.632-2.163V14.15M3.75 8.25v6.443M20.25 8.25v6.443M12 12.75h.008v.008H12v-.008ZM3.75 8.25l7.5-4.286a1.5 1.5 0 0 1 1.5 0l7.5 4.286-8.25 4.714L3.75 8.25Z",
  clipboard:
    "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z",
  map: "M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z",
  user: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
  grid: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z",
  plus: "M12 4.5v15m7.5-7.5h-15",
};

export default function BottomNav({ mode }: { mode: "hire" | "worker" }) {
  const pathname = usePathname();
  const items = mode === "worker" ? WORKER : HIRE;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[900] border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-stretch">
        {items.map((it) => {
          const active =
            it.href === "/"
              ? pathname === "/"
              : pathname === it.href ||
                (it.href !== "/hire" && pathname?.startsWith(it.href));
          const isPost = it.icon === "plus";
          return (
            <Link
              key={it.href}
              href={it.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5"
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-xl transition ${
                  isPost
                    ? "bg-lime-400 text-slate-950"
                    : active
                      ? "bg-lime-400/15 text-lime-300"
                      : "text-slate-500"
                }`}
              >
                <svg
                  className="h-[19px] w-[19px]"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={isPost ? 2.6 : 1.8}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={PATHS[it.icon]}
                  />
                </svg>
              </span>
              <span
                className={`text-[10px] font-semibold ${
                  active ? "text-lime-300" : "text-slate-500"
                }`}
              >
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
