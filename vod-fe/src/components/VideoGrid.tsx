import {
  Play,
  MoreVertical,
  Clock,
  Trash,
  Settings,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useListRecentVideos } from "@/hooks/Video/useListRecentVideos";
import { useNavigate } from "react-router-dom";
import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";
import { useToast } from "@/hooks/use-toast";
import { useUpdateVideoPrivacy } from "@/hooks/Video/useUpdateVideoPrivacy";
import { type VideoPrivacy } from "@/types/video";

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString();
}

function formatDuration(seconds?: number) {
  if (!seconds) return "";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VideoGrid() {
  const { data: videos, isLoading } = useListRecentVideos(12);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingPrivacyId, setPendingPrivacyId] = useState<string | null>(null);

  const { mutateAsync: deleteVideo, isPending } = useMutation({
    mutationFn: async (videoId: string) => {
      await axios.delete(`/api/videos/${videoId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["recentVideos"] });
    },
  });

  const { isPending: isPrivacyUpdating } = useUpdateVideoPrivacy();

  const handleDelete = useCallback(
    async (videoId: string, title: string) => {
      const confirmed = window.confirm(
        `Are you sure you want to delete video "${title}"?`
      );
      if (!confirmed) {
        return;
      }

      try {
        setPendingDeleteId(videoId);
        await deleteVideo(videoId);
        toast({
          title: "Video deleted",
          description: `Video "${title}" has been deleted.`,
        });
      } catch (error: any) {
        const message =
          error?.response?.data?.error || error?.message || "Failed to delete video";
        toast({
          title: "Failed to delete video",
          description: message,
          variant: "destructive",
        });
      } finally {
        setPendingDeleteId(null);
      }
    },
    [deleteVideo, toast]
  );

  const isAnyActionPending = isPending || isPrivacyUpdating;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Recent uploads</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.isArray(videos) ? videos.map((video) => {
          const thumbnailSrc =
            video.thumbnail && video.thumbnail.trim().length > 0
              ? video.thumbnail
              : "/placeholder.svg";

          return (
            <Card
              key={video.id}
              className="group cursor-pointer transition-all duration-300 hover:shadow-medium"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/manage/videos/${video.id}`);
              }}
            >
              <CardContent className="p-0">
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden rounded-t-lg">
                  <img
                    src={thumbnailSrc}
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <Button
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-primary/90 hover:bg-primary text-primary-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/video/${video.id}`);
                      }}
                    >
                      <Play className="h-6 w-6" />
                    </Button>
                  </div>
                  {video.duration && video.duration > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(video.duration)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold line-clamp-2 text-sm leading-5 group-hover:text-primary transition-colors">
                      {video.title}
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/manage/videos/${video.id}`);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                          Manage video
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="gap-2 text-destructive focus:text-destructive"
                          disabled={
                            pendingDeleteId === video.id || isAnyActionPending
                          }
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleDelete(video.id, video.title);
                          }}
                        >
                          <Trash className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-3">
                    {user?.username && (
                      <UserAvatar
                        username={user.username}
                        size="sm"
                      />
                    )}
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">Your video</p>
                      <p>{formatDate(video.uploadedDate)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }) : []}
      </div>
    </div>
  );
}
