import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";
import { type VideoPrivacy } from "@/types/video";

type UpdatePrivacyPayload = {
  videoId: string;
  privacy: VideoPrivacy;
};

export function useUpdateVideoPrivacy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ videoId, privacy }: UpdatePrivacyPayload) => {
      const res = await axios.patch(`/api/videos/${videoId}/privacy`, { privacy });
      return res.data;
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["recentVideos"] }),
        queryClient.invalidateQueries({ queryKey: ["video", variables.videoId] }),
      ]);
    },
  });
}


