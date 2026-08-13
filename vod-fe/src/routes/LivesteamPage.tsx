import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Radio } from "lucide-react";
import axios from "@/config/CustomAxios";
import { UserAvatar } from "@/components/UserAvatar";
import { LiveChat } from "@/components/LiveChat/LiveChat";
import flvjs from "flv.js";

interface LiveStreamResponse {
  id?: string;
  username: string;
  title?: string;
  description?: string;
  isLive: boolean;
  streamEndpoint?: string;
  privacy?: string;
  message?: string;
}

const LivestreamPage = () => {
  const { atUsername } = useParams();
  const navigate = useNavigate();
  // Remove @ prefix if present (route is /:atUsername/live, URL is /@username/live)
  const username = atUsername?.startsWith("@")
    ? atUsername.slice(1)
    : atUsername;
  const [stream, setStream] = useState<LiveStreamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const flvPlayerRef = useRef<flvjs.Player | null>(null);

  useEffect(() => {
    if (username) {
      fetchStreamInfo(username);
    } else {
      // No username provided, redirect to home
      navigate("/", { replace: true });
    }
  }, [username, navigate]);

  // Setup FLV player when stream is live
  useEffect(() => {
    console.log("Checking stream status:", {
      isLive: stream?.isLive,
      url: stream?.streamEndpoint,
      videoElement: !!videoRef.current,
    });

    if (!stream?.isLive || !stream?.streamEndpoint || !videoRef.current) {
      if (flvPlayerRef.current) {
        console.log("Cleaning up player (stream offline or invalid)");
        try {
          flvPlayerRef.current.unload();
          flvPlayerRef.current.detachMediaElement();
          flvPlayerRef.current.destroy();
        } catch (e) {
          console.error("Error cleaning up FLV player:", e);
        }
        flvPlayerRef.current = null;
      }
      return;
    }

    if (!flvjs.isSupported()) {
      console.warn("FLV.js is not supported in this browser");
      return;
    }

    // If player exists and URL matches, don't recreate
    // Actually, force recreate to be safe if we are here
    if (flvPlayerRef.current) {
      console.log("Destroying existing player before recreating");
      try {
        flvPlayerRef.current.unload();
        flvPlayerRef.current.detachMediaElement();
        flvPlayerRef.current.destroy();
      } catch (e) {
        console.error("Error cleaning up existing player:", e);
      }
      flvPlayerRef.current = null;
    }

    console.log("Creating new FLV player for URL:", stream.streamEndpoint);

    try {
      const player = flvjs.createPlayer(
        {
          type: "flv",
          url: stream.streamEndpoint,
          isLive: true,
          hasAudio: true,
          hasVideo: true,
          cors: true, // Enable CORS
        },
        {
          enableWorker: false, // Fix Webpack/Vite worker issue
          enableStashBuffer: false,
          stashInitialSize: 128,
          lazyLoad: false,
          autoCleanupSourceBuffer: true,
        }
      );

      player.on(flvjs.Events.ERROR, (errorType, errorDetail, errorInfo) => {
        console.error("FLV Player Error:", errorType, errorDetail, errorInfo);
        // Retry logic could go here
      });

      player.on(flvjs.Events.LOADING_COMPLETE, () => {
        console.log("FLV Loading Complete");
      });

      player.on(flvjs.Events.RECOVERED_EARLY_EOF, () => {
        console.warn("FLV Early EOF recovered");
      });

      player.attachMediaElement(videoRef.current);
      player.load();

      const playPromise = player.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.error("Error playing FLV stream:", err);
        });
      }

      flvPlayerRef.current = player;
    } catch (error) {
      console.error("Error creating FLV player:", error);
    }

    return () => {
      console.log("Unmounting/Cleaning up player effect");
      if (flvPlayerRef.current) {
        try {
          flvPlayerRef.current.unload();
          flvPlayerRef.current.detachMediaElement();
          flvPlayerRef.current.destroy();
        } catch (e) {
          console.error("Error destroying FLV player:", e);
        }
        flvPlayerRef.current = null;
      }
    };
  }, [stream?.isLive, stream?.streamEndpoint]);

  const fetchStreamInfo = async (uname: string) => {
    try {
      const response = await axios.get(`/api/livestream/user/${uname}`);
      const data = response.data as LiveStreamResponse;

      // If user is not live, redirect to home
      if (!data.isLive) {
        navigate("/", { replace: true });
        return;
      }

      setStream(data);
    } catch (err) {
      console.error("Failed to fetch stream info", err);
      // Redirect to home on error
      navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading stream...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stream || !stream.isLive) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Button onClick={() => navigate("/")} variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            {/* Video Player */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full"
                controls
                playsInline
                autoPlay
              />
              {/* Live indicator */}
              <div className="absolute top-4 left-4">
                <Badge variant="destructive" className="animate-pulse">
                  <Radio className="h-3 w-3 mr-1" />
                  LIVE
                </Badge>
              </div>
            </div>

            {/* Stream Info */}
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold">
                  {stream.title || "Live Stream"}
                </h1>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge
                    variant="destructive"
                    className="uppercase animate-pulse"
                  >
                    <Radio className="h-3 w-3 mr-1" />
                    LIVE
                  </Badge>
                  <Badge variant="secondary">
                    {stream.privacy || "PUBLIC"}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 mt-4 p-4 bg-card rounded-lg border">
                  <UserAvatar
                    username={stream.username}
                    size="lg"
                    onClick={() => navigate(`/@${stream.username}`)}
                  />
                  <div 
                    className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate(`/@${stream.username}`)}
                  >
                    <p className="font-semibold text-lg">@{stream.username}</p>
                    <p className="text-sm text-muted-foreground">Streamer</p>
                  </div>
                  <Button 
                    variant="secondary"
                    onClick={() => navigate(`/@${stream.username}`)}
                  >
                    Visit channel
                  </Button>
                </div>

                <p className="text-muted-foreground mt-4 whitespace-pre-wrap">
                  {stream.description || "No description provided."}
                </p>
              </div>
            </div>
          </div>

          <aside className="h-fit space-y-4">
            <LiveChat streamUsername={stream.username} />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default LivestreamPage;
