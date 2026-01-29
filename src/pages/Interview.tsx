import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Briefcase, BarChart3, LogOut, AlertCircle } from "lucide-react";

interface InterviewState {
  sessionId: string;
  name: string;
  duration: string;
  jobField: string;
  difficulty: string;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        'agent-id'?: string;
        'dynamic-variables'?: string;
      }, HTMLElement>;
    }
  }
}

const Interview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [widgetError, setWidgetError] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  
  const state = location.state as InterviewState | null;

  // Load ElevenLabs script
  useEffect(() => {
    const existingScript = document.querySelector('script[src*="elevenlabs"]');
    if (existingScript) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    script.type = 'text/javascript';
    
    script.onload = () => {
      setScriptLoaded(true);
    };
    
    script.onerror = () => {
      setWidgetError(true);
    };
    
    document.head.appendChild(script);

    return () => {
      // Don't remove script on cleanup to prevent re-loading issues
    };
  }, []);

  // Set dynamic variables after script loads
  useEffect(() => {
    if (!state) {
      navigate('/', { replace: true });
      return;
    }

    if (!scriptLoaded) return;

    // Small delay to ensure widget is rendered
    const timer = setTimeout(() => {
      const widget = document.querySelector('elevenlabs-convai');
      if (widget) {
        const dynamicVars = {
          user_name: state.name,
          job_field: state.jobField,
          difficulty: state.difficulty,
          duration: state.duration.toString(),
          session_id: state.sessionId
        };
        widget.setAttribute('dynamic-variables', JSON.stringify(dynamicVars));
      } else {
        setWidgetError(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [state, navigate, scriptLoaded]);

  // Redirect if no state
  if (!state) {
    return null;
  }

  const handleEndInterview = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen gradient-hero">
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header Card */}
          <Card className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground font-serif">
                  Interview with {state.name}
                </h1>
                <p className="text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {state.duration} minute
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {state.jobField} interview
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    {state.difficulty} level
                  </span>
                </p>
                <p className="text-xs text-muted-foreground/70 font-mono">
                  Session: {state.sessionId}
                </p>
              </div>
              
              <Button
                variant="destructive"
                onClick={handleEndInterview}
                className="shrink-0"
              >
                <LogOut className="w-4 h-4 mr-2" />
                End Interview Early
              </Button>
            </div>
          </Card>

          {/* Widget Container */}
          <Card className="bg-card rounded-2xl p-8 shadow-card border border-border/50 min-h-[400px] flex items-center justify-center">
            {widgetError ? (
              <div className="text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                <p className="text-muted-foreground">
                  Widget failed to load. Please refresh.
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
              </div>
            ) : (
              <div className="w-full flex justify-center">
                <elevenlabs-convai agent-id="agent_9701kdr8c7eqe8wvbs1jg08t46jy" />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Interview;
