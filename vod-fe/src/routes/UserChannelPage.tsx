import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Play,
  Radio,
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
import { useGetLivestreamRecordingsByUsername } from "@/hooks/Livestream/useGetLivestreamRecordingsByUsername";
import { useGetLiveStreamByUsername } from "@/hooks/Livestream/useGetLiveStreamByUsername";
import { useGetLivestream } from "@/hooks/Livestream/useGetLivestream";
import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSubscribe } from "@/hooks/Subscription/useSubscribe";
import { useUnsubscribe } from "@/hooks/Subscription/useUnsubscribe";
import { useGetSubscriptionStats } from "@/hooks/Subscription/useGetSubscriptionStats";

const UserChannelPage = () => {
  const { atUsername } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Remove @ prefix if present
  const username = atUsername?.startsWith("@")
    ? atUsername.slice(1)
    : atUsername;

  const { data: videos, isLoading: videosLoading } =
    useGetPublicVideosByUsername(username || "", 50);
  const { data: livestreams, isLoading: livestreamsLoading } =
    useGetLivestreamRecordingsByUsername(username || "", 50);
  const { data: currentLiveStream } = useGetLiveStreamByUsername(
    username || ""
  );
  const { data: subscriptionStats } = useGetSubscriptionStats(username);

  const [activeTab, setActiveTab] = useState<"videos" | "livestreams">(
    "videos"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const isOwner = user?.username === username;
  const isLive = currentLiveStream?.isLive || false;
  
  // Refs for tab buttons to calculate active indicator position
  const videosTabRef = useRef<HTMLButtonElement>(null);
  const livestreamsTabRef = useRef<HTMLButtonElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({
    width: 0,
    left: 0,
  });

  // Update indicator position when active tab changes
  useEffect(() => {
    const activeRef = activeTab === "videos" ? videosTabRef : livestreamsTabRef;
    if (activeRef.current) {
      const rect = activeRef.current.getBoundingClientRect();
      const container = activeRef.current.parentElement;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        setIndicatorStyle({
          width: rect.width,
          left: rect.left - containerRect.left,
        });
      }
    }
  }, [activeTab]);

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

  const getUserInitials = (username: string) => {
    return username
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const handleLivestreamClick = (livestream: any, isCurrentlyLive: boolean) => {
    if (isCurrentlyLive) {
      // Navigate to live stream page
      navigate(`/@${username}/live`);
    } else {
      // Navigate to play livestream DVR page
      navigate(`/livestream/${livestream.id}`, {
        state: { livestream },
      });
    }
  };

  const handleCurrentLiveClick = () => {
    if (isLive) {
      navigate(`/@${username}/live`);
    }
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
        title: "Video deleted",
        description: "Video has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error || error?.message || "Failed to delete video";
      toast({
        title: "Failed to delete video",
        description: message,
        variant: "destructive",
      });
    },
  });

  const { mutateAsync: deleteLivestream, isPending: isDeletingLivestream } =
    useMutation({
      mutationFn: async (livestreamId: string) => {
        await axios.delete(`/api/livestream/${livestreamId}`);
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: ["livestreamRecordings", username],
        });
        toast({
          title: "Livestream deleted",
          description: "Livestream has been deleted successfully.",
        });
      },
      onError: (error: any) => {
        const message =
          error?.response?.data?.error || error?.message || "Failed to delete livestream";
        toast({
          title: "Failed to delete livestream",
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
      const confirmed = window.confirm(`Are you sure you want to delete "${item.title}"?`);
      if (!confirmed) {
        return;
      }

      try {
        if (item.type === "video") {
          await deleteVideo(item.id);
        } else {
          await deleteLivestream(item.id);
        }
      } catch (error) {
        // Error is handled by mutation
      }
    },
    [deleteVideo, deleteLivestream]
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

  const isLoading = videosLoading || livestreamsLoading;

  // Filter items based on active tab
  const displayItems =
    activeTab === "videos"
      ? Array.isArray(videos)
        ? videos.map((v) => ({ ...v, type: "video" as const }))
        : []
      : Array.isArray(livestreams)
      ? livestreams.map((l) => ({ ...l, type: "livestream" as const }))
      : [];

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
                    {Array.isArray(livestreams) && livestreams.length > 0 && (
                      <span> • {livestreams.length} livestreams</span>
                    )}
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
            {/* {isOwner && (
              <Button className="ml-auto rounded-full" variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Manage channel
              </Button>
            )} */}
          </div>
        </div>

        <div className="relative mb-6">
          {/* Tabs */}
          <div className="flex items-center gap-8">
            {["videos", "livestreams"].map((tab) => (
              <button
                key={tab}
                ref={tab === "videos" ? videosTabRef : livestreamsTabRef}
                onClick={() => setActiveTab(tab as "videos" | "livestreams")}
                className={`relative text-sm font-medium leading-none pb-3 transition-colors ${
                  activeTab === tab
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "videos" ? "Videos" : "Live"}
              </button>
            ))}

            {/* Search cùng cấp */}
            <div className="ml-auto flex items-center gap-2">
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

          {/* Baseline (gạch xám – giống YouTube) */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />

          {/* Active indicator (gạch đen – YouTube style) */}
          <div
            className="absolute bottom-0 h-[2px] bg-foreground transition-all duration-300"
            style={{
              width: `${indicatorStyle.width}px`,
              left: `${indicatorStyle.left}px`,
            }}
          />
        </div>

        {/* Tabs Content */}
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "videos" | "livestreams")
          }
          className="mb-6"
        >
          {/* Videos Tab */}
          <TabsContent value="videos" className="mt-0">
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
                                      void handleDelete({
                                        ...item,
                                        type: "video",
                                      });
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
          </TabsContent>

          {/* Livestreams Tab */}
          <TabsContent value="livestreams" className="mt-0">
            {livestreamsLoading ? (
              <div className="flex items-center justify-center min-h-[40vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              (() => {
                // Combine current live stream with recordings
                const allLivestreams = [];

                // Add current live stream first if exists
                if (isLive && currentLiveStream) {
                  allLivestreams.push({
                    id: `live-${currentLiveStream.id || "current"}`,
                    title: currentLiveStream.title || "Live Stream",
                    description: currentLiveStream.description || "",
                    thumbnail: "",
                    duration: 0,
                    uploadedDate: new Date().toISOString(),
                    isCurrentlyLive: true,
                    type: "livestream" as const,
                  });
                }

                // Add recordings
                if (Array.isArray(livestreams)) {
                  allLivestreams.push(
                    ...livestreams.map((l) => ({
                      ...l,
                      isCurrentlyLive: false,
                      type: "livestream" as const,
                    }))
                  );
                }

                const filteredLivestreams = filterItems(allLivestreams);

                if (filteredLivestreams.length === 0) {
                  return (
                    <div className="flex items-center justify-center min-h-[40vh]">
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? `No livestreams found with keyword "${searchQuery}"`
                          : "No livestreams yet"}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredLivestreams.map((item) => {
                      const thumbnailSrc =
                        item.thumbnail && item.thumbnail.trim().length > 0
                          ? item.thumbnail
                          : "/placeholder.svg";
                      const isCurrentlyLive = item.isCurrentlyLive || false;

                      return (
                        <Card
                          key={item.id}
                          className="group cursor-pointer transition-all duration-300 hover:shadow-medium"
                          onClick={() =>
                            handleLivestreamClick(item, isCurrentlyLive)
                          }
                        >
                          <CardContent className="p-0">
                            {/* Thumbnail */}
                            <div className="relative aspect-video overflow-hidden rounded-t-lg">
                              {isCurrentlyLive ? (
                                <div className="w-full h-full bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center">
                                  <Radio className="h-16 w-16 text-white animate-pulse" />
                                </div>
                              ) : (
                                <img
                                  src={thumbnailSrc}
                                  alt={item.title}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  loading="lazy"
                                />
                              )}
                              {isCurrentlyLive && (
                                <div className="absolute top-2 left-2">
                                  <Badge
                                    variant="destructive"
                                    className="uppercase flex items-center gap-1 animate-pulse"
                                  >
                                    <Radio className="h-3 w-3" />
                                    Live
                                  </Badge>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                                <Button
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-primary/90 hover:bg-primary text-primary-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLivestreamClick(
                                      item,
                                      isCurrentlyLive
                                    );
                                  }}
                                >
                                  <Play className="h-6 w-6" />
                                </Button>
                              </div>
                              {!isCurrentlyLive && (
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
                                {isOwner && !isCurrentlyLive && (
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
                                          navigate(`/manage/livestreams/${item.id}`);
                                        }}
                                      >
                                        <Settings className="h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="gap-2 text-destructive focus:text-destructive"
                                        disabled={isDeletingLivestream}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          void handleDelete({
                                            ...item,
                                            type: "livestream",
                                          });
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
                                  <p>
                                    {isCurrentlyLive
                                      ? "Đang phát trực tiếp"
                                      : formatDate(item.uploadedDate)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserChannelPage;
