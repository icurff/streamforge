import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";

export type VideoComment = {
  id: string;
  videoId: string;
  parentCommentId?: string | null;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  likesCount: number;
  likedByCurrentUser: boolean;
  replies: VideoComment[];
};

export type CommentPage = {
  comments: VideoComment[];
  page: number;
  size: number;
  hasMore: boolean;
};

type CreateCommentPayload = {
  content: string;
  parentCommentId?: string;
};

const COMMENTS_QUERY_KEY = "video-comments";

export function useVideoComments(videoId: string, pageSize = 20) {
  return useInfiniteQuery<CommentPage, Error>({
    queryKey: [COMMENTS_QUERY_KEY, videoId, pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await axios.get<CommentPage>(`/api/videos/${videoId}/comments`, {
        params: {
          page: pageParam,
          size: pageSize,
        },
      });
      return response.data;
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    enabled: !!videoId,
    refetchOnWindowFocus: false,
  });
}

export function useCreateComment(videoId: string) {
  const queryClient = useQueryClient();

  return useMutation<VideoComment, Error, CreateCommentPayload>({
    mutationFn: async (payload) => {
      const response = await axios.post<VideoComment>(`/api/videos/${videoId}/comments`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, videoId] });
    },
  });
}

export function useToggleCommentLike(videoId: string) {
  const queryClient = useQueryClient();

  return useMutation<VideoComment, Error, string>({
    mutationFn: async (commentId) => {
      const response = await axios.post<VideoComment>(
        `/api/videos/${videoId}/comments/${commentId}/like`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, videoId] });
    },
  });
}



