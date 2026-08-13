import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";

type UpdateMetadataPayload = {
  videoId: string;
  title?: string;
  description?: string;
  thumbnail?: string;
};

export function useUpdateVideoMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ videoId, title, description, thumbnail }: UpdateMetadataPayload) => {
      const payload: Record<string, string> = {};
      if (title !== undefined) payload.title = title;
      if (description !== undefined) payload.description = description;
      if (thumbnail !== undefined) payload.thumbnail = thumbnail;

      const res = await axios.patch(`/api/videos/${videoId}`, payload);
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




