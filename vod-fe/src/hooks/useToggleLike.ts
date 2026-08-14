import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";

type ToggleLikeParams = {
  contentId: string;
  contentType?: string;
};

type ToggleLikeResponse = {
  liked: boolean;
};

async function toggleLike({ contentId }: ToggleLikeParams): Promise<ToggleLikeResponse> {
  const res = await axios.post(`/api/videos/${contentId}/like`);
  return res.data;
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: toggleLike,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["likeInfo", variables.contentId] 
      });
    },
  });
}
