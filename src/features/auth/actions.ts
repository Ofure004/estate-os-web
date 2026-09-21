"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionCookieName } from "./server";

export async function signOut() {
  (await cookies()).delete(sessionCookieName);
  redirect("/login");
}
