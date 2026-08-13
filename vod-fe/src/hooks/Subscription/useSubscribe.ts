import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";
import type { AxiosError } from "axios";

export type SubscriptionResponse = {
  id: string;
  subscriberId: string;
  subscriberUsername: string;
  channelUsername: string;
  subscribedAt: string;
};

async function subscribe(channelUsername: string): Promise<SubscriptionResponse> {
  const res = await CustomAxios.post<SubscriptionResponse>(
    `/api/subscriptions/channels/${encodeURIComponent(channelUsername)}`
  );
  return res.data;
}

export function useSubscribe(): UseMutationResult<SubscriptionResponse, Error, string> {
  const queryClient = useQueryClient();

  return useMutation<SubscriptionResponse, Error, string>({
    mutationFn: subscribe,
    onSuccess: (data, channelUsername) => {
      // Invalidate subscription-related queries
      queryClient.invalidateQueries({ queryKey: ["subscriptionStats", channelUsername] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
    onError: (error: AxiosError<{ error?: string; message?: string }>) => {
      const message = error?.response?.data?.error || error?.response?.data?.message || "Đăng ký thất bại";
      throw new Error(message);
    },
  });
}




