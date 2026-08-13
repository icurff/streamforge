import { useMemo, useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { VideoComment } from "@/hooks/Video/useVideoComments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

type CommentItemProps = {
  comment: VideoComment;
  depth?: number;
  isAuthenticated: boolean;
  onReplySubmit: (parentId: string, content: string) => Promise<void>;
  onToggleLike: (commentId: string) => Promise<void>;
  rootParentId?: string; // ID of the root parent comment for nested replies
};

export function CommentItem({
  comment,
  depth = 0,
  isAuthenticated,
  onReplySubmit,
  onToggleLike,
  rootParentId,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [showReplies, setShowReplies] = useState(true);

  const initials = useMemo(() => {
    if (!comment.username) return "?";
    return comment.username
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [comment.username]);

  const relativeTime = useMemo(() => {
    if (!comment.createdAt) return "";
    const created = new Date(comment.createdAt);
    if (Number.isNaN(created.getTime())) {
      return comment.createdAt;
    }

    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const secondsElapsed = Math.floor((Date.now() - created.getTime()) / 1000);

    const divisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
      { amount: 60, unit: "second" },
      { amount: 60, unit: "minute" },
      { amount: 24, unit: "hour" },
      { amount: 7, unit: "day" },
      { amount: 4.34524, unit: "week" },
      { amount: 12, unit: "month" },
      { amount: Number.POSITIVE_INFINITY, unit: "year" },
    ];

    let duration = secondsElapsed;
    let unit: Intl.RelativeTimeFormatUnit = "second";

    for (const division of divisions) {
      if (Math.abs(duration) < division.amount) {
        unit = division.unit;
        break;
      }
      duration /= division.amount;
      unit = division.unit;
    }

    const rounded = Math.max(1, Math.round(Math.abs(duration)));
    return rtf.format(-rounded, unit);
  }, [comment.createdAt]);

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) return;
    try {
      setIsSubmittingReply(true);
      // If this is a nested reply (depth > 0), reply to the root parent instead
      // This prevents creating deeply nested comment threads (like YouTube)
      const targetParentId = rootParentId || comment.id;
      await onReplySubmit(targetParentId, replyContent.trim());
      setReplyContent("");
      setIsReplying(false);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleToggleLike = async () => {
    if (!isAuthenticated || isTogglingLike) return;
    try {
      setIsTogglingLike(true);
      await onToggleLike(comment.id);
    } finally {
      setIsTogglingLike(false);
    }
  };

  const displayDate = relativeTime;

  return (
    <article
      className={cn(
        "group relative flex gap-4 py-3",
        depth > 0 && "mt-2"
      )}
      data-comment-id={comment.id}
    >
      {comment.username && (
        <UserAvatar
          username={comment.username}
          size="md"
        />
      )}

      <div className="flex-1 space-y-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{comment.username}</span>
            {displayDate && (
              <span className="text-xs text-muted-foreground/70">{displayDate}</span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-foreground mt-0.5 whitespace-pre-line break-words">
            {comment.content}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-1 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-auto p-0 hover:bg-transparent font-medium text-xs flex items-center gap-1",
              comment.likedByCurrentUser
                ? "text-red-500"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={handleToggleLike}
            disabled={!isAuthenticated || isTogglingLike}
          >
            <Heart
              className={cn(
                "h-4 w-4",
                comment.likedByCurrentUser ? "fill-current" : ""
              )}
            />
            {comment.likesCount > 0 && <span>{comment.likesCount}</span>}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-3 py-1 rounded-full hover:bg-muted font-semibold text-xs text-foreground"
            onClick={() => {
              if (!isAuthenticated) return;
              setIsReplying((prev) => !prev);
            }}
            disabled={!isAuthenticated}
          >
            Reply
          </Button>
        </div>

        {/* Reply Input Section */}
        {isReplying && (
          <div className="mt-3 space-y-3">
            <div className="flex items-start gap-3">
              {comment.username && (
                <UserAvatar
                  username={comment.username}
                  size="sm"
                />
              )}
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder={`Reply to @${comment.username}...`}
                  value={replyContent}
                  onChange={(event) => setReplyContent(event.target.value)}
                  rows={2}
                  autoFocus
                  className="flex-1 text-sm resize-none rounded-none border-0 border-b border-border/40 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground/60"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsReplying(false);
                  setReplyContent("");
                }}
                className="text-foreground hover:bg-muted rounded-full"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleReplySubmit}
                disabled={isSubmittingReply || !replyContent.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
              >
                {isSubmittingReply ? "Replying..." : "Reply"}
              </Button>
            </div>
          </div>
        )}

        {/* Replies Section */}
        {comment.replies?.length ? (
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplies(!showReplies)}
              className="h-auto px-3 py-1.5 hover:bg-primary/10 text-primary font-semibold text-sm mb-3 flex items-center gap-2 rounded-full"
            >
              <span className="text-xs">{showReplies ? "▼" : "->"}</span>
              {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
            </Button>
            {showReplies && (
              <div className="space-y-1 pl-0 ml-14">
                {comment.replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    depth={depth + 1}
                    isAuthenticated={isAuthenticated}
                    onReplySubmit={onReplySubmit}
                    onToggleLike={onToggleLike}
                    rootParentId={rootParentId || comment.id}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}



