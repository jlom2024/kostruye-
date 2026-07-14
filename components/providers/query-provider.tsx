"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutos para datos generales
            gcTime: 10 * 60 * 1000, // 10 minutos para limpieza de memoria
            refetchOnWindowFocus: false, // Evita refetch excesivo al cambiar de pestaña
            retry: (failureCount, error: any) => {
              if (error.status === 404) return false;
              return failureCount < 3;
            },
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
