import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThumbsUp, MessageCircle, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGetLikeInfo } from "@/hooks/useGetLikeInfo";
import { useToggleLike } from "@/hooks/useToggleLike";

type FeedItemActionsProps = {
  itemId: string;
  itemType: "video" | "livestream";
  commentCount: React.ReactNode;
};

export const FeedItemActions = ({ itemId, itemType, commentCount }: FeedItemActionsProps) => {
  const navigate = useNavigate();
  const { data: likeInfo } = useGetLikeInfo(itemId, itemType);
  const toggleLikeMutation = useToggleLike();

  const handleLikeClick = () => {
    toggleLikeMutation.mutate({ contentId: itemId, contentType: itemType });
  };

  const handleCommentClick = () => {
    if (itemType === "video") {
      navigate(`/video/${itemId}`);
    } else {
      navigate(`/livestream/${itemId}`);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-muted rounded-full">
        <Button
          variant="ghost"
          size="sm"
          className={`rounded-l-full hover:bg-muted-foreground/10 ${
            likeInfo?.isLiked ? "text-primary" : ""
          }`}
          onClick={handleLikeClick}
          disabled={toggleLikeMutation.isPending}
        >
          <ThumbsUp className={`h-4 w-4 mr-2 ${likeInfo?.isLiked ? "fill-current" : ""}`} />
          <span className="text-sm font-medium">{likeInfo?.likeCount ?? 0}</span>
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant="ghost"
          size="sm"
          className="rounded-r-full hover:bg-muted-foreground/10"
          onClick={handleCommentClick}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          {commentCount}
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="rounded-full bg-muted hover:bg-muted-foreground/10"
      >
        <Share2 className="h-4 w-4 mr-2" />
        Share
      </Button>
    </div>
  );
};
