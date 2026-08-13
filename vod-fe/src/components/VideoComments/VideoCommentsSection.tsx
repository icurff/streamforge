import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateComment,
  useToggleCommentLike,
  useVideoComments,
  type VideoComment,
} from "@/hooks/Video/useVideoComments";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CommentItem } from "./CommentItem";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type VideoCommentsSectionProps = {
  videoId: string;
};

export function VideoCommentsSection({ videoId }: VideoCommentsSectionProps) {
  const { isAuthenticated } = useAuth();
  const [content, setContent] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const { toast } = useToast();

  const commentsQuery = useVideoComments(videoId);
  const createComment = useCreateComment(videoId);
  const toggleLike = useToggleCommentLike(videoId);

  const comments = useMemo<VideoComment[]>(() => {
    if (!commentsQuery.data) return [];
    return commentsQuery.data.pages.flatMap((page) => page.comments ?? []);
  }, [commentsQuery.data]);

  const sortedComments = useMemo<VideoComment[]>(() => {
    const sortFn = (a: VideoComment, b: VideoComment) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();

      if (Number.isNaN(aDate) || Number.isNaN(bDate)) {
        return 0;
      }

      return sortOrder === "newest" ? bDate - aDate : aDate - bDate;
    };

    const sortReplies = (items: VideoComment[]): VideoComment[] =>
      items
        .map((item) => ({
          ...item,
          replies: item.replies ? sortReplies(item.replies) : [],
        }))
        .sort(sortFn);

    return sortReplies([...comments]);
  }, [comments, sortOrder]);

  const resolveErrorMessage = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      return (
        (error.response?.data as { message?: string })?.message ||
        error.message ||
        "Đã xảy ra lỗi không xác định"
      );
    }
    if (error instanceof Error) {
      return error.message;
    }
    return "Đã xảy ra lỗi không xác định";
  };

  const handleCreateComment = async () => {
    if (!content.trim()) return;
    try {
      await createComment.mutateAsync({ content: content.trim() });
      setContent("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to post comment",
        description: resolveErrorMessage(error),
      });
    }
  };

  const handleReplySubmit = async (parentCommentId: string, replyContent: string) => {
    try {
      await createComment.mutateAsync({ content: replyContent, parentCommentId });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to post reply",
        description: resolveErrorMessage(error),
      });
    }
  };

  const handleToggleLike = async (commentId: string) => {
    try {
      await toggleLike.mutateAsync(commentId);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to update like",
        description: resolveErrorMessage(error),
      });
    }
  };

  return (
    <div className="flex flex-col bg-transparent">
      {/* Header */}
      <div className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">{comments.length}</h2>
          <span className="text-xl font-semibold">Comments</span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "newest" | "oldest")}>
            <SelectTrigger className="w-[160px] h-9 border-none bg-transparent hover:bg-muted/50 focus:ring-0 shadow-none">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Add Comment Input */}
      {isAuthenticated ? (
        <div className="pb-8">
          <div className="flex items-start gap-4">
            <Input
              placeholder="Add a comment..."
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleCreateComment();
                }
              }}
              className="flex-1 border-0 border-b border-border/40 rounded-none bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-foreground/80"
            />
          </div>
          {content.trim() && (
            <div className="flex justify-end gap-2 mt-2">
              <Button
                onClick={() => setContent("")}
                size="sm"
                variant="ghost"
                className="rounded-full hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateComment}
                disabled={createComment.isPending || !content.trim()}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
              >
                {createComment.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Comment"
                )}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="pb-6">
          <p className="text-sm text-muted-foreground">
            Please sign in to comment.
          </p>
        </div>
      )}

      {/* Comments List */}
      <div className="flex-1">
        {commentsQuery.isPending ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedComments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No comments yet. Be the first to comment!</p>
        ) : (
          <div className="space-y-1">
            {sortedComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isAuthenticated={isAuthenticated}
                onReplySubmit={handleReplySubmit}
                onToggleLike={handleToggleLike}
              />
            ))}
          </div>
        )}

        {commentsQuery.hasNextPage && (
          <div className="flex justify-center pt-6">
            <Button
              variant="ghost"
              onClick={() => commentsQuery.fetchNextPage()}
              disabled={commentsQuery.isFetchingNextPage}
              className="text-sm"
            >
              {commentsQuery.isFetchingNextPage ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading more...
                </span>
              ) : (
                "Show more comments"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

