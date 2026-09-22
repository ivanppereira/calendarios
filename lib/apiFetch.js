"use client";

import { getSupabaseBrowser } from "./supabaseClient";

export async function apiFetch(url, options = {}) {
  const supabase = getSupabaseBrowser();
  let token = null;
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token || null;
  }
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...options, headers });
}
