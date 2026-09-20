"use client";

// Crash-safe token storage. In sandboxed/blocked iframes localStorage access
// itself can throw a SecurityError — that used to abort admin/worker login
// entirely. This helper falls back to in-memory storage so auth never crashes.

const ADMIN_KEY = "fixnear_admin_token";
const WORKER_KEY = "fixnear_worker_token";
const CUSTOMER_KEY = "fixnear_customer_token";

const memory: Record<string, string> = {};

function safeGet(key: string): string {
  try {
    return window.localStorage.getItem(key) || memory[key] || "";
  } catch {
    return memory[key] || "";
  }
}

function safeSet(key: string, value: string) {
  memory[key] = value;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore — memory fallback keeps the session alive for this tab
  }
}

function safeRemove(key: string) {
  delete memory[key];
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export const getAdminToken = () => (typeof window === "undefined" ? "" : safeGet(ADMIN_KEY));
export const setAdminToken = (v: string) => safeSet(ADMIN_KEY, v);
export const clearAdminToken = () => safeRemove(ADMIN_KEY);

export const getWorkerToken = () => (typeof window === "undefined" ? "" : safeGet(WORKER_KEY));
export const setWorkerToken = (v: string) => safeSet(WORKER_KEY, v);
export const clearWorkerToken = () => safeRemove(WORKER_KEY);

export const getCustomerToken = () => (typeof window === "undefined" ? "" : safeGet(CUSTOMER_KEY));
export const setCustomerToken = (v: string) => safeSet(CUSTOMER_KEY, v);
export const clearCustomerToken = () => safeRemove(CUSTOMER_KEY);

export const adminHeaders = (extra?: Record<string, string>) => ({
  ...(extra ?? {}),
  "x-admin-token": getAdminToken(),
});

export const workerHeaders = (extra?: Record<string, string>) => ({
  "Content-Type": "application/json",
  ...(extra ?? {}),
  "x-worker-token": getWorkerToken(),
});

export const customerHeaders = (extra?: Record<string, string>) => ({
  "Content-Type": "application/json",
  ...(extra ?? {}),
  "x-customer-token": getCustomerToken(),
});
