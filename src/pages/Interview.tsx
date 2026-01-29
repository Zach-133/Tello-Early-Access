import { useLocation, Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Briefcase, BarChart3 } from "lucide-react";

interface InterviewState {
  sessionId: string;
  name: string;
  duration: string;
  jobField: string;
  difficulty: string;
}

const Interview = () => {
  const location = useLocation();
  const state = location.state as InterviewState | null;

  // Redirect to home if no state is passed
  if (!state) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen gradient-hero">
      <div className="container mx-auto px-4 py-12 lg:py-20">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-card rounded-2xl p-8 shadow-card border border-border/50">
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground font-serif">
                  Welcome, {state.name}!
                </h1>
                <p className="text-muted-foreground">
                  Your interview session is ready. Good luck!
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-4">
                <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 text-sm">
                  <Clock className="w-4 h-4" />
                  {state.duration} minutes
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 text-sm">
                  <Briefcase className="w-4 h-4" />
                  {state.jobField}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 text-sm">
                  <BarChart3 className="w-4 h-4" />
                  {state.difficulty}
                </Badge>
              </div>

              <div className="pt-6 p-6 rounded-xl bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Session ID: <span className="font-mono text-foreground">{state.sessionId}</span>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Interview;
