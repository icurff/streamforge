import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { UploadArea } from "@/components/UploadArea";
import { VideoGrid } from "@/components/VideoGrid";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 space-y-8">
          <UploadArea />
          <VideoGrid />
        </main>
      </div>
    </div>
  );
};

export default HomePage;
