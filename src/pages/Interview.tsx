import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Briefcase, BarChart3, Mic, ArrowLeft } from "lucide-react";
import { useConversation } from "@elevenlabs/react";

interface InterviewState {
  sessionId: string;
  name: string;
  duration: string;
  jobField: string;
  difficulty: string;
}

const Interview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isStarted, setIsStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const state = location.state as InterviewState | null;

  // Initialize conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to interviewer');
      setIsConnecting(false);
      setIsStarted(true);
    },
    onDisconnect: () => {
      console.log('Interview ended - navigating to results');
      if (state?.sessionId) {
        navigate(`/results/${state.sessionId}`);
      }
    },
    onError: (error) => {
      console.error('Connection error:', error);
      alert('Failed to connect. Please check your microphone permissions.');
      setIsConnecting(false);
    },
  });

  // Redirect if no state
  if (!state) {
    navigate('/', { replace: true });
    return null;
  }

  const handleStartInterview = async () => {
    if (!state?.sessionId) {
      alert('No session found. Please start from the form.');
      navigate('/');
      return;
    }

    setIsConnecting(true);

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start conversation with dynamic variables via overrides
      // @ts-expect-error - dynamicVariables is supported by the SDK but types may be outdated
      await conversation.startSession({
        agentId: 'agent_2601kgh4x4ygfpatf3m2j4aav9yb',
        dynamicVariables: {
          user_name: state.name,
          job_field: state.jobField,
          difficulty: state.difficulty,
          duration: String(state.duration),
          session_id: state.sessionId
        }
      });

      console.log('Session started with variables:', {
        user_name: state.name,
        job_field: state.jobField,
        difficulty: state.difficulty,
        duration: state.duration,
        session_id: state.sessionId
      });
    } catch (error: any) {
      console.error('Failed to start:', error);
      setIsConnecting(false);

      if (error.name === 'NotAllowedError') {
        alert('Microphone access denied. Enable permissions and try again.');
      } else {
        alert('Failed to start interview: ' + error.message);
      }
    }
  };

  const handleEndEarly = async () => {
    if (window.confirm('End interview early?')) {
      await conversation.endSession();
    }
  };

  return (
    <div className="min-h-screen gradient-hero">
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header Card */}
          <Card className="bg-card rounded-2xl p-6 shadow-lg border border-border/50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground font-serif">
                  {isStarted ? 'Interview in Progress' : 'Ready to Start?'}
                </h1>
                <p className="text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {state.duration}min
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {state.jobField}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    {state.difficulty}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground/70 font-mono">
                  Session: {state.sessionId}
                </p>
              </div>
            </div>
          </Card>

          {/* Main Content */}
          <Card className="bg-card rounded-2xl p-8 shadow-lg border border-border/50 min-h-[400px] flex items-center justify-center">
            {/* Pre-start state */}
            {!isStarted && !isConnecting && (
              <div className="text-center space-y-6 max-w-md">
                <div className="bg-muted/50 rounded-xl p-6 text-left">
                  <h3 className="font-semibold text-foreground mb-3">Before You Begin:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>✓ Microphone connected and working</li>
                    <li>✓ Quiet space with minimal noise</li>
                    <li>✓ Speak clearly at normal pace</li>
                    <li>✓ You'll answer 2 questions</li>
                  </ul>
                </div>

                <Button
                  size="lg"
                  onClick={handleStartInterview}
                  className="w-full py-6 text-lg"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Start Interview
                </Button>

                <button
                  onClick={() => navigate('/')}
                  className="text-muted-foreground hover:text-foreground text-sm inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to home
                </button>
              </div>
            )}

            {/* Connecting state */}
            {isConnecting && (
              <div className="text-center space-y-4">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                </div>
                <h3 className="text-xl font-semibold text-foreground">Connecting...</h3>
                <p className="text-muted-foreground">Preparing your interview</p>
              </div>
            )}

            {/* Active interview state */}
            {isStarted && (
              <div className="text-center space-y-6 w-full max-w-md">
                <div className="space-y-4">
                  {/* Audio visualization placeholder */}
                  <div className="flex items-center justify-center gap-1 h-16">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <div
                        key={i}
                        className="w-2 bg-primary rounded-full animate-pulse"
                        style={{
                          height: `${Math.random() * 40 + 20}px`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>

                  <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    Interview Active
                  </div>

                  <p className="text-muted-foreground">🎤 Speak clearly</p>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    💡 Tip: Take your time to think before answering
                  </p>
                </div>

                <Button variant="destructive" onClick={handleEndEarly}>
                  End Interview Early
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Interview;
