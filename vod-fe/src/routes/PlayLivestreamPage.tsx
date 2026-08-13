import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, ThumbsUp, ThumbsDown, Share2, MoreHorizontal } from "lucide-react";
import { useState, useEffect } from "react";
import YouTubeVideoPlayer from "@/components/YouTubeVideoPlayer";
import axios from "@/config/CustomAxios";
import { VideoCommentsSection } from "@/components/VideoComments/VideoCommentsSection";
import { useGetLikeInfo } from "@/hooks/useGetLikeInfo";
import { useToggleLike } from "@/hooks/useToggleLike";

type Livestream = {
  id: string;
  username: string;
  title: string;
  description?: string;
  thumbnail?: string;
  dvrPath?: string;
  uploadedDate: string;
  serverLocation?: string;
};

const PlayLivestreamPage = () => {
  const { livestreamId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [livestream, setLivestream] = useState<Livestream | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDisliked, setIsDisliked] = useState(false);
  const { data: likeInfo } = useGetLikeInfo(livestreamId || "", "livestream", !!livestreamId);
  const toggleLikeMutation = useToggleLike();

  const handleLikeClick = () => {
    if (!livestreamId) return;
    toggleLikeMutation.mutate({ contentId: livestreamId, contentType: "livestream" });
    if (isDisliked) setIsDisliked(false);
  };

  useEffect(() => {
    // Get livestream from location state or fetch it
    if (location.state?.livestream) {
      setLivestream(location.state.livestream);
      setLoading(false);
    } else if (livestreamId) {
      // Fetch livestream by ID
      axios
        .get(`/api/livestream/${livestreamId}`)
        .then((response) => {
          setLivestream(response.data);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Failed to fetch livestream:", error);
          navigate("/", { replace: true });
        });
    } else {
      navigate("/", { replace: true });
    }
  }, [location.state, livestreamId, navigate]);

  const getVideoUrl = () => {
    if (!livestream?.dvrPath) return "";

    const dvrPath = livestream.dvrPath;

    // If it's already a URL, return it
    if (dvrPath.startsWith("http://") || dvrPath.startsWith("https://")) {
      return dvrPath;
    }

    // Construct URL from server location
    // DVR files are stored in: /storage/outputs/username/livestreams/livestreamId/file.mp4
    // They should be served via: http://serverLocation/livestreams/username/livestreamId/file.mp4
    const serverLocation = livestream.serverLocation || "localhost:80";
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
    return `${baseUrl}/livestreams/${livestream.username}/${livestreamId}/${fileName}`;
  };

  const getThumbnailUrl = () => {
    if (!livestream) return undefined;
    return livestream.thumbnail && livestream.thumbnail.trim().length > 0
      ? livestream.thumbnail
      : undefined;
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!livestream) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <p className="text-muted-foreground">Livestream not found</p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-[1280px]">
        <Button
          onClick={() => navigate(`/@${livestream.username}`)}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to channel
        </Button>

        {/* Video Player */}
        <div className="mb-4">
          <YouTubeVideoPlayer src={getVideoUrl()} poster={getThumbnailUrl()} />
        </div>

        {/* Livestream Title */}
        <div className="mb-3">
          <h1 className="text-xl font-semibold mb-2">{livestream.title}</h1>
        </div>

        {/* Livestream Info Row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          {/* Channel Info */}
          <div className="flex items-center gap-3">
            <UserAvatar
              username={livestream.username}
              size="md"
              onClick={() => navigate(`/@${livestream.username}`)}
            />
            <div
              className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate(`/@${livestream.username}`)}
            >
              <span className="font-semibold text-sm">
                {livestream.username}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(livestream.uploadedDate).toLocaleDateString("en-US")}
              </span>
            </div>
            <Button
              variant="default"
              className="ml-4 rounded-full bg-foreground text-background hover:bg-foreground/90"
              onClick={() => navigate(`/@${livestream.username}`)}
            >
              Visit channel
            </Button>
          </div>

          {/* Action Buttons */}
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
                <ThumbsUp className={`h-5 w-5 mr-2 ${likeInfo?.isLiked ? "fill-current" : ""}`} />
                <span className="font-medium">{likeInfo?.likeCount ?? 0}</span>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-r-full hover:bg-muted-foreground/10 ${
                  isDisliked ? "text-primary" : ""
                }`}
                onClick={() => setIsDisliked(!isDisliked)}
              >
                <ThumbsDown className="h-5 w-5" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="rounded-full bg-muted hover:bg-muted-foreground/10"
            >
              <Share2 className="h-5 w-5 mr-2" />
              Share
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-muted hover:bg-muted-foreground/10"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Description */}
        {livestream.description && (
          <div className="bg-muted/40 rounded-xl p-4 mb-6">
            <p className="text-sm whitespace-pre-line">
              {livestream.description}
            </p>
          </div>
        )}

        {/* Comments Section */}
        <div>
          <VideoCommentsSection videoId={livestream.id} />
        </div>
      </div>
    </div>
  );
};

export default PlayLivestreamPage;
