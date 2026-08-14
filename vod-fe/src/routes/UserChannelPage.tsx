import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { Input } from "@/components/ui/input";
import {
  Play,
  Clock,
  Loader2,
  Users,
  Video,
  MoreVertical,
  Settings,
  Trash,
  Search,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetPublicVideosByUsername } from "@/hooks/Video/useGetPublicVideosByUsername";
import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";
import { useToast } from "@/hooks/use-toast";
import { useSubscribe } from "@/hooks/Subscription/useSubscribe";
import { useUnsubscribe } from "@/hooks/Subscription/useUnsubscribe";
import { useGetSubscriptionStats } from "@/hooks/Subscription/useGetSubscriptionStats";

const UserChannelPage = () => {
  const { atUsername } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const username = atUsername?.startsWith("@")
    ? atUsername.slice(1)
    : atUsername;

  const { data: videos, isLoading: videosLoading } =
    useGetPublicVideosByUsername(username || "", 50);
  const { data: subscriptionStats } = useGetSubscriptionStats(username);

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const isOwner = user?.username === username;

  const formatDuration = (seconds?: number) => {
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
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US");
  };

  // Filter items based on search query
  const filterItems = (items: any[]) => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.title?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
    );
  };

  const { mutateAsync: deleteVideo, isPending: isDeletingVideo } = useMutation({
    mutationFn: async (videoId: string) => {
      await axios.delete(`/api/videos/${videoId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["publicVideos", username],
      });
      toast({
        title: "Đã xóa video",
        description: "Video đã được xóa thành công.",
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error || error?.message || "Failed to delete video";
      toast({
        title: "Xóa video thất bại",
        description: message,
        variant: "destructive",
      });
    },
  });

  const subscribeMutation = useSubscribe();
  const unsubscribeMutation = useUnsubscribe();

  const handleSubscribe = useCallback(async () => {
    if (!username) return;
    try {
      if (subscriptionStats?.isSubscribed) {
        await unsubscribeMutation.mutateAsync(username);
        toast({
          title: "Đã hủy đăng ký",
          description: `Bạn đã hủy đăng ký kênh ${username}`,
        });
      } else {
        await subscribeMutation.mutateAsync(username);
        toast({
          title: "Đã đăng ký",
          description: `Bạn đã đăng ký kênh ${username}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  }, [username, subscriptionStats?.isSubscribed, subscribeMutation, unsubscribeMutation, toast]);

  const handleDelete = useCallback(
    async (item: any) => {
      const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa "${item.title}"?`);
      if (!confirmed) {
        return;
      }
      await deleteVideo(item.id);
    },
    [deleteVideo]
  );

  if (!username) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Channel not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Channel Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <UserAvatar
              username={username}
              size="xl"
            />
            <div>
              <h1 className="text-2xl font-bold">{username}</h1>
              <p className="text-muted-foreground">@{username}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {subscriptionStats?.subscriberCount !== undefined
                      ? subscriptionStats.subscriberCount.toLocaleString("en-US")
                      : "0"}{" "}
                    người đăng ký
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Video className="h-4 w-4" />
                  <span>
                    {Array.isArray(videos) ? videos.length : 0} videos
                  </span>
                </div>
              </div>
            </div>
            {!isOwner && (
              <Button
                className="ml-auto rounded-full"
                onClick={handleSubscribe}
                disabled={
                  subscribeMutation.isPending || unsubscribeMutation.isPending
                }
                variant={
                  subscriptionStats?.isSubscribed ? "outline" : "default"
                }
              >
                {subscribeMutation.isPending || unsubscribeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : subscriptionStats?.isSubscribed ? (
                  "Đã đăng ký"
                ) : (
                  "Đăng ký"
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="relative mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Videos</h2>

            {/* Search */}
            <div className="flex items-center gap-2">
              {showSearch ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 h-8"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery("");
                    }}
                    className="p-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSearch(true)}
                  className="p-2 text-muted-foreground hover:text-foreground"
                >
                  <Search className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-px bg-border mt-3" />
        </div>

        {/* Videos Content */}
        <div>
          {videosLoading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !Array.isArray(videos) || videos.length === 0 ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <p className="text-muted-foreground">No videos yet</p>
            </div>
          ) : filterItems(videos).length === 0 ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <p className="text-muted-foreground">
                No videos found with keyword "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filterItems(videos).map((item) => {
                const thumbnailSrc =
                  item.thumbnail && item.thumbnail.trim().length > 0
                    ? item.thumbnail
                    : "/placeholder.svg";

                return (
                  <Card
                    key={item.id}
                    className="group cursor-pointer transition-all duration-300 hover:shadow-medium"
                    onClick={() => navigate(`/video/${item.id}`)}
                  >
                    <CardContent className="p-0">
                      {/* Thumbnail */}
                      <div className="relative aspect-video overflow-hidden rounded-t-lg">
                        <img
                          src={thumbnailSrc}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                          <Button
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-primary/90 hover:bg-primary text-primary-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/video/${item.id}`);
                            }}
                          >
                            <Play className="h-6 w-6" />
                          </Button>
                        </div>
                        {item.duration && item.duration > 0 && (
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(item.duration)}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold line-clamp-2 text-sm leading-5 group-hover:text-primary transition-colors flex-1">
                            {item.title}
                          </h3>
                          {isOwner && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
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
                                    navigate(`/manage/videos/${item.id}`);
                                  }}
                                >
                                  <Settings className="h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-destructive focus:text-destructive"
                                  disabled={isDeletingVideo}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    void handleDelete(item);
                                  }}
                                >
                                  <Trash className="h-4 w-4" />
                                  Xóa
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <UserAvatar
                            username={username}
                            size="sm"
                          />
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p className="font-medium text-foreground">
                              {username}
                            </p>
                            <p>{formatDate(item.uploadedDate)}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserChannelPage;
