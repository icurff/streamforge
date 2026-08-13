import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";

export type SubscriptionStatsResponse = {
  channelUsername: string;
  subscriberCount: number;
  isSubscribed?: boolean;
};

async function fetchSubscriptionStats(channelUsername: string): Promise<SubscriptionStatsResponse> {
  const res = await CustomAxios.get<SubscriptionStatsResponse>(
    `/api/subscriptions/channels/${encodeURIComponent(channelUsername)}/stats`
  );
  return res.data;
}

export function useGetSubscriptionStats(
  channelUsername: string | undefined
): UseQueryResult<SubscriptionStatsResponse, Error> {
  return useQuery<SubscriptionStatsResponse, Error>({
    queryKey: ["subscriptionStats", channelUsername],
    queryFn: () => fetchSubscriptionStats(channelUsername as string),
    enabled: !!channelUsername,
  });
}




