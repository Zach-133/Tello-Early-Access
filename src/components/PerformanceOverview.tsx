import { Brain, Lightbulb, MessageSquare, Target, LucideIcon } from "lucide-react";

interface CriteriaScore {
  score: number;
  comment: string;
}

interface Scores {
  technicalKnowledge: CriteriaScore;
  problemSolving: CriteriaScore;
  communicationSkills: CriteriaScore;
  relevance: CriteriaScore;
}

interface PerformanceOverviewProps {
  scores: Scores;
}

interface CriteriaItem {
  name: string;
  score: number;
  icon: LucideIcon;
  color: string;
}

const getProgressColor = (score: number) => {
  const percentage = (score / 10) * 100;
  if (percentage >= 80) return "bg-emerald-500";
  if (percentage >= 65) return "bg-blue-500";
  if (percentage >= 50) return "bg-amber-500";
  return "bg-red-500";
};

const PerformanceOverview = ({ scores }: PerformanceOverviewProps) => {
  const criteria: CriteriaItem[] = [
    { name: "Technical Knowledge", score: scores.technicalKnowledge?.score || 0, icon: Brain, color: "purple" },
    { name: "Problem Solving", score: scores.problemSolving?.score || 0, icon: Lightbulb, color: "amber" },
    { name: "Communication Skills", score: scores.communicationSkills?.score || 0, icon: MessageSquare, color: "blue" },
    { name: "Relevance & Depth", score: scores.relevance?.score || 0, icon: Target, color: "emerald" },
  ];

  return (
    <div className="bg-card rounded-xl shadow-card p-8 border-2 border-border/50">
      <h3 className="text-2xl font-bold text-foreground mb-6 text-center font-serif">
        Performance Overview
      </h3>

      {/* Side-by-side comparison bars */}
      <div className="space-y-4">
        {criteria.map(({ name, score, icon: Icon, color }) => {
          const percentage = (score / 10) * 100;
          return (
            <div key={name} className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-48 shrink-0">
                <Icon className={`w-5 h-5 text-${color}-600`} />
                <span className="text-sm font-medium text-foreground">{name}</span>
              </div>
              <div className="flex-1">
                <div className="w-full bg-secondary rounded-full h-8 relative overflow-hidden">
                  <div
                    className={`h-8 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-3 ${getProgressColor(score)}`}
                    style={{ width: `${Math.max(percentage, 15)}%` }}
                  >
                    <span className="text-white font-bold text-sm">{score}/10</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-8 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500"></div>
          <span className="text-sm text-muted-foreground">Excellent (8-10)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500"></div>
          <span className="text-sm text-muted-foreground">Good (6.5-7.9)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-500"></div>
          <span className="text-sm text-muted-foreground">Fair (5-6.4)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500"></div>
          <span className="text-sm text-muted-foreground">Needs Work (&lt;5)</span>
        </div>
      </div>
    </div>
  );
};

export default PerformanceOverview;
