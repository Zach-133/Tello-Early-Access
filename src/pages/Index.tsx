import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import AppHeader from "@/components/AppHeader";
import { InterviewForm } from "@/components/InterviewForm";
import { Card } from "@/components/ui/card";
import {
  Flame, Target, TrendingUp, Trophy, Loader2, Sparkles,
} from "lucide-react";
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
  credits_remaining?: number;
  isNewUser?: boolean;
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
  if (!stats || stats.totalSessions === 0) return "Let's get you prepped for that dream job.";
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
    "Your Potential": mode === "overall" && i === sessions.length - 1 ? s.finalScore : null,
    "Technical":       Math.round(s.technicalKnowledge * 10),
    "Problem-Solving": Math.round(s.problemSolving * 10) + 0.5,
    "Communication":   Math.round(s.communicationSkills * 10) - 0.5,
    "Relevance":       Math.round(s.relevance * 10) + 1,
  }));

  if (mode === "breakdown") return actual;

  const lastScore = sessions[sessions.length - 1].finalScore;
  const targetScore = Math.min(Math.max(lastScore + 25, 80), 98);
  const range = targetScore - lastScore;
  const offsets = [0.18, 0.50, 0.65, 1.0];
  const nudges = [+3, +8, -5, 0];

  const projected = offsets.map((t, i) => ({
    label: "",
    date: null,
    "Overall Score": null,
    "Your Potential": Math.round(lastScore + range * t + nudges[i]),
    "Technical": null, "Problem-Solving": null,
    "Communication": null, "Relevance": null,
  }));

  return [...actual, ...projected];
};

const MOCK_OVERALL_DATA = [
  { label: "1", "Overall Score": 10 },
  { label: "2", "Overall Score": 46 },
  { label: "3", "Overall Score": 35 },
  { label: "4", "Overall Score": 63 },
  { label: "5", "Overall Score": 81 },
];

const MOCK_BREAKDOWN_DATA = [
  { label: "1", Technical: 8,  "Problem-Solving": 12, Communication: 10, Relevance: 9  },
  { label: "2", Technical: 50, "Problem-Solving": 42, Communication: 52, Relevance: 44 },
  { label: "3", Technical: 32, "Problem-Solving": 40, Communication: 28, Relevance: 38 },
  { label: "4", Technical: 60, "Problem-Solving": 68, Communication: 55, Relevance: 62 },
  { label: "5", Technical: 78, "Problem-Solving": 84, Communication: 75, Relevance: 82 },
];

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
  muted?: boolean;
}

const StatCard = ({ icon, bg, value, label, sub, pulse, muted }: StatCardProps) => (
  <Card className="bg-card rounded-2xl shadow-card border border-border/50 p-4 hover:shadow-medium hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200 cursor-default">
    <div className="flex flex-col items-center text-center gap-1.5">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center ${pulse ? "animate-pulse-soft" : ""}`}>
        {icon}
      </div>
      <p className={muted ? "text-sm font-medium text-muted-foreground" : "text-2xl font-bold text-foreground font-serif"}>{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-coral font-medium">{sub}</p>}
    </div>
  </Card>
);

// ── Mode Toggle Pill ─────────────────────────────────────────────────────────

interface ModePillProps {
  proOpen: boolean;
  setProOpen: (v: boolean) => void;
}

const ModePill = ({ proOpen, setProOpen }: ModePillProps) => {
  const stdRef = useRef<HTMLButtonElement>(null);
  const proRef = useRef<HTMLButtonElement>(null);
  const [ind, setInd] = useState({ left: 2, width: 0 });

  useLayoutEffect(() => {
    const btn = proOpen ? proRef.current : stdRef.current;
    if (btn) setInd({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [proOpen]);

  return (
    <div
      className="relative inline-flex items-center p-0.5 rounded-full flex-shrink-0"
      style={{ background: "hsl(30,20%,91%)" }}
    >
      {/* Sliding brown indicator — tracks each button's exact position + width */}
      <div
        className="absolute inset-y-0.5 rounded-full pointer-events-none"
        style={{
          left: ind.left,
          width: ind.width,
          background: "linear-gradient(135deg, hsl(22,52%,22%) 0%, hsl(18,55%,16%) 100%)",
          boxShadow: "0 2px 10px -2px hsl(22,52%,20%,0.55), 0 0 18px -4px hsl(22,52%,20%,0.35)",
          transition: "left 240ms cubic-bezier(0.33,1,0.68,1), width 240ms cubic-bezier(0.33,1,0.68,1)",
        }}
      />
      <button
        ref={stdRef}
        type="button"
        onClick={() => setProOpen(false)}
        className="relative z-10 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
        style={{ color: !proOpen ? "hsl(30,30%,92%)" : "hsl(25,15%,50%)", transition: "color 240ms ease" }}
      >
        Standard
      </button>
      <button
        ref={proRef}
        type="button"
        onClick={() => setProOpen(true)}
        className="relative z-10 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 whitespace-nowrap"
        style={{ color: proOpen ? "hsl(30,30%,92%)" : "hsl(25,15%,50%)", transition: "color 240ms ease" }}
      >
        <Sparkles className="w-3 h-3" />
        PRO <span style={{ fontSize: "11px", opacity: 0.85 }}>(unlocked)</span>
      </button>
    </div>
  );
};

// ── Shared card glow style ───────────────────────────────────────────────────

const getCardStyle = (proOpen: boolean): React.CSSProperties => ({
  border: proOpen
    ? "1.5px solid hsl(22,52%,20%,0.32)"
    : "1.5px solid hsl(18,75%,65%,0.35)",
  boxShadow: proOpen
    ? "0 0 0 1px hsl(22,52%,20%,0.16), 0 0 28px -2px hsl(22,52%,20%,0.14), 0 8px 30px -6px hsl(25,30%,15%,0.10)"
    : "0 0 0 1.5px hsl(18,75%,65%,0.45), 0 0 32px -2px hsl(18,75%,65%,0.30), 0 8px 30px -6px hsl(25,30%,15%,0.10)",
  transition: "border 300ms ease, box-shadow 300ms ease",
});

// ── Shared card header (title + pill on right) ───────────────────────────────

interface CardHeaderProps {
  proOpen: boolean;
  setProOpen: (v: boolean) => void;
  subtitle: string;
  creditsRemaining?: number | null;
}

const FormCardHeader = ({ proOpen, setProOpen, subtitle, creditsRemaining }: CardHeaderProps) => {
  const creditColor =
    creditsRemaining === null || creditsRemaining === undefined ? "hsl(160,45%,38%)"
    : creditsRemaining < 5  ? "hsl(0,65%,50%)"
    : creditsRemaining < 15 ? "hsl(32,90%,32%)"
    : "hsl(160,45%,38%)";

  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-xl font-bold text-foreground font-serif">
          {proOpen ? (
            <>
              New Mock Interview{" "}
              <span style={{ fontWeight: 800, color: "hsl(22,52%,20%)" }}>PRO</span>
            </>
          ) : (
            "New Mock Interview"
          )}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        {creditsRemaining !== null && creditsRemaining !== undefined && (
          <p className="text-xs font-medium mt-1" style={{ color: creditColor }}>
            {creditsRemaining.toFixed(1)} min remaining
          </p>
        )}
      </div>
      <ModePill proOpen={proOpen} setProOpen={setProOpen} />
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────

const Index = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "loaded" | "empty">("loading");
  const [data, setData] = useState<DashboardData | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>("overall");
  const [animationDone, setAnimationDone] = useState(false);

  // PRO features state — lifted here so InterviewForm can read on submit
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobDescLink, setJobDescLink] = useState("");
  const [proOpen, setProOpen] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  useEffect(() => {
    const fetchDashboard = async () => {
      const email = user?.email;
      if (!email) { setStatus("empty"); return; }

      const cacheKey = `tello_dashboard_${email}`;
      const isStale = sessionStorage.getItem("tello_dashboard_stale") === "true";
      const cached = sessionStorage.getItem(cacheKey);

      if (cached && !isStale) {
        try {
          const json: DashboardData = JSON.parse(cached);
          if (typeof json.credits_remaining === "number") setCreditsRemaining(json.credits_remaining);
          if (json.isNewUser) setIsNewUser(true);
          if (!json.sessions || json.sessions.length === 0) {
            setStatus("empty");
          } else {
            setData(json);
            setStatus("loaded");
          }
          return;
        } catch {
          // corrupted cache — fall through to fetch
        }
      }

      try {
        const res = await fetch(DASHBOARD_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, userId: user?.id }),
        });
        if (!res.ok) throw new Error();
        const json: DashboardData = await res.json();
        if (typeof json.credits_remaining === "number") setCreditsRemaining(json.credits_remaining);
        if (json.isNewUser) setIsNewUser(true);
        sessionStorage.setItem(cacheKey, JSON.stringify(json));
        sessionStorage.removeItem("tello_dashboard_stale");
        if (!json.sessions || json.sessions.length === 0) {
          setStatus("empty");
        } else {
          setData(json);
          setStatus("loaded");
        }
      } catch (err) {
        console.error("[Dashboard] WF8 fetch failed:", err);
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

      <div className="container mx-auto px-4 pt-6 pb-4 max-w-7xl">

        {/* Welcome */}
        <div className="mb-5">
          <h1 className="text-4xl font-bold text-foreground font-serif leading-tight">
            {isNewUser ? `Welcome, ${firstName}.` : `Welcome back, ${firstName}.`}
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

        {/* ── New user — full dashboard layout with zeroed stats + mock chart ── */}
        {status === "empty" && isNewUser && (
          <div className="space-y-3 animate-fade-in">

            {/* Stat Cards */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard icon={<Flame className="w-5 h-5 text-coral" />} bg="bg-coral/10" value="0" label="Day Streak" />
              <StatCard icon={<Target className="w-5 h-5 text-teal" />} bg="bg-teal/10" value="0" label="Sessions Done" />
              <StatCard icon={<TrendingUp className="w-5 h-5 text-gold" />} bg="bg-gold/10" value="N/A" label="Improvement" muted />
              <StatCard icon={<Trophy className="w-5 h-5 text-gold" />} bg="bg-gold/10" value="N/A" label="Best Score" muted />
            </div>

            {/* Chart + Form */}
            <div className="flex items-stretch gap-3">

              {/* Mock chart */}
              <Card
                className="bg-card rounded-2xl shadow-card border border-border/50 p-5 flex flex-col min-w-0"
                style={{
                  flex: proOpen ? "2 2 0" : "3 3 0",
                  transition: "flex 320ms cubic-bezier(0.33,1,0.68,1)",
                  minHeight: "380px",
                }}
              >
                <div className="flex items-start justify-between mb-1 flex-shrink-0">
                  <div>
                    <h2 className="text-xl font-bold text-foreground font-serif">Your Performance</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {chartMode === "overall" ? "Overall score" : "Score breakdown across all 4 criteria."}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
                    <button
                      onClick={() => setChartMode("overall")}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-[background,color] duration-150 ${chartMode === "overall" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Overall
                    </button>
                    <button
                      onClick={() => setChartMode("breakdown")}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-[background,color] duration-150 ${chartMode === "breakdown" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Breakdown
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 relative">
                  {chartMode === "breakdown" && (
                    <div className="absolute top-2 left-10 z-10 flex flex-col gap-1.5 bg-card/85 backdrop-blur-sm rounded-xl px-2.5 py-2 border border-border/40 shadow-soft">
                      {[
                        { label: "Technical",      color: "#D4A843" },
                        { label: "Problem-Solving", color: "#4D9E8E" },
                        { label: "Communication",  color: "#5CAD7A" },
                        { label: "Relevance",      color: "#E08060" },
                      ].map(({ label, color }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-xs text-muted-foreground font-medium">{label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      key={chartMode}
                      data={chartMode === "overall" ? MOCK_OVERALL_DATA : MOCK_BREAKDOWN_DATA}
                      margin={{ top: 8, right: 12, left: -4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="4 4" stroke="hsl(30,15%,91%)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "hsl(25,20%,52%)" }}
                        axisLine={{ stroke: "hsl(30,15%,87%)" }}
                        tickLine={false}
                        dy={5}
                        tickFormatter={(v) => `S${v}`}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tick={{ fontSize: 11, fill: "hsl(25,20%,52%)" }}
                        axisLine={false}
                        tickLine={false}
                        width={34}
                      />
                      {chartMode === "overall" ? (
                        <Line
                          type="monotone" dataKey="Overall Score"
                          stroke="hsl(25,10%,70%)" strokeWidth={2.5}
                          dot={{ r: 3.5, fill: "hsl(25,10%,70%)", strokeWidth: 0 }}
                          activeDot={false} isAnimationActive={false}
                        />
                      ) : (
                        <>
                          <Line type="monotone" dataKey="Technical"      stroke="#D4A843" strokeWidth={2} strokeOpacity={0.55} dot={{ r: 3.5, fill: "#D4A843", fillOpacity: 0.55, strokeWidth: 0 }} activeDot={false} isAnimationActive={false} />
                          <Line type="monotone" dataKey="Problem-Solving" stroke="#4D9E8E" strokeWidth={2} strokeOpacity={0.55} dot={{ r: 3.5, fill: "#4D9E8E", fillOpacity: 0.55, strokeWidth: 0 }} activeDot={false} isAnimationActive={false} />
                          <Line type="monotone" dataKey="Communication"   stroke="#5CAD7A" strokeWidth={2} strokeOpacity={0.55} dot={{ r: 3.5, fill: "#5CAD7A", fillOpacity: 0.55, strokeWidth: 0 }} activeDot={false} isAnimationActive={false} />
                          <Line type="monotone" dataKey="Relevance"       stroke="#E08060" strokeWidth={2} strokeOpacity={0.55} dot={{ r: 3.5, fill: "#E08060", fillOpacity: 0.55, strokeWidth: 0 }} activeDot={false} isAnimationActive={false} />
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Form */}
              <div
                className="min-w-0"
                style={{
                  flex: proOpen ? "3 3 0" : "2 2 0",
                  transition: "flex 320ms cubic-bezier(0.33,1,0.68,1)",
                }}
              >
                <Card className="bg-card rounded-2xl p-6 h-full" style={getCardStyle(proOpen)}>
                  <FormCardHeader
                    proOpen={proOpen}
                    setProOpen={setProOpen}
                    subtitle="Configure and start your first session."
                    creditsRemaining={null}
                  />
                  <InterviewForm
                    cvFile={cvFile}
                    jobDescLink={jobDescLink}
                    proOpen={proOpen}
                    setCvFile={setCvFile}
                    setJobDescLink={setJobDescLink}
                    creditsRemaining={null}
                  />
                </Card>
              </div>

            </div>
          </div>
        )}

        {/* ── Empty state (fetch failed) — narrow form card only ── */}
        {status === "empty" && !isNewUser && (
          <div
            style={{
              width: proOpen ? "580px" : "320px",
              transition: "width 320ms cubic-bezier(0.33, 1, 0.68, 1)",
            }}
          >
            <Card className="bg-card rounded-2xl p-6" style={{ ...getCardStyle(proOpen), minHeight: "420px" }}>
              <FormCardHeader
                proOpen={proOpen}
                setProOpen={setProOpen}
                subtitle="Configure and start your first session!"
                creditsRemaining={creditsRemaining}
              />
              <InterviewForm
                cvFile={cvFile}
                jobDescLink={jobDescLink}
                proOpen={proOpen}
                setCvFile={setCvFile}
                setJobDescLink={setJobDescLink}
                creditsRemaining={creditsRemaining}
              />
            </Card>
          </div>
        )}

        {/* ── Loaded state — full dashboard ── */}
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

            {/* Chart + Form — chart compresses when PRO opens, form expands */}
            <div className="flex items-stretch gap-3">

              {/* Chart — shrinks when PRO open */}
              <Card
                className="bg-card rounded-2xl shadow-card border border-border/50 p-5 flex flex-col min-w-0"
                style={{
                  flex: proOpen ? "2 2 0" : "3 3 0",
                  transition: "flex 320ms cubic-bezier(0.33,1,0.68,1)",
                  minHeight: "420px",
                }}
              >
                <div className="flex items-start justify-between mb-1 flex-shrink-0">
                  <div>
                    <h2 className="text-xl font-bold text-foreground font-serif">
                      Your Performance
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {chartMode === "overall" ? "Overall score" : "Score breakdown across all 4 criteria."}
                    </p>
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
                            type="monotone" dataKey="Overall Score" stroke="#E08060" strokeWidth={2.5}
                            dot={{ r: 3.5, fill: "#E08060", strokeWidth: 0 }}
                            activeDot={{ r: 5, strokeWidth: 0 }} connectNulls={false}
                            isAnimationActive={!animationDone} animationDuration={700}
                            onAnimationEnd={() => setAnimationDone(true)}
                          />
                          <Line
                            type="monotone" dataKey="Your Potential" stroke="#E08060" strokeWidth={2}
                            strokeDasharray="6 4" strokeOpacity={0.55}
                            dot={false} activeDot={false} connectNulls={true}
                            isAnimationActive={!animationDone} animationDuration={700}
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

              {/* Form — expands when PRO open */}
              <div
                className="min-w-0"
                style={{
                  flex: proOpen ? "3 3 0" : "2 2 0",
                  transition: "flex 320ms cubic-bezier(0.33,1,0.68,1)",
                }}
              >
                <Card className="bg-card rounded-2xl p-6 h-full" style={getCardStyle(proOpen)}>
                  <FormCardHeader
                    proOpen={proOpen}
                    setProOpen={setProOpen}
                    subtitle="Configure and start your next session"
                    creditsRemaining={isNewUser ? null : creditsRemaining}
                  />
                  <InterviewForm
                    cvFile={cvFile}
                    jobDescLink={jobDescLink}
                    proOpen={proOpen}
                    setCvFile={setCvFile}
                    setJobDescLink={setJobDescLink}
                    creditsRemaining={isNewUser ? null : creditsRemaining}
                  />
                </Card>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Index;
