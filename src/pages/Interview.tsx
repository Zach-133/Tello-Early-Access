import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Briefcase, BarChart3, Mic, MicOff, ArrowLeft } from "lucide-react";
import { useConversation } from "@elevenlabs/react";
import AppHeader from "@/components/AppHeader";
import { useAudioLevel } from "@/hooks/useAudioLevel";

interface InterviewState {
  sessionId: string;
  name: string;
  duration: string;
  jobField: string;
  difficulty: string;
  cvExists: boolean;
  jdExists: boolean;
}

const Interview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isStarted, setIsStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { barHeights, volume, isTooSoft } = useAudioLevel(isStarted);

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
    navigate('/form', { replace: true });
    return null;
  }

  const handleStartInterview = async () => {
    if (!state?.sessionId) {
      alert('No session found. Please start from the form.');
      navigate('/form');
      return;
    }

    setIsConnecting(true);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Map difficulty level to corresponding agent ID
      const agentMapping: Record<string, string> = {
        'Beginner': 'agent_5201khb8ye2se6ta1vsxf6f4wsx6',
        'Intermediate': 'agent_0101khb8tr92e3st3vbnjm3z0jwk',
        'Advanced': 'agent_6501khb8vxzmeejsq3mga7tn8kdn'
      };

      const selectedAgentId = agentMapping[state.difficulty];

      console.log('Starting interview:', {
        difficulty: state.difficulty,
        agentId: selectedAgentId,
        sessionId: state.sessionId
      });

      if (!selectedAgentId) {
        throw new Error(`No agent found for difficulty level: ${state.difficulty}`);
      }

      // Start conversation with difficulty-specific agent
      console.log('[EL] dynamicVariables:', {
        cv_exists: String(state.cvExists ?? false),
        jd_exists: String(state.jdExists ?? false),
        session_id: state.sessionId,
      });
      await conversation.startSession({
        agentId: selectedAgentId,
        connectionType: "webrtc",
        dynamicVariables: {
          user_name: state.name,
          job_field: state.jobField,
          difficulty: state.difficulty,
          duration: String(state.duration),
          session_id: state.sessionId,
          cv_exists: String(state.cvExists ?? false),
          jd_exists: String(state.jdExists ?? false)
        }
      });

      console.log('Interview started successfully with', state.difficulty, 'agent');
    } catch (error: any) {
      console.error('Failed to start interview:', error);
      setIsConnecting(false);

      if (error.name === 'NotAllowedError') {
        alert('Microphone access denied. Please enable microphone permissions and try again.');
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
      <AppHeader />
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-coral/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-coral/10 blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-10 lg:py-16">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header Card */}
          <Card className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 shadow-card border border-border/30">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground font-serif">
                  {isStarted ? 'Interview in Progress' : 'Ready to Start?'}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 bg-secondary/70 text-secondary-foreground px-3 py-1 rounded-full text-sm font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {state.duration} min
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-secondary/70 text-secondary-foreground px-3 py-1 rounded-full text-sm font-medium">
                    <Briefcase className="w-3.5 h-3.5" />
                    {state.jobField}
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-secondary/70 text-secondary-foreground px-3 py-1 rounded-full text-sm font-medium">
                    <BarChart3 className="w-3.5 h-3.5" />
                    {state.difficulty}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/60 font-mono tracking-wide">
                  Session: {state.sessionId}
                </p>
              </div>
            </div>
          </Card>

          {/* Main Content */}
          <Card className="bg-card/80 backdrop-blur-sm rounded-2xl p-10 shadow-card border border-border/30 min-h-[420px] flex items-center justify-center">
            {/* Pre-start state */}
            {!isStarted && !isConnecting && (
              <div className="text-center space-y-8 max-w-sm w-full">
                {/* Mic icon hero */}
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-coral/10 flex items-center justify-center animate-float">
                    <Mic className="w-9 h-9 text-coral" />
                  </div>
                </div>

                <div className="bg-coral-light/40 border border-coral/20 rounded-xl p-5 text-left space-y-3">
                  <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide">Before You Begin</h3>
                  <ul className="space-y-2.5 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-coral mt-0.5">✓</span>
                      Microphone connected and working
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-coral mt-0.5">✓</span>
                      Quiet space with minimal noise
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-coral mt-0.5">✓</span>
                      Speak clearly at a normal pace
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-coral mt-0.5">✓</span>
                      Close any apps using your microphone (e.g. calls, video chat)
                    </li>
                  </ul>
                </div>

                <Button
                  variant="coral"
                  size="lg"
                  onClick={handleStartInterview}
                  className="w-full py-6 text-lg rounded-xl"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Start Interview
                </Button>

                <button
                  onClick={() => navigate('/form')}
                  className="text-muted-foreground hover:text-foreground text-sm inline-flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to home
                </button>
              </div>
            )}

            {/* Connecting state */}
            {isConnecting && (
              <div className="text-center space-y-5">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-coral border-t-transparent animate-spin"></div>
                  <div className="absolute inset-3 rounded-full bg-coral/10 flex items-center justify-center">
                    <Mic className="w-6 h-6 text-coral animate-pulse-warm" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground font-serif">Connecting...</h3>
                <p className="text-muted-foreground text-sm">Preparing your interview session</p>
              </div>
            )}

            {/* Active interview state */}
            {isStarted && (
              <div className="text-center space-y-6 w-full max-w-md">
                <div className="space-y-5">
                  {/* Live audio visualizer — always animated, amplitude-modulated */}
                  <div className="flex items-end justify-center gap-1.5 h-20">
                    {barHeights.map((height, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-coral rounded-full"
                        style={{
                          height: `${Math.max(4, height * 64)}px`,
                          opacity: 0.35 + height * 0.65,
                          transition: 'height 50ms ease-out, opacity 50ms ease-out',
                        }}
                      />
                    ))}
                  </div>

                  {/* Mic level progress bar */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="relative h-1.5 w-48 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-primary"
                        style={{
                          width: `${volume * 100}%`,
                          transition: 'width 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        }}
                      />
                    </div>
                    <div className="flex justify-between w-48">
                      <span className="text-xs font-medium text-foreground/70">Soft</span>
                      <span className="text-xs font-medium text-foreground/70">Loud</span>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 bg-coral/10 text-coral-dark px-5 py-2.5 rounded-full font-medium text-sm">
                    <span className="w-2 h-2 bg-coral rounded-full animate-pulse" />
                    Interview Active
                  </div>

                  <p className="text-muted-foreground text-sm">🎤 Speak clearly — your interviewer is listening</p>
                </div>

                <div className="bg-coral-light/30 border border-coral/15 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground">
                    💡 Take your time to think before answering each question
                  </p>
                </div>

                {isTooSoft && (
                  <div className="animate-slide-up bg-gold-light/50 border border-gold/30 rounded-xl p-4 text-left">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MicOff className="w-4 h-4 text-gold" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">
                          We're having trouble hearing you
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Try speaking louder or moving closer to your microphone
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Button variant="destructive" onClick={handleEndEarly} className="rounded-xl">
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
