import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";

export type SubscriptionResponse = {
  id: string;
  subscriberId: string;
  subscriberUsername: string;
  channelUsername: string;
  subscribedAt: string;
};

export type SubscriptionsPageResponse = {
  content: SubscriptionResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

async function fetchSubscriptions(page: number, size: number): Promise<SubscriptionsPageResponse> {
  const res = await CustomAxios.get<SubscriptionsPageResponse>("/api/subscriptions/my-subscriptions", {
    params: { page, size },
  });
  return res.data;
}

export function useGetSubscriptions(
  page = 0,
  size = 20
): UseQueryResult<SubscriptionsPageResponse, Error> {
  return useQuery<SubscriptionsPageResponse, Error>({
    queryKey: ["subscriptions", page, size],
    queryFn: () => fetchSubscriptions(page, size),
  });
}




