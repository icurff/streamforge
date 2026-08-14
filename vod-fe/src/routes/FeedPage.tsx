import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import YouTubeVideoPlayer from "@/components/YouTubeVideoPlayer";
import { useVideoComments } from "@/hooks/Video/useVideoComments";
import { Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";
import { FeedItemActions } from "@/components/FeedItemActions";

type FeedItem = {
  id: string;
  username: string;
  title: string;
  description: string;
  thumbnail: string;
  uploadedDate: string;
  server_locations?: string[];
};

// Component to get comment count for a video
const CommentCount = ({ videoId }: { videoId: string }) => {
  const { data } = useVideoComments(videoId, 1);
  const count = useMemo(() => {
    if (!data || !data.pages[0]) return 0;
    const firstPage = data.pages[0];
    const countComments = (comments: any[]): number => {
      return comments.reduce((sum, comment) => {
        return sum + 1 + (comment.replies ? countComments(comment.replies) : 0);
      }, 0);
    };
    return countComments(firstPage.comments || []);
  }, [data]);

  return <span className="text-sm font-medium">{count}</span>;
};

const FeedPage = () => {
  const navigate = useNavigate();
  const observerTarget = useRef<HTMLDivElement>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

  const PAGE_SIZE = 20;

  // Fetch videos with infinite query
  const {
    data: videosData,
    fetchNextPage: fetchNextVideos,
    hasNextPage: hasNextVideos,
    isFetchingNextPage: isFetchingNextVideos,
    isLoading: videosLoading,
  } = useInfiniteQuery({
    queryKey: ["allPublicVideos", "infinite"],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await axios.get(`/api/videos/public`, {
        params: { limit: PAGE_SIZE, offset: pageParam * PAGE_SIZE },
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
    initialPageParam: 0,
  });

  const feedItems = useMemo(() => {
    const pages = videosData?.pages.flat() || [];
    return pages.map((video: any) => ({
      id: video.id,
      username: video.username,
      title: video.title,
      description: video.description || "",
      thumbnail: video.thumbnail || "",
      uploadedDate: video.uploadedDate,
      server_locations: video.server_locations,
    })).sort((a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime());
  }, [videosData]);

  // Get video URL for a feed item
  const getVideoUrl = (item: FeedItem): string => {
    const serverLocation = item.server_locations?.[0];
    if (!serverLocation) return "";
    let baseUrl = serverLocation.trim();
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `http://${baseUrl}`;
    }
    baseUrl = baseUrl.replace(/\/$/, "");
    return `${baseUrl}/videos/${item.username}/${item.id}/master.m3u8`;
  };

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextVideos) {
        fetchNextVideos();
      }
    },
    [hasNextVideos, fetchNextVideos]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    });

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [handleObserver]);

  const toggleDescription = (itemKey: string) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString("en-US");
  };

  if (videosLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <p className="text-muted-foreground">No videos to display</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-5xl mx-auto">
            <div className="space-y-8">
              {feedItems.map((item) => {
                const videoUrl = getVideoUrl(item);
                const itemKey = item.id;
                const isDescriptionExpanded = expandedDescriptions.has(itemKey);
                const shouldShowExpandButton = item.description && item.description.length > 100;

                return (
                  <div key={itemKey} className="space-y-4 pb-8 border-b border-border last:border-b-0 last:pb-0">
                    {/* Video Player */}
                    <div className="w-full max-w-4xl mx-auto">
                      <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        <YouTubeVideoPlayer
                          src={videoUrl}
                          poster={item.thumbnail || undefined}
                        />
                      </div>
                    </div>

                    {/* Video Info Section */}
                    <div className="w-full max-w-4xl mx-auto space-y-3">
                      {/* Title */}
                      <div>
                        <h2 className="text-2xl font-bold mb-2">{item.title}</h2>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{formatDate(item.uploadedDate)}</span>
                        </div>
                      </div>

                      {/* Description */}
                      {item.description && (
                        <div>
                          <p
                            className={`text-sm text-foreground whitespace-pre-line ${
                              !isDescriptionExpanded && shouldShowExpandButton
                                ? "line-clamp-2"
                                : ""
                            }`}
                          >
                            {item.description}
                          </p>
                          {shouldShowExpandButton && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-1 p-0 h-auto text-sm font-medium text-primary hover:bg-transparent hover:underline"
                              onClick={() => toggleDescription(itemKey)}
                            >
                              {isDescriptionExpanded ? "Show less" : "Show more"}
                            </Button>
                          )}
                        </div>
                      )}

                      {/* User Info and Actions */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full h-10 w-10"
                            onClick={() => navigate(`/@${item.username}`)}
                          >
                            <UserAvatar username={item.username} size="sm" />
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-auto p-0 font-semibold hover:underline"
                            onClick={() => navigate(`/@${item.username}`)}
                          >
                            @{item.username}
                          </Button>
                        </div>

                        {/* Action Buttons */}
                        <FeedItemActions
                          itemId={item.id}
                          commentCount={<CommentCount videoId={item.id} />}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Infinite scroll trigger */}
              <div ref={observerTarget} className="h-4" />

              {/* Loading indicator */}
              {isFetchingNextVideos && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FeedPage;
