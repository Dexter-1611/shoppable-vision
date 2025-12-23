import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { 
  Play, 
  Plus, 
  Upload, 
  Link as LinkIcon, 
  LogOut, 
  Sparkles,
  Video,
  Clock,
  Trash2,
  MoreVertical
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VideoItem {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  source_type: string;
  created_at: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchVideos();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching videos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleYoutubeUpload = async () => {
    if (!youtubeUrl || !videoTitle) {
      toast({
        title: "Missing fields",
        description: "Please provide both URL and title.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Extract YouTube video ID
      const videoId = extractYoutubeId(youtubeUrl);
      if (!videoId) {
        throw new Error("Invalid YouTube URL");
      }

      const { error } = await supabase.from("videos").insert({
        user_id: user.id,
        title: videoTitle,
        video_url: youtubeUrl,
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        source_type: "youtube",
      });

      if (error) throw error;

      toast({
        title: "Video added!",
        description: "Your YouTube video has been added to your library.",
      });

      setUploadDialogOpen(false);
      setYoutubeUrl("");
      setVideoTitle("");
      fetchVideos();
    } catch (error: any) {
      toast({
        title: "Error adding video",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast({
        title: "Invalid file",
        description: "Please upload a video file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("videos")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("videos").insert({
        user_id: user.id,
        title: file.name.replace(/\.[^/.]+$/, ""),
        video_url: publicUrl,
        source_type: "upload",
      });

      if (dbError) throw dbError;

      toast({
        title: "Video uploaded!",
        description: "Your video has been added to your library.",
      });

      setUploadDialogOpen(false);
      fetchVideos();
    } catch (error: any) {
      toast({
        title: "Error uploading video",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteVideo = async (videoId: string) => {
    try {
      const { error } = await supabase.from("videos").delete().eq("id", videoId);
      if (error) throw error;
      setVideos(videos.filter((v) => v.id !== videoId));
      toast({
        title: "Video deleted",
        description: "The video has been removed from your library.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting video",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const extractYoutubeId = (url: string): string | null => {
    const trimmedUrl = url.trim();
    
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,           // Standard watch URL
      /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,         // Watch URL with extra params
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,                        // Short URL
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,             // Embed URL
      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,                 // Old embed URL
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,            // Shorts URL
      /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,              // Live URL
      /^([a-zA-Z0-9_-]{11})$/,                                     // Just the video ID
    ];

    for (const pattern of patterns) {
      const match = trimmedUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  return (
    <div className="min-h-screen animated-gradient-bg">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-xl bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Play className="w-5 h-5 text-primary fill-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold gradient-text">ShopLens</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats and Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground mb-2">
              Your Videos
            </h2>
            <p className="text-muted-foreground flex items-center gap-2">
              <Video className="w-4 h-4" />
              {videos.length} video{videos.length !== 1 ? "s" : ""} in library
            </p>
          </div>
          
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="lg">
                <Plus className="w-5 h-5" />
                Add Video
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border/50 max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Add New Video</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                {/* File Upload */}
                <div className="space-y-3">
                  <Label className="text-foreground/80">Upload Video File</Label>
                  <label className="glass-card-hover flex flex-col items-center justify-center p-8 cursor-pointer">
                    <Upload className="w-10 h-10 text-primary mb-3" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-muted-foreground/70 mt-1">
                      MP4, MOV, WebM up to 100MB
                    </span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">OR</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* YouTube URL */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-foreground/80">Video Title</Label>
                    <Input
                      id="title"
                      placeholder="My awesome video"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      className="bg-muted/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtube" className="text-foreground/80">YouTube URL</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="youtube"
                        placeholder="https://youtube.com/watch?v=..."
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        className="pl-10 bg-muted/50"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleYoutubeUpload}
                    variant="glow"
                    className="w-full"
                    disabled={uploading}
                  >
                    {uploading ? "Adding..." : "Add YouTube Video"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Video Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card p-4 animate-pulse">
                <div className="aspect-video bg-muted rounded-lg mb-4" />
                <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-display text-2xl font-semibold text-foreground mb-2">
              No videos yet
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Upload your first video or add a YouTube link to start discovering shoppable products with AI.
            </p>
            <Button variant="hero" onClick={() => setUploadDialogOpen(true)}>
              <Plus className="w-5 h-5" />
              Add Your First Video
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video, index) => (
              <div
                key={video.id}
                className="glass-card-hover p-4 cursor-pointer group animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => navigate(`/player/${video.id}`)}
              >
                <div className="relative aspect-video rounded-lg overflow-hidden mb-4 bg-muted">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/30">
                      <Play className="w-6 h-6 text-primary-foreground fill-primary-foreground ml-1" />
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="glass" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-card border-border/50">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteVideo(video.id);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <h3 className="font-display font-semibold text-foreground truncate mb-1">
                  {video.title}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(video.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
