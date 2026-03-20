import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText, UploadCloud, X, Link2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const WEBHOOK_URL = "https://n8n.zach13.com/webhook/743697f7-3774-4876-b10d-775cbbb67613";

// Rich dark brown (PRO accent)
const DARK_BROWN = "hsl(22,52%,20%)";

interface FormData {
  duration: string;
  jobField: string;
  difficulty: string;
}

interface InterviewFormProps {
  cvFile?: File | null;
  jobDescLink?: string;
  proOpen?: boolean;
  setCvFile?: (f: File | null) => void;
  setJobDescLink?: (v: string) => void;
  creditsRemaining?: number | null;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function InterviewForm({
  cvFile,
  jobDescLink = "",
  proOpen,
  setCvFile,
  setJobDescLink,
  creditsRemaining,
}: InterviewFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    duration: "",
    jobField: "",
    difficulty: "",
  });

  // Delay PRO column render by one frame so outer flex transition fires first (prevents chart jerk)
  const [proVisible, setProVisible] = useState(false);
  useEffect(() => {
    if (proOpen) {
      const id = requestAnimationFrame(() => setProVisible(true));
      return () => cancelAnimationFrame(id);
    } else {
      setProVisible(false);
    }
  }, [proOpen]);

  // PRO: drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback(
    (file: File) => {
      setDragError(null);
      if (file.type !== "application/pdf") {
        setDragError("Only PDF files are accepted.");
        return;
      }
      setCvFile?.(file);
    },
    [setCvFile]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) acceptFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (insufficientCredits) return;
    setError(null);
    setIsLoading(true);

    const name =
      user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
    const email = user?.email || "";

    try {
      let response: Response;

      const cvExists = !!(proOpen && cvFile);
      const jdExists = !!(proOpen && (jobDescLink ?? "").trim().length > 0);

      const userId = user?.id || "";

      if (cvExists) {
        const fd = new FormData();
        fd.append("duration", formData.duration);
        fd.append("jobField", formData.jobField);
        fd.append("difficulty", formData.difficulty);
        fd.append("name", name);
        fd.append("email", email);
        fd.append("userId", userId);
        fd.append("cvExists", "True");
        fd.append("cv", cvFile!, cvFile!.name);
        fd.append("jdExists", jdExists ? "True" : "False");
        fd.append("jd", (jobDescLink ?? "").trim());
        response = await fetch(WEBHOOK_URL, { method: "POST", body: fd });
      } else {
        response = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            name,
            email,
            userId,
            cvExists: "False",
            jdExists: jdExists ? "True" : "False",
            jd: (jobDescLink ?? "").trim(),
          }),
        });
      }

      if (response.status === 403) {
        const data = await response.json();
        if (data.error === "insufficient_credits") {
          setError("You don't have enough credits remaining to start an interview.");
          return;
        }
      }
      if (!response.ok) throw new Error("Webhook request failed");

      const data = await response.json();

      navigate("/interview", {
        state: {
          sessionId: data.sessionId,
          name: data.name,
          duration: data.duration,
          jobField: data.jobField,
          difficulty: data.difficulty,
          cvExists,
          jdExists,
        },
      });

      // Reset PRO state so the next session starts clean
      setCvFile?.(null);
      setJobDescLink?.("");
    } catch {
      setError("Unable to start interview. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.duration && formData.jobField && formData.difficulty;
  const insufficientCredits = creditsRemaining !== null && creditsRemaining !== undefined && creditsRemaining < 5;
  const showPro = proVisible && setCvFile && setJobDescLink;

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Fields area: two-column when PRO open, single column otherwise ── */}
      <div className={`mb-5 ${showPro ? "flex gap-5 items-start" : ""}`}>

        {/* Left col — mandatory selects (always shown) */}
        <div className={`space-y-4 ${showPro ? "flex-1 min-w-0" : ""}`}>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Interview Duration <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.duration}
              onValueChange={(v) => setFormData({ ...formData, duration: v })}
            >
              <SelectTrigger className="h-12 border-border bg-background text-foreground">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Job Field <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.jobField}
              onValueChange={(v) => setFormData({ ...formData, jobField: v })}
            >
              <SelectTrigger className="h-12 border-border bg-background text-foreground">
                <SelectValue placeholder="Select job field" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="Nursing">Nursing</SelectItem>
                <SelectItem value="Architecture">Architecture</SelectItem>
                <SelectItem value="Business">Business</SelectItem>
                <SelectItem value="Artificial Intelligence">Artificial Intelligence</SelectItem>
                <SelectItem value="AI Automation">AI Automation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Difficulty Level <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.difficulty}
              onValueChange={(v) => setFormData({ ...formData, difficulty: v })}
            >
              <SelectTrigger className="h-12 border-border bg-background text-foreground">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right col — PRO add-ons (only when PRO mode active) */}
        {showPro && (
          <div
            className="flex-1 min-w-0 pl-5 space-y-2.5 pro-col-enter"
            style={{ borderLeft: "1px solid hsl(22,52%,20%,0.18)" }}
          >
            {/* Section header */}
            <div>
              <p className="text-sm font-bold" style={{ color: DARK_BROWN }}>
                PRO features
              </p>
              <p className="text-xs mt-0.5 leading-snug" style={{ color: "hsl(22,40%,32%)" }}>
                Giving you a personalised interview experience, try for yourself!
              </p>
            </div>

            {/* CV / Resume */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <FileText className="w-3 h-3 flex-shrink-0" style={{ color: DARK_BROWN }} />
                Your Resume
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </label>

              {cvFile ? (
                <div
                  className="flex items-center gap-2.5 px-3 py-3 rounded-xl border bg-card"
                  style={{ borderColor: "hsl(22,52%,20%,0.28)" }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "hsl(22,52%,20%,0.08)" }}
                  >
                    <FileText className="w-4 h-4" style={{ color: DARK_BROWN }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{cvFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatSize(cvFile.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCvFile(null)}
                    className="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-[background,color] duration-150 flex-shrink-0"
                    aria-label="Remove file"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border-2 cursor-pointer px-4 py-3.5 flex flex-col items-center gap-1.5 select-none transition-[border-color,background] duration-200 text-center"
                  style={{
                    borderColor: isDragging ? DARK_BROWN : "hsl(22,52%,20%,0.35)",
                    background: isDragging ? "hsl(22,52%,20%,0.06)" : "hsl(22,52%,20%,0.025)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-[background] duration-200"
                    style={{ background: isDragging ? "hsl(22,52%,20%,0.14)" : "hsl(22,52%,20%,0.07)" }}
                  >
                    <UploadCloud className="w-4.5 h-4.5" style={{ color: DARK_BROWN }} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {isDragging ? "Drop to attach" : "Drop PDF here"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      or{" "}
                      <span className="underline underline-offset-2" style={{ color: DARK_BROWN }}>
                        browse file
                      </span>
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleFileInput}
                    className="sr-only"
                  />
                </div>
              )}

              {dragError && (
                <p className="text-[10px] text-destructive">{dragError}</p>
              )}
            </div>

            {/* Job Description URL */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Link2 className="w-3 h-3 flex-shrink-0" style={{ color: DARK_BROWN }} />
                Job Description URL
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                type="url"
                value={jobDescLink}
                onChange={(e) => setJobDescLink(e.target.value)}
                placeholder="Paste job listing URL..."
                className="w-full h-9 pl-3 pr-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-[border-color,box-shadow] duration-150"
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 0 3px hsl(22,52%,20%,0.12)";
                  e.currentTarget.style.borderColor = "hsl(22,52%,20%,0.45)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = "";
                  e.currentTarget.style.borderColor = "";
                }}
              />
            </div>

            {/* Disclaimer */}
            <p className="text-xs leading-relaxed" style={{ color: "hsl(22,40%,32%)" }}>
              ✦ Both fields are optional, skip them for a standard interview. Your data is only used to personalise your questions.
            </p>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Submit — always full-width at bottom ── */}
      <Button
        type="submit"
        variant="coral"
        disabled={!isFormValid || isLoading || insufficientCredits}
        className="h-12 w-full font-semibold disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Starting Interview...
          </>
        ) : (
          "Start Interview"
        )}
      </Button>

      {/* ── Insufficient credits notice ── */}
      {insufficientCredits && (
        <p className="text-center text-sm text-destructive mt-2">
          Insufficient credits.
        </p>
      )}
    </form>
  );
}
