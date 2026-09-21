"use client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: {
    queries: { staleTime: 15_000, retry: (count, error) => !(error instanceof ApiError && error.statusCode < 500) && count < 1 },
    mutations: { retry: false },
  } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
