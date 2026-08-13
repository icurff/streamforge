import { Upload, FileVideo, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCallback, useRef, useState } from "react";
import axios from "@/config/CustomAxios";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import accessToken from "@/utils/LocalStorage";
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
      // Prepare chunking (do not alter UI)
      const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
      const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));

      // 1) Create upload session on central server
      const createBody = {
        totalChunks,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
      };
      const sessionRes = await axios.post(`/api/uploads/sessions`, createBody);
      const { sessionId, destinationUrl } = sessionRes.data as { sessionId: string; destinationUrl: string };

      // Optional: extract duration metadata
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

      // 2) Upload chunks to destination URL (sub-server)
      const token = accessToken.getAccessToken();
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const formData = new FormData();
        formData.append("file", chunk);
        formData.append("fileName", file.name);
        formData.append("fileType", file.type || "application/octet-stream");
        formData.append("fileSize", String(file.size));
        if (duration != null) formData.append("fileDuration", String(duration));
        formData.append("sessionId", sessionId);
        formData.append("chunkIndex", String(chunkIndex));
        formData.append("totalChunks", String(totalChunks));

        const uploadRes = await fetch(destinationUrl, {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          } as Record<string, string>,
          body: formData,
        });
        if (!uploadRes.ok) {
          try {
            // eslint-disable-next-line no-console
            console.log("Upload error:", await uploadRes.json());
          } catch {}
          throw new Error(`Chunk ${chunkIndex} upload failed: ${uploadRes.status}`);
        }
        // UI remains the same; progress could be used internally if needed
        // const progressPct = Math.round(((chunkIndex + 1) / totalChunks) * 100);
      }

      // 3) Poll session status for processing/transcode completion
      const poll = async (): Promise<void> => {
        try {
          const s = await axios.get(`/api/uploads/sessions/${sessionId}`);
          const status = (s.data?.status ?? "").toString();
          if (status && status !== "UPLOADING") {
            toast({ title: "Xử lý xong", description: `Video ${file.name} đã sẵn sàng` });
            await queryClient.invalidateQueries({ queryKey: ["recentVideos"] });
          } else {
            setTimeout(() => { void poll(); }, 2000);
          }
        } catch {
          setTimeout(() => { void poll(); }, 3000);
        }
      };
      void poll();
    } catch (err: any) {
      toast({ title: "Upload thất bại", description: err?.message ?? "Có lỗi xảy ra", variant: "destructive" });
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
              <h3 className="text-xl font-semibold mb-2">Uploading your video...</h3>
              <p className="text-muted-foreground">Please wait while we process your file</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Drop files to upload</h3>
              
              <Button variant="upload" className="gap-2" onClick={handleSelectClick}>
                <FileVideo className="h-4 w-4" />
                Select files
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