import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const WEBHOOK_URL = "https://n8n.zach13.com/webhook/743697f7-3774-4876-b10d-775cbbb67613";

interface FormData {
  duration: string;
  jobField: string;
  difficulty: string;
}

export function InterviewForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    duration: "",
    jobField: "",
    difficulty: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const email = user?.email || '';

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, name, email }),
      });

      if (!response.ok) {
        throw new Error("Webhook request failed");
      }

      const data = await response.json();

      navigate("/interview", {
        state: {
          sessionId: data.sessionId,
          name: data.name,
          duration: data.duration,
          jobField: data.jobField,
          difficulty: data.difficulty,
        },
      });
    } catch (err) {
      setError("Unable to start interview. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.duration && formData.jobField && formData.difficulty;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="duration" className="text-sm font-medium text-foreground">
          Interview Duration
        </Label>
        <Select
          value={formData.duration}
          onValueChange={(value) => setFormData({ ...formData, duration: value })}
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
        <Label htmlFor="jobField" className="text-sm font-medium text-foreground">
          Job Field
        </Label>
        <Select
          value={formData.jobField}
          onValueChange={(value) => setFormData({ ...formData, jobField: value })}
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
        <Label htmlFor="difficulty" className="text-sm font-medium text-foreground">
          Difficulty Level
        </Label>
        <Select
          value={formData.difficulty}
          onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
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

      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        type="submit"
        variant="coral"
        disabled={!isFormValid || isLoading}
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
    </form>
  );
}
