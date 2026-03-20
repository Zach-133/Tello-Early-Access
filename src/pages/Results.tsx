import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import { ArrowLeft, Loader2, AlertCircle, RefreshCw, Brain, Lightbulb, MessageSquare, Target, Trophy, TrendingUp, Award, MicOff } from "lucide-react";
import ScoreCard from "@/components/ScoreCard";
import PerformanceOverview from "@/components/PerformanceOverview";

// Helper to get performance rating based on final score (out of 100)
const getPerformanceRating = (score: number) => {
  if (score >= 90) return { label: "Excellent", color: "text-emerald-600", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" };
  if (score >= 70) return { label: "Good", color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" };
  if (score >= 50) return { label: "Fair", color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200" };
  return { label: "Needs Improvement", color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-200" };
};

// Helper to get score color class for final score (out of 100)
const getScoreColor = (score: number) => {
  if (score >= 90) return "text-emerald-600";
  if (score >= 75) return "text-blue-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-500";
};

const Results = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  // State management
  const [status, setStatus] = useState<'initializing' | 'polling' | 'completed' | 'error' | 'timeout' | 'no_session'>('initializing');
  const [pollCount, setPollCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Polling function
  useEffect(() => {
    const MAX_POLLS = 24; // 2 minutes (24 polls × 5 seconds)
    const POLL_INTERVAL = 5000; // 5 seconds

    const checkResults = async () => {
      try {
        setStatus('polling');

        const response = await fetch('https://n8n.zach13.com/webhook/276ad840-3dcb-4e2b-ac0f-30b1cb9f158f', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch results');
        }

        const text = await response.text();
        const data = text.trim() ? JSON.parse(text) : {};

        // Log for debugging
        console.log('Poll #' + (pollCount + 1), data);

        if (data.status === 'User non-response') {
          setStatus('no_session');
        } else if (data.status === 'completed') {
          // Results are ready! Mark dashboard cache stale so next /form visit refetches
          sessionStorage.setItem('tello_dashboard_stale', 'true');
          setResults(data);
          setStatus('completed');
        } else if (data.status === 'processing') {
          // Still processing, continue polling
          setPollCount(prev => prev + 1);

          if (pollCount >= MAX_POLLS - 1) {
            // Timeout after max polls
            setStatus('timeout');
            setError('Results are taking longer than expected. Please check back later.');
          } else {
            // Schedule next poll
            timeoutRef.current = setTimeout(checkResults, POLL_INTERVAL);
          }
        } else {
          // Unknown or empty status — WF3 may not have responded yet (blank Grading Status).
          // Continue polling rather than erroring.
          setPollCount(prev => prev + 1);
          if (pollCount >= MAX_POLLS - 1) {
            setStatus('timeout');
            setError('Results are taking longer than expected. Please check back later.');
          } else {
            timeoutRef.current = setTimeout(checkResults, POLL_INTERVAL);
          }
        }

      } catch (err) {
        // Network/parse error during polling — continue polling rather than hard-erroring.
        console.error('Polling error:', err);
        setPollCount(prev => prev + 1);
        if (pollCount >= MAX_POLLS - 1) {
          setError('Failed to load results. Please try again.');
          setStatus('error');
        } else {
          timeoutRef.current = setTimeout(checkResults, POLL_INTERVAL);
        }
      }
    };

    checkResults();

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [sessionId]);

  const performanceRating = results ? getPerformanceRating(results.finalScore || 0) : null;

  return (
    <div className="min-h-screen gradient-hero">
      <AppHeader />
      <div className="py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* STATUS: Initializing or Polling */}
        {(status === 'initializing' || status === 'polling') && (
          <Card className="bg-card rounded-2xl shadow-card border border-border/50 p-12">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <Loader2 className="w-20 h-20 text-coral animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Award className="w-8 h-8 text-coral animate-pulse" />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-2 font-serif">
                  Processing Your Interview Results
                </h2>
                <p className="text-muted-foreground">
                  Our AI graders are analyzing your responses...
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Poll #{pollCount + 1} of 24 • Usually takes 30-60 seconds
                </p>
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                  Session: {sessionId}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* STATUS: Error or Timeout */}
        {(status === 'error' || status === 'timeout') && (
          <Card className="bg-card rounded-2xl shadow-card border border-border/50 p-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold text-destructive mb-4 font-serif">
                Unable to Load Results
              </h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <div className="flex gap-4 justify-center">
                <Button
                  variant="destructive"
                  onClick={() => window.location.reload()}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/form')}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Start New Interview
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* STATUS: No Session */}
        {status === 'no_session' && (
          <div className="min-h-[70vh] flex items-center justify-center">
            <Card className="bg-card rounded-2xl shadow-card border border-border/50 p-12 max-w-lg w-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                  <MicOff className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3 font-serif">
                  Session Not Graded
                </h2>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  This session could not be graded, as our interviewer was unable to hear or receive a response from you.
                </p>
                <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
                  This may be due to a microphone issue. Please check your audio setup and try again.
                </p>
                <Button
                  variant="coral"
                  onClick={() => navigate('/form')}
                  size="lg"
                >
                  Start New Interview
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* STATUS: Completed */}
        {status === 'completed' && results && performanceRating && (
          <div className="space-y-8">
            
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-2 font-serif">
                Interview Complete! 🎉
              </h1>
              <p className="text-muted-foreground">
                {results.jobField || 'General'} • {results.difficulty || 'Standard'} Difficulty
              </p>
              <p className="text-sm text-muted-foreground mt-1 font-mono">
                Session: {sessionId}
              </p>
            </div>

            {/* Final Score Hero Card */}
            <Card className={`bg-card rounded-2xl shadow-card p-8 border-4 ${performanceRating.borderColor}`}>
              <div className="text-center">
                <div className="inline-flex items-center justify-center mb-4">
                  <TrendingUp className={`w-12 h-12 ${performanceRating.color}`} />
                </div>

                <h2 className="text-2xl font-semibold text-muted-foreground mb-2 font-serif">
                  Overall Performance
                </h2>

                {/* Large Score Circle */}
                <div className="inline-flex flex-col items-center justify-center w-48 h-48 rounded-full bg-gradient-to-br from-coral/10 via-gold/10 to-secondary shadow-card mb-6 relative">
                  <div className="text-center z-10">
                    <p className={`text-6xl font-bold ${getScoreColor(results.finalScore || 0)}`}>
                      {results.finalScore || 0}
                    </p>
                    <p className="text-xl text-muted-foreground">out of 100</p>
                  </div>

                  {/* Decorative ring */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      className="text-border"
                      strokeWidth="4"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      className="text-coral"
                      strokeWidth="4"
                      strokeDasharray={`${((results.finalScore || 0) / 100) * 283} 283`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Performance Badge */}
                <div className={`inline-block px-6 py-3 rounded-full ${performanceRating.bgColor} border-2 ${performanceRating.borderColor}`}>
                  <span className={`text-xl font-bold ${performanceRating.color}`}>
                    {performanceRating.label}
                  </span>
                </div>

                <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                  {(results.finalScore || 0) >= 90 && "Outstanding performance! You demonstrated exceptional skills across all criteria."}
                  {(results.finalScore || 0) >= 70 && (results.finalScore || 0) < 90 && "Great job! You showed strong competency in most areas with room for minor improvements."}
                  {(results.finalScore || 0) >= 50 && (results.finalScore || 0) < 70 && "Good effort! You have a solid foundation with several areas for growth."}
                  {(results.finalScore || 0) < 50 && "Keep practicing! Focus on the feedback below to improve your interview skills."}
                </p>
              </div>
            </Card>

            {/* Criteria Breakdown Header */}
            <div className="text-center pt-8">
              <h2 className="text-3xl font-bold text-foreground mb-2 font-serif">
                Detailed Breakdown
              </h2>
              <p className="text-muted-foreground">
                Performance across key evaluation criteria
              </p>
            </div>

            {/* Criteria Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ScoreCard
                icon={Brain}
                title="Technical Knowledge"
                subtitle="Understanding of concepts"
                score={results.scores?.technicalKnowledge?.score || 0}
                comment={results.scores?.technicalKnowledge?.comment || "No feedback available"}
                accentColor="purple"
              />
              <ScoreCard
                icon={Lightbulb}
                title="Problem Solving"
                subtitle="Analytical thinking"
                score={results.scores?.problemSolving?.score || 0}
                comment={results.scores?.problemSolving?.comment || "No feedback available"}
                accentColor="amber"
              />
              <ScoreCard
                icon={MessageSquare}
                title="Communication Skills"
                subtitle="Clarity & articulation"
                score={results.scores?.communicationSkills?.score || 0}
                comment={results.scores?.communicationSkills?.comment || "No feedback available"}
                accentColor="blue"
              />
              <ScoreCard
                icon={Target}
                title="Relevance & Depth"
                subtitle="Focus & detail"
                score={results.scores?.relevance?.score || 0}
                comment={results.scores?.relevance?.comment || "No feedback available"}
                accentColor="emerald"
              />
            </div>

            {/* Comparative Performance Overview */}
            {results.scores && (
              <PerformanceOverview scores={results.scores} />
            )}

            {/* Start New Interview Button */}
            <div className="text-center pt-8">
              <Button
                variant="coral"
                onClick={() => navigate('/form')}
                size="lg"
                className="px-8 py-6 text-lg font-semibold"
              >
                Start New Interview
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Results;
