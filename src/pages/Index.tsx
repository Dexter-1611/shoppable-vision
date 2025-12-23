import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Sparkles, 
  Scan, 
  ShoppingBag, 
  Zap, 
  ArrowRight,
  Video,
  Wand2
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const features = [
    {
      icon: Video,
      title: "Upload Videos",
      description: "Add your own videos or YouTube links to your personal library.",
    },
    {
      icon: Scan,
      title: "AI-Powered Scanning",
      description: "Pause any frame and let AI identify shoppable products instantly.",
    },
    {
      icon: ShoppingBag,
      title: "Shop Products",
      description: "Click on discovered items to find and purchase them online.",
    },
  ];

  return (
    <div className="min-h-screen animated-gradient-bg overflow-hidden">
      {/* Hero Section */}
      <div className="relative">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] animate-float" />
          <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: "1.5s" }} />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] animate-float" style={{ animationDelay: "0.8s" }} />
        </div>

        {/* Navigation */}
        <nav className="relative z-10 container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-glow">
              <Play className="w-5 h-5 text-primary fill-primary" />
            </div>
            <span className="font-display text-2xl font-bold gradient-text">ShopLens</span>
          </div>
          <Button variant="glass" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 pt-20 pb-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in-up">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">AI-Powered Shopping Experience</span>
            </div>
            
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              Turn Any Video Into a
              <span className="block gradient-text glow-text">Shoppable Experience</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              Upload videos, pause at any moment, and let AI instantly identify products. 
              Shop what you see with a single click.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <Button 
                variant="hero" 
                size="xl" 
                onClick={() => navigate("/auth")}
                className="group"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="glass" size="xl">
                <Play className="w-5 h-5" />
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="relative z-10 py-24 border-t border-border/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Three simple steps to transform your video watching experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <div 
                key={feature.title} 
                className="glass-card-hover p-8 text-center animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-4">
          <div className="glass-card p-12 sm:p-16 text-center max-w-4xl mx-auto relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 mb-8 animate-glow">
                <Wand2 className="w-10 h-10 text-primary" />
              </div>
              
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Ready to Start Shopping Smarter?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of users who are discovering and shopping products from their favorite videos.
              </p>
              
              <Button 
                variant="hero" 
                size="xl" 
                onClick={() => navigate("/auth")}
                className="group"
              >
                <Zap className="w-5 h-5" />
                Start for Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 ShopLens. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
