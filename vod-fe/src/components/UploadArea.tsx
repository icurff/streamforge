import { Upload, FileVideo, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCallback, useRef, useState } from "react";
import axios from "@/config/CustomAxios";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "./AuthDialog";

export function UploadArea() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const startUpload = useCallback(async (file: File) => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }
    try {
      setIsUploading(true);

      // 1) Extract duration metadata
      const getDuration = (): Promise<number | null> =>
        new Promise((resolve) => {
          const el = document.createElement("video");
          el.preload = "metadata";
          el.onloadedmetadata = () => {
            const d = isFinite(el.duration) ? el.duration : NaN;
            resolve(Number.isFinite(d) ? Math.round(d) : null);
            URL.revokeObjectURL(el.src);
          };
          el.onerror = () => resolve(null);
          el.src = URL.createObjectURL(file);
        });
      const duration = await getDuration();

      // 2) Request Presigned S3 Upload URL from central backend
      const createBody = {
        fileName: file.name,
        fileType: file.type || "video/mp4",
        fileSize: file.size,
        duration: duration != null ? duration : undefined,
      };
      const sessionRes = await axios.post(`/api/uploads/sessions`, createBody);
      const { sessionId, videoId, uploadUrl, destinationUrl } = sessionRes.data as {
        sessionId?: string;
        videoId?: string;
        uploadUrl?: string;
        destinationUrl?: string;
      };

      const targetUrl = uploadUrl || destinationUrl;
      if (!targetUrl) {
        throw new Error("Không lấy được đường dẫn tải lên (Presigned URL)");
      }

      // 3) Upload directly to S3 via Presigned PUT URL
      const uploadRes = await fetch(targetUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "video/mp4",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Tải lên S3 thất bại: ${uploadRes.status} ${uploadRes.statusText}`);
      }

      // 4) Complete upload on backend
      const finalVideoId = videoId || sessionId;
      if (finalVideoId) {
        try {
          await axios.post(`/api/uploads/complete`, {
            videoId: finalVideoId,
            duration: duration != null ? duration : undefined,
          });
        } catch (ignored) {}
      }

      toast({
        title: "Tải lên thành công",
        description: `Video "${file.name}" đã được tải lên thành công!`,
      });

      await queryClient.invalidateQueries({ queryKey: ["recentVideos"] });
      await queryClient.invalidateQueries({ queryKey: ["publicVideos"] });
      await queryClient.invalidateQueries({ queryKey: ["allPublicVideos"] });
    } catch (err: any) {
      toast({
        title: "Upload thất bại",
        description: err?.message ?? "Có lỗi xảy ra khi tải lên video",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [queryClient, toast, isAuthenticated]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }
    const dt = e.dataTransfer;
    const file = dt.files && dt.files[0];
    if (file) {
      void startUpload(file);
    }
  };

  const handleSelectClick = () => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      e.currentTarget.value = ""; // reset input
      return;
    }
    const file = e.target.files && e.target.files[0];
    if (file) {
      void startUpload(file);
      e.currentTarget.value = ""; // reset so same file can be reselected
    }
  };

  return (
    <>
      <Card className={`transition-all duration-300 ${isDragOver ? 'border-primary bg-primary/5 shadow-glow' : 'border-dashed border-2'}`}>
        <CardContent 
          className="flex flex-col items-center justify-center p-12 text-center"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
              <h3 className="text-xl font-semibold mb-2">Đang tải video lên S3...</h3>
              <p className="text-muted-foreground">Vui lòng chờ trong giây lát</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Kéo thả video vào đây</h3>
              
              <Button variant="upload" className="gap-2" onClick={handleSelectClick}>
                <FileVideo className="h-4 w-4" />
                Chọn video từ máy
              </Button>
              
              <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={onFileChange} />
            </>
          )}
        </CardContent>
      </Card>
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} defaultMode="login" />
    </>
  );
}