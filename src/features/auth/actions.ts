"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clearSession, latestRefreshToken, refreshCookieName } from "./session";

export async function signOut() {
  const store = await cookies();
  const token = store.get(refreshCookieName)?.value;
  const base = process.env.ESTATEOS_API_URL;
  if (token && base) {
    try {
      await fetch(`${base.replace(/\/$/, "")}/auth/logout`, {
        method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: latestRefreshToken(token) }),
      });
    } catch { /* Local sign-out still clears the browser session. */ }
  }
  clearSession(store);
  redirect("/login");
}
