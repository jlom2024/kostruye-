import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases de Tailwind sin conflictos */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea número como moneda */
export function formatCurrency(
  value: number,
  currency: "PEN" | "USD" = "PEN"
): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

/** Formatea número con separadores de miles */
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Retorna iniciales de un nombre */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}
