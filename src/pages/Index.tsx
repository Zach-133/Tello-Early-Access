import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import AppHeader from "@/components/AppHeader";
import { InterviewForm } from "@/components/InterviewForm";
import { Card } from "@/components/ui/card";
import { Flame, Target, TrendingUp, Trophy, Loader2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

const DASHBOARD_WEBHOOK = "https://n8n.zach13.com/webhook/45445649-f088-48e2-be5e-ac0ee4a57c23";

interface Session {
  date: string;
  finalScore: number;
  technicalKnowledge: number;
  problemSolving: number;
  communicationSkills: number;
  relevance: number;
}

interface DashboardStats {
  totalSessions: number;
  bestScore: number;
  currentScore: number;
  improvement: number;
  streakDays: number;
}

interface DashboardData {
  sessions: Session[];
  stats: DashboardStats;
}

type ChartMode = "overall" | "breakdown";

const formatDateLabel = (isoStr: string) => {
  try {
    return new Date(isoStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return isoStr;
  }
};

const getSubtitle = (stats: DashboardStats | undefined): string => {
  if (!stats || stats.totalSessions === 0) return "Ready to start your journey?";
  if (stats.streakDays >= 3) return `You're on a ${stats.streakDays}-day streak — keep it going!`;
  if (stats.streakDays === 2) return `2 days in a row — you're building momentum.`;
  if (stats.improvement > 5) return `You've improved ${stats.improvement} points since your first session. Impressive.`;
  if (stats.totalSessions === 1) return `Great first session! Ready to build on that ${stats.currentScore} score?`;
  return `Ready for your next challenge?`;
};

const buildChartData = (sessions: Session[], mode: ChartMode) => {
  const actual = sessions.map((s, i) => ({
    label: String(i + 1),
    date: formatDateLabel(s.date),
    "Overall Score": s.finalScore,
    // Bridge point: only on the last actual session so the dashed projection connects from it
    "Your Potential": mode === "overall" && i === sessions.length - 1 ? s.finalScore : null,
    // Tiny Y-offsets (≤1 pt on 0-100 scale) so lines stay distinguishable when values are identical
    "Technical":          Math.round(s.technicalKnowledge * 10),
    "Problem-Solving":    Math.round(s.problemSolving * 10) + 0.5,
    "Communication":      Math.round(s.communicationSkills * 10) - 0.5,
    "Relevance":          Math.round(s.relevance * 10) + 1,
  }));

  if (mode === "breakdown") return actual;

  const lastScore = sessions[sessions.length - 1].finalScore;
  const targetScore = Math.min(Math.max(lastScore + 25, 80), 98);
  const range = targetScore - lastScore;

  // Projection always rises from lastScore: surge, spike, pullback, target
  const offsets = [0.18, 0.50, 0.65, 1.0];
  const nudges = [+3, +8, -5, 0];

  const projected = offsets.map((t, i) => ({
    label: "",
    date: null,
    "Overall Score": null,
    "Your Potential": Math.round(lastScore + range * t + nudges[i]),
    "Technical": null,
    "Problem-Solving": null,
    "Communication": null,
    "Relevance": null,
  }));

  return [...actual, ...projected];
};

// Custom tooltip — filters out _bg halo lines so they never appear in the tooltip
const TooltipContent = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload?.date;
  const s = payload[0]?.payload?.label;
  const header = !s ? "Projected" : d ? `Session ${s} · ${d}` : `Session ${s}`;
  const items = (payload as any[]).filter((p) => !String(p.dataKey).endsWith("_bg"));
  return (
    <div style={{ backgroundColor: "hsl(30,20%,99%)", border: "1px solid hsl(30,20%,88%)", borderRadius: "0.75rem", fontSize: "12px", padding: "8px 12px", boxShadow: "0 4px 20px -4px rgba(60,30,10,0.12)" }}>
      <p style={{ fontWeight: 600, color: "hsl(25,30%,20%)", marginBottom: 4 }}>{header}</p>
      {items.map((item, i) => (
        <p key={i} style={{ color: item.stroke, margin: "1px 0" }}>
          {item.dataKey === "Your Potential" ? "✨ Potential" : item.dataKey}: <strong>{Math.round(item.value)}</strong>
        </p>
      ))}
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  bg: string;
  value: string;
  label: string;
  sub?: string;
  pulse?: boolean;
}

const StatCard = ({ icon, bg, value, label, sub, pulse }: StatCardProps) => (
  <Card className="bg-card rounded-2xl shadow-card border border-border/50 p-4 hover:shadow-medium hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200 cursor-default">
    <div className="flex flex-col items-center text-center gap-1.5">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center ${pulse ? "animate-pulse-soft" : ""}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground font-serif">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-coral font-medium">{sub}</p>}
    </div>
  </Card>
);

const Index = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "loaded" | "empty">("loading");
  const [data, setData] = useState<DashboardData | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>("overall");
  const [animationDone, setAnimationDone] = useState(false);

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  useEffect(() => {
    const fetchDashboard = async () => {
      const email = user?.email;
      if (!email) { setStatus("empty"); return; }
      try {
        const res = await fetch(DASHBOARD_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) throw new Error();
        const json: DashboardData = await res.json();
        if (!json.sessions || json.sessions.length === 0) {
          setStatus("empty");
        } else {
          setData(json);
          setStatus("loaded");
        }
      } catch {
        setStatus("empty");
      }
    };
    fetchDashboard();
  }, [user?.email]);

  const stats = data?.stats;
  const chartData = data ? buildChartData(data.sessions, chartMode) : [];
  const subtitle = getSubtitle(stats);

  return (
    <div className="min-h-screen gradient-hero">
      <AppHeader />

      <div className="container mx-auto px-4 pt-6 pb-4 max-w-6xl">

        {/* Welcome */}
        <div className="mb-5">
          <h1 className="text-4xl font-bold text-foreground font-serif leading-tight">
            Welcome back, {firstName}.
          </h1>
          {status !== "loading" && (
            <p className="text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>

        {/* Loading */}
        {status === "loading" && (
          <div className="flex items-center gap-3 py-6 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-coral" />
            <span className="text-sm">Loading your stats...</span>
          </div>
        )}

        {/* Empty — new user */}
        {status === "empty" && (
          <div className="max-w-md">
            <Card className="bg-card rounded-2xl p-8 shadow-card border border-border/50">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground font-serif">
                  Start Your First Interview
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Set up your session below to get started
                </p>
              </div>
              <InterviewForm />
            </Card>
          </div>
        )}

        {/* Loaded */}
        {status === "loaded" && stats && (
          <div className="space-y-3 animate-fade-in">

            {/* Stat Cards */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard
                icon={<Flame className="w-5 h-5 text-coral" />}
                bg="bg-coral/10"
                value={String(stats.streakDays)}
                label="Day Streak"
                sub={stats.streakDays > 0 ? "Keep it up!" : undefined}
                pulse={stats.streakDays > 0}
              />
              <StatCard
                icon={<Target className="w-5 h-5 text-teal" />}
                bg="bg-teal/10"
                value={String(stats.totalSessions)}
                label="Sessions Done"
              />
              <StatCard
                icon={<TrendingUp className="w-5 h-5 text-gold" />}
                bg="bg-gold/10"
                value={`${stats.improvement >= 0 ? "+" : ""}${stats.improvement} pts`}
                label="Improvement"
              />
              <StatCard
                icon={<Trophy className="w-5 h-5 text-gold" />}
                bg="bg-gold/10"
                value={String(stats.bestScore)}
                label="Best Score"
              />
            </div>

            {/* Chart + Form */}
            <div className="grid lg:grid-cols-5 gap-3">

              {/* Chart */}
              <Card className="lg:col-span-3 bg-card rounded-2xl shadow-card border border-border/50 p-5 flex flex-col">
                <div className="flex items-start justify-between mb-1 flex-shrink-0">
                  <div>
                    <h2 className="text-xl font-bold text-foreground font-serif">
                      Your Performance
                    </h2>
                    {chartMode === "overall" ? (
                      <p className="text-xs text-muted-foreground mt-0.5">Overall score</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">Score breakdown across all 4 criteria.</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
                    <button
                      onClick={() => { setChartMode("overall"); setAnimationDone(false); }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-[background,color] duration-150 ${
                        chartMode === "overall"
                          ? "bg-card text-foreground shadow-soft"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Overall
                    </button>
                    <button
                      onClick={() => { setChartMode("breakdown"); setAnimationDone(false); }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-[background,color] duration-150 ${
                        chartMode === "breakdown"
                          ? "bg-card text-foreground shadow-soft"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Breakdown
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 relative">
                  {/* Breakdown legend overlay — absolutely positioned inside chart, doesn't affect layout */}
                  {chartMode === "breakdown" && (
                    <div className="absolute top-2 left-10 z-10 flex flex-col gap-1.5 bg-card/85 backdrop-blur-sm rounded-xl px-2.5 py-2 border border-border/40 shadow-soft">
                      {[
                        { label: "Technical", color: "#D4A843" },
                        { label: "Problem-Solving", color: "#4D9E8E" },
                        { label: "Communication", color: "#5CAD7A" },
                        { label: "Relevance", color: "#E08060" },
                      ].map(({ label, color }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-xs text-muted-foreground font-medium">{label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart key={chartMode} data={chartData} margin={{ top: 8, right: 12, left: -4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="4 4" stroke="hsl(30,15%,91%)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "hsl(25,20%,52%)" }}
                        axisLine={{ stroke: "hsl(30,15%,87%)" }}
                        tickLine={false}
                        dy={5}
                        tickFormatter={(v) => v === "" ? "" : `S${v}`}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tick={{ fontSize: 11, fill: "hsl(25,20%,52%)" }}
                        axisLine={false}
                        tickLine={false}
                        width={34}
                      />
                      <Tooltip content={<TooltipContent />} />

                      {chartMode === "overall" ? (
                        <>
                          <Line
                            type="monotone"
                            dataKey="Overall Score"
                            stroke="#E08060"
                            strokeWidth={2.5}
                            dot={{ r: 3.5, fill: "#E08060", strokeWidth: 0 }}
                            activeDot={{ r: 5, strokeWidth: 0 }}
                            connectNulls={false}
                            isAnimationActive={!animationDone}
                            animationDuration={700}
                            onAnimationEnd={() => setAnimationDone(true)}
                          />
                          <Line
                            type="monotone"
                            dataKey="Your Potential"
                            stroke="#E08060"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            strokeOpacity={0.55}
                            dot={false}
                            activeDot={false}
                            connectNulls={true}
                            isAnimationActive={!animationDone}
                            animationDuration={700}
                          />
                        </>
                      ) : (
                        <>
                          <Line type="monotone" dataKey="Technical"      stroke="#D4A843" strokeWidth={2} dot={{ r: 3.5, fill: "#D4A843", stroke: "hsl(30,20%,99%)", strokeWidth: 1.5 }} activeDot={{ r: 5.5, fill: "#D4A843", stroke: "hsl(30,20%,99%)", strokeWidth: 1.5 }} connectNulls={true} isAnimationActive={!animationDone} animationDuration={700} onAnimationEnd={() => setAnimationDone(true)} />
                          <Line type="monotone" dataKey="Problem-Solving" stroke="#4D9E8E" strokeWidth={2} dot={{ r: 3.5, fill: "#4D9E8E", stroke: "hsl(30,20%,99%)", strokeWidth: 1.5 }} activeDot={{ r: 5.5, fill: "#4D9E8E", stroke: "hsl(30,20%,99%)", strokeWidth: 1.5 }} connectNulls={true} isAnimationActive={!animationDone} animationDuration={700} />
                          <Line type="monotone" dataKey="Communication"   stroke="#5CAD7A" strokeWidth={2} dot={{ r: 3.5, fill: "#5CAD7A", stroke: "hsl(30,20%,99%)", strokeWidth: 1.5 }} activeDot={{ r: 5.5, fill: "#5CAD7A", stroke: "hsl(30,20%,99%)", strokeWidth: 1.5 }} connectNulls={true} isAnimationActive={!animationDone} animationDuration={700} />
                          <Line type="monotone" dataKey="Relevance"       stroke="#E08060" strokeWidth={2} dot={{ r: 3.5, fill: "#E08060", stroke: "hsl(30,20%,99%)", strokeWidth: 1.5 }} activeDot={{ r: 5.5, fill: "#E08060", stroke: "hsl(30,20%,99%)", strokeWidth: 1.5 }} connectNulls={true} isAnimationActive={!animationDone} animationDuration={700} />
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Form — glowing coral border */}
              <Card
                className="lg:col-span-2 bg-card rounded-2xl border border-coral/30 p-6"
                style={{
                  boxShadow: "0 0 0 1.5px hsl(18, 75%, 65%, 0.45), 0 0 32px -2px hsl(18, 75%, 65%, 0.30), 0 8px 30px -6px hsl(25, 30%, 15%, 0.10)",
                }}
              >
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-foreground font-serif">
                    New Mock Interview
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configure and start your next session
                  </p>
                </div>
                <InterviewForm />
              </Card>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Index;
