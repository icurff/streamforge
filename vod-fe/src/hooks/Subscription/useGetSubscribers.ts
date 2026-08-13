import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";

export type SubscriptionResponse = {
  id: string;
  subscriberId: string;
  subscriberUsername: string;
  channelUsername: string;
  subscribedAt: string;
};

export type SubscribersPageResponse = {
  content: SubscriptionResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

async function fetchSubscribers(
  channelUsername: string,
  page: number,
  size: number
): Promise<SubscribersPageResponse> {
  const res = await CustomAxios.get<SubscribersPageResponse>(
    `/api/subscriptions/channels/${encodeURIComponent(channelUsername)}/subscribers`,
    {
      params: { page, size },
    }
  );
  return res.data;
}

export function useGetSubscribers(
  channelUsername: string | undefined,
  page = 0,
  size = 20
): UseQueryResult<SubscribersPageResponse, Error> {
  return useQuery<SubscribersPageResponse, Error>({
    queryKey: ["subscribers", channelUsername, page, size],
    queryFn: () => fetchSubscribers(channelUsername as string, page, size),
    enabled: !!channelUsername,
  });
}




