import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";
import type { AxiosError } from "axios";

async function unsubscribe(channelUsername: string): Promise<void> {
  await CustomAxios.delete(`/api/subscriptions/channels/${encodeURIComponent(channelUsername)}`);
}

export function useUnsubscribe(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: unsubscribe,
    onSuccess: (_, channelUsername) => {
      // Invalidate subscription-related queries
      queryClient.invalidateQueries({ queryKey: ["subscriptionStats", channelUsername] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
    onError: (error: AxiosError<{ error?: string; message?: string }>) => {
      const message = error?.response?.data?.error || error?.response?.data?.message || "Hủy đăng ký thất bại";
      throw new Error(message);
    },
  });
}




