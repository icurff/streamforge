import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import YouTubeVideoPlayer from "@/components/YouTubeVideoPlayer";
import { useVideoComments } from "@/hooks/Video/useVideoComments";
import { Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";
import { FeedItemActions } from "@/components/FeedItemActions";


type FeedItem = {
  id: string;
  type: "video" | "livestream";
  username: string;
  title: string;
  description: string;
  thumbnail: string;
  uploadedDate: string;
  serverLocation?: string;
  server_locations?: string[];
  dvrPath?: string;
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
    const visibleCount = countComments(firstPage.comments || []);
    // If there are more pages, we can't know the exact count, so just show the visible count
    return visibleCount;
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

  // Fetch livestreams with infinite query
  const {
    data: livestreamsData,
    fetchNextPage: fetchNextLivestreams,
    hasNextPage: hasNextLivestreams,
    isFetchingNextPage: isFetchingNextLivestreams,
    isLoading: livestreamsLoading,
  } = useInfiniteQuery({
    queryKey: ["allPublicLivestreams", "infinite"],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await axios.get(`/api/livestream/public`, {
        params: { limit: PAGE_SIZE, offset: pageParam * PAGE_SIZE },
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
    initialPageParam: 0,
  });

  // Combine all videos and livestreams
  const videos = useMemo(() => {
    return videosData?.pages.flat() || [];
  }, [videosData]);

  const livestreams = useMemo(() => {
    return livestreamsData?.pages.flat() || [];
  }, [livestreamsData]);

  // Combine videos and livestreams into feed items
  const feedItems = useMemo(() => {
    const items: FeedItem[] = [];

    // Add videos
    videos.forEach((video) => {
      items.push({
        id: video.id,
        type: "video",
        username: video.username,
        title: video.title,
        description: video.description || "",
        thumbnail: video.thumbnail || "",
        uploadedDate: video.uploadedDate,
        server_locations: (video as any).server_locations,
      });
    });

    // Add livestreams
    livestreams.forEach((livestream) => {
      items.push({
        id: livestream.id,
        type: "livestream",
        username: livestream.username,
        title: livestream.title,
        description: livestream.description || "",
        thumbnail: livestream.thumbnail || "",
        uploadedDate: livestream.uploadedDate,
        dvrPath: livestream.dvrPath,
        serverLocation: (livestream as any).serverLocation,
      });
    });

    // Sort by uploadedDate descending
    items.sort((a, b) => {
      const dateA = new Date(a.uploadedDate).getTime();
      const dateB = new Date(b.uploadedDate).getTime();
      return dateB - dateA;
    });

    return items;
  }, [videos, livestreams]);

  // Get video URL for a feed item
  const getVideoUrl = (item: FeedItem): string => {
    if (item.type === "livestream" && item.dvrPath) {
      // For livestream recordings, use DVR path
      const dvrPath = item.dvrPath;

      // If it's already a URL, return it
      if (dvrPath.startsWith("http://") || dvrPath.startsWith("https://")) {
        return dvrPath;
      }

      // Construct URL from server location
      // DVR files are stored in: /storage/outputs/username/livestreams/livestreamId/file.mp4
      // They should be served via: http://serverLocation/livestreams/username/livestreamId/file.mp4
      const serverLocation = item.serverLocation || "localhost:80";
      let baseUrl = serverLocation.trim();
      if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
        baseUrl = `http://${baseUrl}`;
      }
      baseUrl = baseUrl.replace(/\/$/, "");

      // Extract filename from dvrPath
      // dvrPath format: /storage/outputs/username/livestreams/livestreamId/file.mp4
      // We need: /livestreams/username/livestreamId/file.mp4
      const pathParts = dvrPath.split("/");
      const livestreamsIndex = pathParts.findIndex(
        (part) => part === "livestreams"
      );
      if (livestreamsIndex >= 0) {
        // Get username (the part before "livestreams")
        const username = pathParts[livestreamsIndex - 1];
        // Get everything after "livestreams" (livestreamId/file.mp4)
        const afterLivestreams = pathParts.slice(livestreamsIndex + 1).join("/");
        return `${baseUrl}/livestreams/${username}/${afterLivestreams}`;
      }

      // Fallback: try to construct path manually
      const fileName = pathParts[pathParts.length - 1];
      return `${baseUrl}/livestreams/${item.username}/${item.id}/${fileName}`;
    } else if (item.type === "video") {
      // For videos, use HLS master playlist
      const serverLocation = item.server_locations?.[0];
      if (!serverLocation) return "";
      let baseUrl = serverLocation.trim();
      if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
        baseUrl = `http://${baseUrl}`;
      }
      baseUrl = baseUrl.replace(/\/$/, "");
      return `${baseUrl}/videos/${item.username}/${item.id}/master.m3u8`;
    }
    return "";
  };

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && (hasNextVideos || hasNextLivestreams)) {
        if (hasNextVideos) {
          fetchNextVideos();
        }
        if (hasNextLivestreams) {
          fetchNextLivestreams();
        }
      }
    },
    [hasNextVideos, hasNextLivestreams, fetchNextVideos, fetchNextLivestreams]
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

  if (videosLoading || livestreamsLoading) {
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
                const itemKey = `${item.type}-${item.id}`;
                const isDescriptionExpanded = expandedDescriptions.has(itemKey);
                const shouldShowExpandButton = item.description && item.description.length > 100;

                return (
                  <div key={itemKey} className="space-y-4 pb-8 border-b border-border last:border-b-0 last:pb-0">
                    {/* Video Player - Smaller size */}
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
                          <Badge variant="secondary" className="bg-red-500 text-white text-xs">
                            {item.type === "livestream" ? "LIVE" : "VIDEO"}
                          </Badge>
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
                          itemType={item.type}
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
               {(isFetchingNextVideos || isFetchingNextLivestreams) && (
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

