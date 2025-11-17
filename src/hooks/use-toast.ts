import { toast as sonnerToast } from "sonner";

export type ToastPayload = Parameters<typeof sonnerToast>[0];
export type ToastOptions = Parameters<typeof sonnerToast>[1];
export type ToastResult = ReturnType<typeof sonnerToast>;

export const toast = Object.assign(
  (...args: Parameters<typeof sonnerToast>): ToastResult => sonnerToast(...args),
  sonnerToast
);

export function useToast() {
  return { toast };
}
