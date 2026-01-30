import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

const Results = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // State management
  const [status, setStatus] = useState<'initializing' | 'polling' | 'completed' | 'error' | 'timeout'>('initializing');
  const [pollCount, setPollCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Polling function
  useEffect(() => {
    const MAX_POLLS = 60; // 5 minutes (60 polls × 5 seconds)
    const POLL_INTERVAL = 5000; // 5 seconds

    const checkResults = async () => {
      try {
        setStatus('polling');

        const response = await fetch('https://n8n.zach13.com/webhook-test/276ad840-3dcb-4e2b-ac0f-30b1cb9f158f', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch results');
        }

        const data = await response.json();

        // Log for debugging
        console.log('Poll #' + (pollCount + 1), data);

        if (data.status === 'completed') {
          // Results are ready!
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
          // Unknown status
          setError('Unexpected status: ' + data.status);
          setStatus('error');
        }

      } catch (err) {
        console.error('Polling error:', err);
        setError('Failed to check results: ' + (err as Error).message);
        setStatus('error');
      }
    };

    // Start polling when component mounts
    checkResults();

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [sessionId]);

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-card rounded-2xl shadow-card border border-border/50 p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground font-serif">
              Interview Results
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              Session ID: {sessionId}
            </p>
          </div>

          {/* STATUS: Initializing or Polling */}
          {(status === 'initializing' || status === 'polling') && (
            <div className="bg-primary/10 p-6 rounded-xl border border-primary/20">
              <div className="flex items-center gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    Processing Your Interview...
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Poll #{pollCount + 1} of 60 - This usually takes 30-60 seconds
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STATUS: Completed */}
          {status === 'completed' && results && (
            <div className="bg-green-500/10 p-6 rounded-xl border border-green-500/20">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <p className="text-lg font-semibold text-foreground">
                  Results Ready!
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Status: {results.status}
              </p>
              <pre className="mt-4 p-4 bg-secondary/50 rounded-lg text-xs text-muted-foreground overflow-auto max-h-60">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}

          {/* STATUS: Error or Timeout */}
          {(status === 'error' || status === 'timeout') && (
            <div className="bg-destructive/10 p-6 rounded-xl border border-destructive/20">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="w-6 h-6 text-destructive" />
                <p className="text-lg font-semibold text-foreground">
                  Error Loading Results
                </p>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {error}
              </p>
              <Button
                variant="destructive"
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          )}

          {/* Back Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Results;
