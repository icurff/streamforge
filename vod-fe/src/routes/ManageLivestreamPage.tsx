import { useParams, useNavigate } from "react-router-dom";
import { useGetLivestream } from "@/hooks/Livestream/useGetLivestream";
import { useUploadLivestreamThumbnail } from "@/hooks/Livestream/useUploadLivestreamThumbnail";
import { useUpdateLivestreamMetadata } from "@/hooks/Livestream/useUpdateLivestreamMetadata";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Save, Upload } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const ManageLivestreamPage = () => {
  const { livestreamId } = useParams<{ livestreamId: string }>();
  const navigate = useNavigate();
  const { data: livestream, isLoading, error } = useGetLivestream(livestreamId);
  const { mutateAsync: uploadThumbnail, isPending: isUploadingThumbnail } = useUploadLivestreamThumbnail();
  const { mutateAsync: updateMetadata, isPending: isUpdatingMetadata } = useUpdateLivestreamMetadata();
  const { toast } = useToast();
  const { user } = useAuth();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when livestream loads
  useEffect(() => {
    if (livestream) {
      setTitle(livestream.title || "");
      setDescription(livestream.description || "");
      setThumbnailUrl(livestream.thumbnail || "");
    }
  }, [livestream]);

  // Check if user owns this livestream
  const isOwner = user?.username === livestream?.username;

  const handleSave = async () => {
    if (!livestreamId || !isOwner) return;

    setIsSaving(true);
    try {
      await updateMetadata({
        livestreamId,
        title,
        description,
      });
      toast({
        title: "Success",
        description: "Livestream information has been updated successfully.",
      });
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || "Update failed";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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

  if (error || !livestream) {
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

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <p className="text-muted-foreground">You don't have permission to edit this livestream</p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to home
          </Button>
        </div>
      </div>
    );
  }

  const hasChanges = 
    title !== (livestream.title || "") ||
    description !== (livestream.description || "") ||
    thumbnailUrl !== (livestream.thumbnail || "");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={() => navigate(`/@${livestream.username}`)}
            variant="ghost"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || isUpdatingMetadata}
          >
            {(isSaving || isUpdatingMetadata) ? (
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Thumbnail Preview */}
            {thumbnailUrl && (
              <Card>
                <CardContent className="p-0">
                  <div className="bg-black rounded-lg overflow-hidden aspect-video relative">
                    <img
                      src={thumbnailUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

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
                          if (!file || !livestreamId) return;
                          
                          try {
                            const updated = await uploadThumbnail({ livestreamId, file });
                            setThumbnailUrl(updated.thumbnail);
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
                    {(thumbnailUrl || livestream?.thumbnail) && (
                      <div className="relative w-[220px] h-[124px] rounded-lg overflow-hidden border-2 border-primary/50">
                        <img
                          src={thumbnailUrl || livestream?.thumbnail || "/placeholder.svg"}
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
            {/* Livestream Info */}
            <Card>
              <CardHeader>
                <CardTitle>Livestream Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Livestream ID:</span>
                  <span className="font-mono text-xs">{livestream.id}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ngày tạo:</span>
                  <span>{new Date(livestream.uploadedDate).toLocaleDateString("en-US")}</span>
                </div>
                {livestream.lastModifiedDate && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last modified:</span>
                      <span>{new Date(livestream.lastModifiedDate).toLocaleDateString("en-US")}</span>
                    </div>
                  </>
                )}
                {livestream.duration > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Thời lượng:</span>
                      <span>{Math.floor(livestream.duration / 60)}:{(livestream.duration % 60).toString().padStart(2, "0")}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ManageLivestreamPage;

