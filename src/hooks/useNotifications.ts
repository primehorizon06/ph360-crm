import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export interface AppNotification {
  id: number;
  type: "PRODUCT_APPROVAL_PENDING" | "PRODUCT_APPROVED" | "PRODUCT_REJECTED";
  title: string;
  body: string;
  leadId: number;
  productId: number | null;
  read: boolean;
  createdAt: string;
  lead: {
    firstName: string;
    lastName: string | null;
    fullName: string;
  };
}

export function useNotifications() {
  const { data, error, isLoading, mutate } = useSWR<AppNotification[]>(
    "/api/notifications",
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    },
  );

  return {
    notifications: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
  };
}
