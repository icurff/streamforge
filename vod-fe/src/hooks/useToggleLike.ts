import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";

type ToggleLikeParams = {
  contentId: string;
  contentType: "video" | "livestream";
};

type ToggleLikeResponse = {
  liked: boolean;
};

async function toggleLike({ contentId, contentType }: ToggleLikeParams): Promise<ToggleLikeResponse> {
  const endpoint = contentType === "video"
    ? `/api/videos/${contentId}/like`
    : `/api/livestream/${contentId}/like`;
  const res = await axios.post(endpoint);
  return res.data;
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: toggleLike,
    onSuccess: (_, variables) => {
      // Invalidate the like info query to refetch the latest data
      queryClient.invalidateQueries({ 
        queryKey: ["likeInfo", variables.contentId, variables.contentType] 
      });
    },
  });
}
