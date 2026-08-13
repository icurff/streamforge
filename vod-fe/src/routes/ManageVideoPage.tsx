import { useParams, useNavigate } from "react-router-dom";
import { useGetVideo } from "@/hooks/Video/useGetVideo";
import { useUpdateVideoMetadata } from "@/hooks/Video/useUpdateVideoMetadata";
import { useUpdateVideoPrivacy } from "@/hooks/Video/useUpdateVideoPrivacy";
import { useUploadVideoThumbnail } from "@/hooks/Video/useUploadVideoThumbnail";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Save, Lock, Globe, Eye, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { useToast } from "@/hooks/use-toast";
import { type VideoPrivacy } from "@/types/video";

const ManageVideoPage = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { data: video, isLoading, error } = useGetVideo(videoId || "");
  const { mutateAsync: updateMetadata, isPending: isUpdatingMetadata } = useUpdateVideoMetadata();
  const { mutateAsync: updatePrivacy, isPending: isUpdatingPrivacy } = useUpdateVideoPrivacy();
  const { mutateAsync: uploadThumbnail, isPending: isUploadingThumbnail } = useUploadVideoThumbnail();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  // Initialize form when video loads
  useEffect(() => {
    if (video) {
      setTitle(video.title || "");
      setDescription(video.description || "");
      setThumbnailUrl(video.thumbnail || "");
      setIsPublic(video.privacy === "PUBLIC");
    }
  }, [video]);

  // Video player setup
  useEffect(() => {
    if (!video || !videoRef.current) return;

    const videoElement = videoRef.current;
    const serverLocation = video.server_locations?.[0];
    
    if (!serverLocation) {
      console.error("No server location available for video:", video.id);
      return;
    }

    let baseUrl = serverLocation.trim();
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `http://${baseUrl}`;
    }
    baseUrl = baseUrl.replace(/\/$/, "");
    const m3u8Url = `${baseUrl}/videos/${video.username}/${video.id}/master.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(m3u8Url);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("HLS manifest parsed");
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS error:", data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
      videoElement.src = m3u8Url;
    }
  }, [video]);

  const handleSaveMetadata = async () => {
    if (!videoId) return;

    try {
      await updateMetadata({
        videoId,
        title,
        description,
        thumbnail: thumbnailUrl,
      });
      toast({
        title: "Changes saved",
        description: "Video information has been updated successfully.",
      });
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || "Update failed";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handlePrivacyToggle = async (checked: boolean) => {
    if (!videoId) return;

    const newPrivacy: VideoPrivacy = checked ? "PUBLIC" : "PRIVATE";
    
    try {
      setIsPublic(checked);
      await updatePrivacy({ videoId, privacy: newPrivacy });
      toast({
        title: "Privacy updated",
        description: checked 
          ? "Your video is now public for everyone to view." 
          : "Your video is now private.",
      });
    } catch (error: any) {
      // Revert on error
      setIsPublic(!checked);
      const message = error?.response?.data?.error || error?.message || "Update failed";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <p className="text-muted-foreground">Video not found</p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to home
          </Button>
        </div>
      </div>
    );
  }

  const hasChanges = 
    title !== (video.title || "") ||
    description !== (video.description || "") ||
    thumbnailUrl !== (video.thumbnail || "");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate(`/video/${videoId}`)}
              variant="outline"
            >
              <Eye className="h-4 w-4 mr-2" />
              View video
            </Button>
            <Button
              onClick={handleSaveMetadata}
              disabled={!hasChanges || isUpdatingMetadata}
            >
              {isUpdatingMetadata ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Video Player */}
            <Card>
              <CardContent className="p-0">
                <div className="bg-black rounded-lg overflow-hidden aspect-video relative">
                  <video
                    ref={videoRef}
                    controls
                    className="w-full h-full"
                    playsInline
                    poster={video.thumbnail && video.thumbnail.trim().length > 0 ? video.thumbnail : undefined}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Edit Form */}
            <Card>
              <CardContent className="p-8 space-y-8">
                {/* Title Section */}
                <div className="grid grid-cols-[200px_1fr] gap-6 items-start">
                  <Label className="text-lg font-semibold pt-3">Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Add title..."
                    maxLength={100}
                    className="text-base h-12 px-4"
                  />
                </div>

                <Separator />

                {/* Description Section */}
                <div className="grid grid-cols-[200px_1fr] gap-6 items-start">
                  <Label className="text-lg font-semibold pt-3">Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add description..."
                    rows={4}
                    maxLength={5000}
                    className="resize-none text-base px-4 py-3"
                  />
                </div>

                <Separator />

                {/* Thumbnail Section */}
                <div className="grid grid-cols-[200px_1fr] gap-6 items-start">
                  <Label className="text-lg font-semibold pt-3">Thumbnail</Label>
                  <div className="flex items-start gap-4">
                    {/* Upload Button */}
                    <div className="relative">
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="thumbnail-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !videoId) return;
                          
                          try {
                            const updatedVideo = await uploadThumbnail({ videoId, file });
                            setThumbnailUrl(updatedVideo.thumbnail);
                            toast({
                              title: "Success",
                              description: "New thumbnail uploaded successfully.",
                            });
                          } catch (error: any) {
                            const message = error?.response?.data?.error || error?.message || "Upload failed";
                            toast({
                              title: "Upload failed",
                              description: message,
                              variant: "destructive",
                            });
                          } finally {
                            if (fileInputRef.current) {
                              fileInputRef.current.value = "";
                            }
                          }
                        }}
                        disabled={isUploadingThumbnail}
                      />
                      <label
                        htmlFor="thumbnail-upload"
                        className={`flex items-center justify-center w-[220px] h-[124px] border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-muted-foreground/50 cursor-pointer transition-colors bg-muted/20 ${
                          isUploadingThumbnail ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {isUploadingThumbnail ? (
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        ) : (
                          <Upload className="h-8 w-8 text-muted-foreground" />
                        )}
                      </label>
                    </div>

                    {/* Current Thumbnail */}
                    {(thumbnailUrl || video?.thumbnail) && (
                      <div className="relative w-[220px] h-[124px] rounded-lg overflow-hidden border-2 border-primary/50">
                        <img
                          src={thumbnailUrl || video?.thumbnail || "/placeholder.svg"}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 sticky top-24 self-start max-h-[calc(100vh-12rem)] overflow-y-auto">
            {/* Privacy Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Privacy</CardTitle>
                <CardDescription>
                  Control who can view your video
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isPublic ? (
                      <Globe className="h-5 w-5 text-green-600" />
                    ) : (
                      <Lock className="h-5 w-5 text-orange-600" />
                    )}
                    <div>
                      <p className="font-medium">
                        {isPublic ? "Public" : "Private"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isPublic 
                          ? "Everyone can view" 
                          : "Only you can view"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isPublic}
                    onCheckedChange={handlePrivacyToggle}
                    disabled={isUpdatingPrivacy}
                  />
                </div>
                
              </CardContent>
            </Card>

            {/* Video Info */}
            <Card>
              <CardHeader>
                <CardTitle>Video Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Video ID:</span>
                  <span className="font-mono text-xs">{video.id}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Upload date:</span>
                  <span>{new Date(video.uploadedDate).toLocaleDateString("en-US")}</span>
                </div>
                {video.lastModifiedDate && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last modified:</span>
                      <span>{new Date(video.lastModifiedDate).toLocaleDateString("en-US")}</span>
                    </div>
                  </>
                )}
                {video.resolutions && video.resolutions.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-muted-foreground">Resolutions:</span>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {video.resolutions.map((res) => (
                          <Badge key={res} variant="secondary" className="text-xs">
                            {res}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Actions
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    // TODO: Implement analytics
                    toast({
                      title: "Feature in development",
                      description: "Video statistics will be available soon.",
                    });
                  }}
                >
                  View statistics
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/video/${video.id}`);
                    toast({
                      title: "Copied",
                      description: "Video link has been copied to clipboard.",
                    });
                  }}
                >
                  Copy link
                </Button>
              </CardContent>
            </Card> */}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ManageVideoPage;

