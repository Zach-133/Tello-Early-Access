import { InterviewForm } from "@/components/InterviewForm";
import { Mic, Sparkles, Target } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen gradient-hero">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/30 rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Tello – Your Interview Assistant
              </h1>
              <p className="text-xl lg:text-2xl text-muted-foreground font-medium">
                Perfect your interview skills
              </p>
            </div>

            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
              Practice makes perfect. Get personalized interview questions tailored to your field 
              and skill level. Build confidence and land your dream job.
            </p>

            {/* Feature highlights */}
            <div className="grid sm:grid-cols-3 gap-4 pt-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card shadow-soft">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">Real-time Practice</span>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card shadow-soft">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">Tailored Questions</span>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card shadow-soft">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">Instant Feedback</span>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground font-serif">
                  Get Started
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Fill in the details below to begin your practice session
                </p>
              </div>
              <InterviewForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
