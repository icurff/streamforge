import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { ImageUpload } from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import axios from "@/config/CustomAxios";
import { toast } from "sonner";
import { useUploadLivestreamThumbnail } from "@/hooks/Livestream/useUploadLivestreamThumbnail";
import { useToast } from "@/hooks/use-toast";
import {
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Radio,
  RefreshCw,
} from "lucide-react";
import flvjs from "flv.js";
import { useAuth } from "@/contexts/AuthContext";

interface LiveStream {
  id: string;
  username: string;
  title: string;
  description: string;
  streamKey: string;
  isLive: boolean;
  streamEndpoint?: string;
  rtmpUrl?: string;
  currentLivestreamId?: string;
}

const LiveSetupPage = () => {
  const { user } = useAuth();
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const flvPlayerRef = useRef<flvjs.Player | null>(null);
  const { mutateAsync: uploadThumbnail, isPending: isUploadingThumbnail } = useUploadLivestreamThumbnail();
  const { toast: toastHook } = useToast();

  const fetchStreamInfo = useCallback(async () => {
    try {
      const response = await axios.get("/api/livestream");
      setStream((prev) => ({
        ...prev,
        ...response.data,
      }));
      setTitle(response.data.title || "");
      setDescription(response.data.description || "");
      
      // If there's a current livestream, fetch its thumbnail
      if (response.data.currentLivestreamId) {
        try {
          const livestreamRes = await axios.get(`/api/livestream/${response.data.currentLivestreamId}`);
          setThumbnailUrl(livestreamRes.data.thumbnail || "");
        } catch (e) {
          // Ignore if livestream not found
        }
      }
    } catch (error) {
      console.error("Failed to fetch stream info", error);
    }
  }, []);

  const fetchStreamConnectionInfo = useCallback(async () => {
    try {
      const response = await axios.get("/api/livestream/stream-info");
      setStream((prev) => ({
        ...prev,
        ...response.data,
        rtmpUrl: response.data.rtmpUrl,
        streamKey: response.data.streamKey,
      }));
    } catch (error: any) {
      // Don't log 503 errors as they're expected when no servers are available
      // This happens when no stream is set up yet
      if (error?.response?.status !== 503) {
        console.error("Failed to fetch stream connection info", error);
      }
    }
  }, []);

  useEffect(() => {
    fetchStreamInfo();
    fetchStreamConnectionInfo();
  }, [fetchStreamInfo, fetchStreamConnectionInfo]);

  // Poll for live status every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStreamInfo();
      // Only fetch connection info if not live (to avoid changing server when live)
      if (!stream?.isLive) {
        fetchStreamConnectionInfo();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchStreamInfo, fetchStreamConnectionInfo, stream?.isLive]);

  // Setup FLV player when stream is live
  useEffect(() => {
    console.log("Preview: Checking stream status:", {
      isLive: stream?.isLive,
      streamKey: stream?.streamKey,
      videoElement: !!videoRef.current,
    });

    if (!stream?.isLive || !stream?.streamKey || !videoRef.current) {
      // Cleanup if stream went offline
      if (flvPlayerRef.current) {
        console.log("Preview: Cleaning up player");
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

    // Get FLV URL from API response, fallback to constructing if not provided
    const streamEndpoint =
      stream.streamEndpoint ||
      (stream.streamKey
        ? `http://localhost:8088/live/${stream.streamKey}.flv`
        : "");

    if (!streamEndpoint) {
      console.warn("No FLV URL available for stream");
      return;
    }

    console.log("Preview: Initializing player with URL:", streamEndpoint);

    // Cleanup existing player first
    if (flvPlayerRef.current) {
      try {
        flvPlayerRef.current.unload();
        flvPlayerRef.current.detachMediaElement();
        flvPlayerRef.current.destroy();
      } catch (e) {
        console.error("Error cleaning up existing player:", e);
      }
      flvPlayerRef.current = null;
    }

    try {
      const player = flvjs.createPlayer(
        {
          type: "flv",
          url: streamEndpoint,
          isLive: true,
          hasAudio: true,
          hasVideo: true,
          cors: true,
        },
        {
          enableWorker: false, // Fix Webpack/Vite worker issue
          enableStashBuffer: false,
          stashInitialSize: 128,
          lazyLoad: false,
          autoCleanupSourceBuffer: true,
        }
      );

      // Add error handlers
      player.on(flvjs.Events.ERROR, (errorType, errorDetail, errorInfo) => {
        console.error(
          "Preview FLV Player Error:",
          errorType,
          errorDetail,
          errorInfo
        );
        // Implement retry logic if needed, but be careful of infinite loops in preview
      });

      player.attachMediaElement(videoRef.current);
      player.load();

      const playPromise = player.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.error("Error playing FLV preview:", err);
          // Auto-mute if playback fails (browsers block autoplay with sound)
          if (videoRef.current) {
            videoRef.current.muted = true;
            player.play().catch((e) => console.error("Retry play failed:", e));
          }
        });
      }

      flvPlayerRef.current = player;
    } catch (error) {
      console.error("Error creating FLV player:", error);
    }

    return () => {
      if (flvPlayerRef.current) {
        try {
          flvPlayerRef.current.unload();
          flvPlayerRef.current.detachMediaElement();
          flvPlayerRef.current.destroy();
          flvPlayerRef.current = null;
        } catch (e) {
          console.error("Error destroying FLV player:", e);
        }
      }
    };
  }, [stream?.isLive, stream?.streamKey, stream?.streamEndpoint]);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const response = await axios.post("/api/livestream/setup", {
        title,
        description,
      });
      // Update stream info but keep existing rtmpUrl and streamKey
      setStream((prev) => ({
        ...prev,
        ...response.data,
        // Preserve rtmpUrl and streamKey from previous state
        rtmpUrl: prev?.rtmpUrl || response.data.rtmpUrl,
        streamKey: prev?.streamKey || response.data.streamKey,
      }));
      toast.success("Stream info updated");
    } catch (error) {
      toast.error("Failed to update stream info");
    } finally {
      setLoading(false);
    }
  };

  const handleResetKey = async () => {
    if (!confirm("Are you sure? This will invalidate the old key.")) return;
    try {
      const response = await axios.post("/api/livestream/reset-key", {});
      setStream((prev) => ({
        ...prev,
        ...response.data,
      }));
      // Fetch connection info again to get updated rtmpUrl if needed
      await fetchStreamConnectionInfo();
      toast.success("Stream key reset");
    } catch (error) {
      toast.error("Failed to reset stream key");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Use username from auth context, fallback to stream data
  const username = user?.username || stream?.username || "";
  // Use rtmpUrl from API response if available (from load-balanced server), otherwise fallback to localhost
  const rtmpUrl = stream?.rtmpUrl || "rtmp://localhost:11935/live";
  const publicUrl = username
    ? `${window.location.origin}/@${username}/live`
    : "";
  // Use streamEndpoint from API response if available, otherwise construct from streamKey
  const flvPreviewUrl =
    stream?.streamEndpoint ||
    (stream?.streamKey
      ? `http://localhost:8088/live/${stream.streamKey}.flv`
      : "");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Livestream Setup</h1>
            <Button
              variant="outline"
              onClick={() => {
                fetchStreamInfo();
                fetchStreamConnectionInfo();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Stream Details & Connection Info */}
            <div className="space-y-6">
              {/* Stream Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Stream Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Title
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter stream title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Description
                    </label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter stream description"
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={handleSetup}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? "Saving..." : "Save Details"}
                  </Button>
                </CardContent>
              </Card>

              {/* Thumbnail Upload Card - Only show if live */}
              {stream?.isLive && stream?.currentLivestreamId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Thumbnail</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ImageUpload
                      currentImageUrl={thumbnailUrl}
                      onImageSelect={async (file) => {
                        if (!stream?.currentLivestreamId) return;
                        try {
                          const updated = await uploadThumbnail({ 
                            livestreamId: stream.currentLivestreamId, 
                            file 
                          });
                          setThumbnailUrl(updated.thumbnail);
                          toastHook({
                            title: "Success",
                            description: "New thumbnail uploaded successfully.",
                          });
                        } catch (error: any) {
                          const message = error?.response?.data?.error || error?.message || "Upload failed";
                          toastHook({
                            title: "Upload failed",
                            description: message,
                            variant: "destructive",
                          });
                        }
                      }}
                      isLoading={isUploadingThumbnail}
                      maxSizeMB={5}
                      previewClassName="w-full h-48"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Connection Info Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Connection Info</CardTitle>
                    {stream?.isLive && (
                      <Badge variant="destructive" className="animate-pulse">
                        <Radio className="h-3 w-3 mr-1" />
                        LIVE
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Public Link */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Public Link
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={publicUrl || "Loading..."}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          publicUrl && copyToClipboard(publicUrl, "Public link")
                        }
                        disabled={!publicUrl}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          username &&
                          window.open(`/@${username}/live`, "_blank")
                        }
                        disabled={!username}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Share this link with your viewers.
                    </p>
                  </div>

                  <Separator />

                  {/* RTMP URL */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      RTMP URL
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={rtmpUrl}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(rtmpUrl, "RTMP URL")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Stream Key */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Stream Key
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type={showKey ? "text" : "password"}
                        value={stream?.streamKey || "Loading..."}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowKey(!showKey)}
                      >
                        {showKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          stream?.streamKey &&
                          copyToClipboard(stream.streamKey, "Stream key")
                        }
                        disabled={!stream?.streamKey}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Keep this secret! Don't share it publicly.
                    </p>
                  </div>

                  <Button
                    variant="destructive"
                    onClick={handleResetKey}
                    className="w-full"
                    disabled={!stream}
                  >
                    Reset Stream Key
                  </Button>

                  <Separator />

                  {/* Server Management */}
                  {/* <div>
                    <h4 className="text-sm font-medium mb-2">
                      Server Management
                    </h4>
                    <a
                      href="http://localhost:8088/console/ng_index.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open SRS Console
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use the console to monitor streams and clients.
                    </p>
                  </div> */}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Stream Preview */}
            <div className="space-y-6">
              <Card className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Stream Preview</CardTitle>
                    {stream?.isLive && (
                      <Badge variant="destructive" className="animate-pulse">
                        <Radio className="h-3 w-3 mr-1" />
                        LIVE
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="aspect-video bg-black relative">
                    {stream?.isLive ? (
                      <video
                        ref={videoRef}
                        className="w-full h-full"
                        controls
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70">
                        <Radio className="h-16 w-16 mb-4 opacity-50" />
                        <p className="text-lg font-medium">Not streaming</p>
                        <p className="text-sm mt-2 text-white/50">
                          Start streaming with OBS or another streaming software
                        </p>
                        <p className="text-xs mt-4 text-white/40 max-w-md text-center">
                          Use the RTMP URL and Stream Key above to connect
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Stream Info Preview */}
              {stream?.isLive && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Preview Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <span className="text-sm text-muted-foreground">
                        FLV URL:
                      </span>
                      <code className="block text-xs bg-muted p-2 rounded mt-1 break-all">
                        {flvPreviewUrl}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* How to Stream Guide */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    How to Start Streaming
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Download OBS Studio or similar streaming software</li>
                    <li>Go to Settings → Stream</li>
                    <li>Select "Custom" as the service</li>
                    <li>Enter the RTMP URL and Stream Key</li>
                    <li>Click "Start Streaming"</li>
                  </ol>
                 
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LiveSetupPage;
