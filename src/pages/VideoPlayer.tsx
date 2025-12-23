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

// YouTube Player API types
declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, config: YouTubePlayerConfig) => YouTubePlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerConfig {
  videoId: string;
  playerVars?: {
    autoplay?: number;
    controls?: number;
    rel?: number;
    modestbranding?: number;
    origin?: string;
  };
  events?: {
    onReady?: (event: { target: YouTubePlayer }) => void;
    onStateChange?: (event: { data: number }) => void;
  };
}

interface YouTubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getPlayerState: () => number;
  destroy: () => void;
}

const VideoPlayer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<YouTubePlayer | null>(null);
  const ytIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([]);
  const [showProducts, setShowProducts] = useState(false);
  const [ytReady, setYtReady] = useState(false);

  const extractYoutubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  useEffect(() => {
    fetchVideo();
  }, [id]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!video || video.source_type !== "youtube") return;

    const videoId = extractYoutubeId(video.video_url);
    if (!videoId) return;

    // Load the YouTube IFrame API script
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initYouTubePlayer(videoId);
      };
    } else {
      initYouTubePlayer(videoId);
    }

    return () => {
      if (ytIntervalRef.current) {
        clearInterval(ytIntervalRef.current);
      }
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy();
      }
    };
  }, [video]);

  const initYouTubePlayer = (videoId: string) => {
    if (ytPlayerRef.current) {
      ytPlayerRef.current.destroy();
    }

    ytPlayerRef.current = new window.YT.Player("youtube-player", {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (event) => {
          setYtReady(true);
          setDuration(event.target.getDuration());
          
          // Start time update interval
          ytIntervalRef.current = setInterval(() => {
            if (ytPlayerRef.current) {
              const time = ytPlayerRef.current.getCurrentTime();
              setCurrentTime(time);
              
              const state = ytPlayerRef.current.getPlayerState();
              setIsPlaying(state === window.YT.PlayerState.PLAYING);
            }
          }, 250);
        },
        onStateChange: (event) => {
          setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
        },
      },
    });
  };

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
    if (video?.source_type === "youtube" && ytPlayerRef.current) {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
      } else {
        ytPlayerRef.current.playVideo();
      }
    } else if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (video?.source_type === "youtube" && ytPlayerRef.current) {
      if (isMuted) {
        ytPlayerRef.current.unMute();
      } else {
        ytPlayerRef.current.mute();
      }
    } else if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const seekBy = (seconds: number) => {
    if (video?.source_type === "youtube" && ytPlayerRef.current) {
      const newTime = ytPlayerRef.current.getCurrentTime() + seconds;
      ytPlayerRef.current.seekTo(Math.max(0, newTime), true);
    } else if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
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
    const time = parseFloat(e.target.value);
    
    if (video?.source_type === "youtube" && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(time, true);
    } else if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
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
    
    const videoEl = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) return null;
    
    if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
      console.error("Video not loaded or has no dimensions");
      return null;
    }
    
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    
    try {
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.8);
    } catch (error) {
      console.error("Canvas capture error:", error);
      return null;
    }
  }, []);

  const getYoutubeThumbnail = (videoId: string): string => {
    // Use highest quality thumbnail available
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  const scanProducts = async () => {
    const isYoutube = video?.source_type === "youtube";
    let imageData: string | null = null;

    // Pause video first
    if (isYoutube && ytPlayerRef.current) {
      ytPlayerRef.current.pauseVideo();
      setIsPlaying(false);
    } else if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    if (isYoutube && video) {
      // For YouTube, use the thumbnail
      const videoId = extractYoutubeId(video.video_url);
      if (videoId) {
        const thumbnailUrl = getYoutubeThumbnail(videoId);
        imageData = thumbnailUrl; // Send URL directly to edge function
      }
    } else {
      // For uploaded videos, capture the frame
      imageData = captureFrame();
    }

    if (!imageData) {
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
          imageData,
          videoId: id,
          isUrl: video?.source_type === "youtube"
        },
      });

      if (error) throw error;

      if (data.products && data.products.length > 0) {
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
              <div className="w-full h-full relative">
                {/* YouTube Player Container */}
                <div id="youtube-player" className="w-full h-full" />

                {/* Product Overlays for YouTube */}
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

                {/* Scanning Overlay for YouTube */}
                {isScanning && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-20">
                    <div className="text-center">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full border-4 border-primary/30 animate-spin" 
                             style={{ borderTopColor: 'hsl(var(--primary))' }} />
                        <Sparkles className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      <p className="mt-4 text-foreground font-medium">Scanning for products...</p>
                      <p className="text-sm text-muted-foreground">AI is analyzing the video thumbnail</p>
                    </div>
                  </div>
                )}

                {/* YouTube Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent p-4 z-10">
                  {/* Progress bar */}
                  <div className="mb-4">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      disabled={!ytReady}
                      className="w-full h-1.5 appearance-none bg-muted rounded-full cursor-pointer
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                               [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg
                               [&::-webkit-slider-thumb]:shadow-primary/30 [&::-webkit-slider-thumb]:cursor-pointer
                               [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125
                               disabled:opacity-50"
                      style={{
                        background: duration > 0 
                          ? `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(currentTime / duration) * 100}%, hsl(var(--muted)) ${(currentTime / duration) * 100}%, hsl(var(--muted)) 100%)`
                          : undefined,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Button variant="glass" size="icon" onClick={togglePlay} disabled={!ytReady}>
                        {isPlaying ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5 ml-0.5" />
                        )}
                      </Button>
                      <Button variant="glass" size="icon" onClick={() => seekBy(-10)} disabled={!ytReady}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button variant="glass" size="icon" onClick={() => seekBy(10)} disabled={!ytReady}>
                        <RotateCw className="w-4 h-4" />
                      </Button>
                      <Button variant="glass" size="icon" onClick={toggleMute} disabled={!ytReady}>
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
                        disabled={isScanning}
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
                  onError={(e) => {
                    console.error("Video error:", e);
                    toast({
                      title: "Video playback error",
                      description: "There was an issue loading the video.",
                      variant: "destructive",
                    });
                  }}
                  playsInline
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