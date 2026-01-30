import { LucideIcon } from "lucide-react";

interface ScoreCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  score: number;
  comment: string;
  accentColor: "purple" | "amber" | "blue" | "emerald";
}

const colorMap = {
  purple: {
    icon: "text-purple-600",
    iconBg: "bg-purple-100",
    progress: "bg-purple-500",
    commentBg: "bg-purple-50",
    hoverBorder: "hover:border-purple-200",
  },
  amber: {
    icon: "text-amber-600",
    iconBg: "bg-amber-100",
    progress: "bg-amber-500",
    commentBg: "bg-amber-50",
    hoverBorder: "hover:border-amber-200",
  },
  blue: {
    icon: "text-blue-600",
    iconBg: "bg-blue-100",
    progress: "bg-blue-500",
    commentBg: "bg-blue-50",
    hoverBorder: "hover:border-blue-200",
  },
  emerald: {
    icon: "text-emerald-600",
    iconBg: "bg-emerald-100",
    progress: "bg-emerald-500",
    commentBg: "bg-emerald-50",
    hoverBorder: "hover:border-emerald-200",
  },
};

// Helper function to get score color based on score out of 10
const getScoreColor = (score: number) => {
  const percentage = (score / 10) * 100;
  if (percentage >= 80) return "text-emerald-600";
  if (percentage >= 65) return "text-blue-600";
  if (percentage >= 50) return "text-amber-600";
  return "text-red-500";
};

const ScoreCard = ({ icon: Icon, title, subtitle, score, comment, accentColor }: ScoreCardProps) => {
  const colors = colorMap[accentColor];
  const percentage = (score / 10) * 100;

  return (
    <div className={`bg-card p-8 rounded-xl shadow-card border-2 border-border/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${colors.hoverBorder}`}>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 ${colors.iconBg} rounded-lg`}>
            <Icon className={`w-8 h-8 ${colors.icon}`} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground font-serif">{title}</h3>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-bold ${getScoreColor(score)}`}>
            {score}
          </p>
          <p className="text-sm text-muted-foreground">out of 10</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-secondary rounded-full h-3 mb-4 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-1000 ease-out ${colors.progress}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className={`${colors.commentBg} p-4 rounded-lg`}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {comment}
        </p>
      </div>
    </div>
  );
};

export default ScoreCard;
