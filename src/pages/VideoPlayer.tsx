import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  ArrowLeft,
  Scan,
  ExternalLink,
  X,
  Loader2,
  Sparkles,
  Volume2,
  VolumeX,
  Maximize,
  ShoppingBag
} from "lucide-react";

interface VideoData {
  id: string;
  title: string;
  video_url: string;
  source_type: string;
}

interface ScannedProduct {
  id: string;
  name: string;
  category: string;
  searchUrl: string;
  confidence: number;
  position?: { x: number; y: number };
}

const VideoPlayer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([]);
  const [showProducts, setShowProducts] = useState(false);

  useEffect(() => {
    fetchVideo();
  }, [id]);

  const fetchVideo = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setVideo(data);
    } catch (error: any) {
      toast({
        title: "Error loading video",
        description: error.message,
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const seekBy = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += seconds;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) return null;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  const scanProducts = async () => {
    if (isPlaying) {
      videoRef.current?.pause();
      setIsPlaying(false);
    }

    const frameData = captureFrame();
    if (!frameData) {
      toast({
        title: "Could not capture frame",
        description: "Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    setShowProducts(false);
    setScannedProducts([]);

    try {
      const { data, error } = await supabase.functions.invoke("scan-products", {
        body: { 
          imageData: frameData,
          videoId: id 
        },
      });

      if (error) throw error;

      if (data.products && data.products.length > 0) {
        // Add random positions for product cards
        const productsWithPositions = data.products.map((product: ScannedProduct, index: number) => ({
          ...product,
          id: `${Date.now()}-${index}`,
          position: {
            x: 10 + (index % 3) * 30 + Math.random() * 10,
            y: 10 + Math.floor(index / 3) * 25 + Math.random() * 10,
          },
        }));
        setScannedProducts(productsWithPositions);
        setShowProducts(true);
        toast({
          title: "Products found!",
          description: `Discovered ${data.products.length} shoppable item${data.products.length > 1 ? "s" : ""}.`,
        });
      } else {
        toast({
          title: "No products found",
          description: "Try scanning a different frame with visible products.",
        });
      }
    } catch (error: any) {
      console.error("Scan error:", error);
      toast({
        title: "Scan failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const getYoutubeEmbedUrl = (url: string): string => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? `https://www.youtube.com/embed/${match[1]}?enablejsapi=1` : url;
  };

  if (loading) {
    return (
      <div className="min-h-screen animated-gradient-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen animated-gradient-bg flex items-center justify-center">
        <p className="text-muted-foreground">Video not found</p>
      </div>
    );
  }

  const isYoutube = video.source_type === "youtube";

  return (
    <div className="min-h-screen animated-gradient-bg">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-xl bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-xl font-semibold text-foreground truncate">
            {video.title}
          </h1>
        </div>
      </header>

      {/* Video Player */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div 
            ref={containerRef}
            className="video-player-container glass-card overflow-hidden relative"
          >
            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} className="hidden" />

            {isYoutube ? (
              <div className="w-full h-full">
                <iframe
                  src={getYoutubeEmbedUrl(video.video_url)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="text-center p-8">
                    <ShoppingBag className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h3 className="font-display text-xl font-semibold mb-2">YouTube Video</h3>
                    <p className="text-muted-foreground text-sm max-w-md">
                      AI product scanning works best with uploaded videos due to browser security restrictions.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  src={video.video_url}
                  className="w-full h-full object-contain bg-background"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onClick={togglePlay}
                  crossOrigin="anonymous"
                />

                {/* Product Overlays */}
                {showProducts && scannedProducts.length > 0 && (
                  <div className="product-overlay">
                    {scannedProducts.map((product) => (
                      <a
                        key={product.id}
                        href={product.searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="product-card animate-fade-in-up"
                        style={{
                          left: `${product.position?.x || 10}%`,
                          top: `${product.position?.y || 10}%`,
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <ShoppingBag className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                              {product.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {product.category}
                            </p>
                          </div>
                          <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        </div>
                      </a>
                    ))}
                    <Button
                      variant="glass"
                      size="icon"
                      className="absolute top-2 right-2 pointer-events-auto"
                      onClick={() => setShowProducts(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Scanning Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full border-4 border-primary/30 animate-spin" 
                             style={{ borderTopColor: 'hsl(var(--primary))' }} />
                        <Sparkles className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      <p className="mt-4 text-foreground font-medium">Scanning for products...</p>
                      <p className="text-sm text-muted-foreground">AI is analyzing the frame</p>
                    </div>
                  </div>
                )}

                {/* Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent p-4">
                  {/* Progress bar */}
                  <div className="mb-4">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-1.5 appearance-none bg-muted rounded-full cursor-pointer
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                               [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg
                               [&::-webkit-slider-thumb]:shadow-primary/30 [&::-webkit-slider-thumb]:cursor-pointer
                               [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
                      style={{
                        background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(currentTime / duration) * 100}%, hsl(var(--muted)) ${(currentTime / duration) * 100}%, hsl(var(--muted)) 100%)`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Button variant="glass" size="icon" onClick={togglePlay}>
                        {isPlaying ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5 ml-0.5" />
                        )}
                      </Button>
                      <Button variant="glass" size="icon" onClick={() => seekBy(-10)}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button variant="glass" size="icon" onClick={() => seekBy(10)}>
                        <RotateCw className="w-4 h-4" />
                      </Button>
                      <Button variant="glass" size="icon" onClick={toggleMute}>
                        {isMuted ? (
                          <VolumeX className="w-5 h-5" />
                        ) : (
                          <Volume2 className="w-5 h-5" />
                        )}
                      </Button>
                      <span className="text-sm text-foreground/80 font-medium ml-2">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant={isScanning ? "glass" : "hero"}
                        onClick={scanProducts}
                        disabled={isScanning || isPlaying}
                        className="gap-2"
                      >
                        {isScanning ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Scan className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">
                          {isScanning ? "Scanning..." : "Scan Products"}
                        </span>
                      </Button>
                      <Button variant="glass" size="icon" onClick={toggleFullscreen}>
                        <Maximize className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Scanned Products List */}
          {scannedProducts.length > 0 && (
            <div className="mt-6 glass-card p-6">
              <h3 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Discovered Products ({scannedProducts.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {scannedProducts.map((product) => (
                  <a
                    key={product.id}
                    href={product.searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-card-hover p-4 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {product.name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {product.category}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default VideoPlayer;
