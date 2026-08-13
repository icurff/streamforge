import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { Loader2, Play, ThumbsUp, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGetLikedVideos } from "@/hooks/Video/useGetLikedVideos";

const LikedVideosPage = () => {
  const navigate = useNavigate();
  const { data: videos, isLoading } = useGetLikedVideos(50);

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US");
  };

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

  if (isLoading) {
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <ThumbsUp className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Liked videos</h1>
            </div>
            {!videos || videos.length === 0 ? (
              <div className="flex items-center justify-center min-h-[40vh]">
                <p className="text-muted-foreground">No liked content yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {videos.map((item) => {
                  const thumbnailSrc =
                    item.thumbnail && item.thumbnail.trim().length > 0
                      ? item.thumbnail
                      : "/placeholder.svg";

                    const isLivestream = item.type === "livestream";
                    const handleClick = () => {
                      if (isLivestream) {
                        navigate(`/livestream/${item.id}`);
                      } else {
                        navigate(`/video/${item.id}`);
                      }
                    };

                    return (
                      <Card
                        key={item.id}
                        className="group cursor-pointer transition-all duration-300 hover:shadow-medium"
                        onClick={handleClick}
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
                                handleClick();
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
                            {isLivestream && (
                              <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs">
                                LIVE
                              </Badge>
                            )}
                          </div>

                        {/* Content */}
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold line-clamp-2 text-sm leading-5 group-hover:text-primary transition-colors flex-1">
                              {item.title}
                            </h3>
                          </div>

                          <div className="flex items-center gap-3">
                            <UserAvatar username={item.username} size="sm" />
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p className="font-medium text-foreground">
                                {item.username}
                              </p>
                              <p>{formatDate(item.likedAt || item.uploadedDate)}</p>
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
        </main>
      </div>
    </div>
  );
};

export default LikedVideosPage;

