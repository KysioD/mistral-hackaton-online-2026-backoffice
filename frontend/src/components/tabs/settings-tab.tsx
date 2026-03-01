"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings, AppSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Save, KeyRound, Cpu, Mic, Volume2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const MASK = "••••••••";

interface FieldConfig {
  key: keyof AppSettings;
  label: string;
  placeholder: string;
  isSecret: boolean;
  icon: React.ReactNode;
  description: string;
}

const FIELDS: FieldConfig[] = [
  {
    key: "MISTRAL_API_KEY",
    label: "Mistral API Key",
    placeholder: "Enter your Mistral API key",
    isSecret: true,
    icon: <KeyRound className="h-4 w-4" />,
    description: "Used for NPC dialogue (LLM) and Voxtral speech-to-text.",
  },
  {
    key: "LLM_MODEL",
    label: "LLM Model",
    placeholder: "e.g. ministral-8b-latest",
    isSecret: false,
    icon: <Cpu className="h-4 w-4" />,
    description: "Mistral model used for NPC conversation generation.",
  },
  {
    key: "VOXTRAL_MODEL",
    label: "Voxtral Model",
    placeholder: "e.g. voxtral-mini-transcribe-realtime-2602",
    isSecret: false,
    icon: <Mic className="h-4 w-4" />,
    description: "Mistral model used for real-time speech-to-text transcription.",
  },
  {
    key: "ELEVENLABS_API_KEY",
    label: "ElevenLabs API Key",
    placeholder: "Enter your ElevenLabs API key",
    isSecret: true,
    icon: <KeyRound className="h-4 w-4" />,
    description: "Used for text-to-speech audio generation.",
  },
  {
    key: "ELEVENLABS_VOICE_ID",
    label: "ElevenLabs Default Voice ID",
    placeholder: "e.g. 21m00Tcm4TlvDq8ikWAM",
    isSecret: false,
    icon: <Volume2 className="h-4 w-4" />,
    description: "Default voice used when an NPC has no specific voice assigned.",
  },
];

export function SettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const [formValues, setFormValues] = useState<Partial<AppSettings>>({});
  const formValuesRef = useRef<Partial<AppSettings>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const initialized = useRef(false);

  // Populate form only once on first load — never overwrite user edits
  useEffect(() => {
    if (data && !initialized.current) {
      setFormValues({ ...data });
      formValuesRef.current = { ...data };
      initialized.current = true;
    }
  }, [data]);

  const handleChange = (key: keyof AppSettings, value: string) => {
    setFormValues((prev) => {
      const next = { ...prev, [key]: value };
      formValuesRef.current = next;
      return next;
    });
  };

  // When user starts editing a secret field that still holds the mask, clear it first
  const handleSecretFocus = (key: keyof AppSettings) => {
    if (formValuesRef.current[key] === MASK) {
      handleChange(key, "");
    }
  };
  const { mutate: save, isPending } = useMutation({
    mutationFn: updateSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(["settings"], updated);
      // Only re-sync secret fields (they become masked after save); leave other fields as the user typed them
      setFormValues((prev) => {
        const next = { ...prev };
        for (const key of (["MISTRAL_API_KEY", "ELEVENLABS_API_KEY"] as const)) {
          next[key] = updated[key];
        }
        formValuesRef.current = next;
        return next;
      });
      toast({ title: "Settings saved", description: "Changes applied immediately." });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patch: Partial<AppSettings> = {};
    for (const field of FIELDS) {
      const val = formValuesRef.current[field.key] ?? "";
      patch[field.key] = val;
    }
    save(patch);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl mt-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1 overflow-y-auto min-h-0 flex-1">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">API Keys &amp; Configuration</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Changes are saved to the server&apos;s <code>.env</code> file and applied immediately.
          </p>
        </div>
        <Button type="submit" disabled={isPending} className="gap-2 shrink-0">
          <Save className="h-4 w-4" />
          {isPending ? "Saving…" : "Save Settings"}
        </Button>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {FIELDS.map((field) => {
          const value = formValues[field.key] ?? "";
          const isVisible = showSecret[field.key] ?? false;
          // Never flip to text while the value is still the server-sent mask
          const inputType = field.isSecret && (!isVisible || value === MASK) ? "password" : "text";

          return (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={field.key} className="flex items-center gap-2 font-medium">
                {field.icon}
                {field.label}
              </Label>
              <p className="text-xs text-muted-foreground">{field.description}</p>
              <div className="relative">
                <Input
                  id={field.key}
                  type={inputType}
                  value={value}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  onFocus={() => field.isSecret && handleSecretFocus(field.key)}
                  placeholder={value === MASK ? "Currently set — enter a new value to change" : field.placeholder}
                  className={field.isSecret ? "pr-10 font-mono" : "font-mono"}
                  autoComplete="off"
                />
                {field.isSecret && value !== MASK && (
                  <button
                    type="button"
                    onClick={() => setShowSecret((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={isVisible ? "Hide value" : "Show value"}
                  >
                    {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {field.isSecret && value === MASK && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">✓ Key is set. Leave unchanged to keep the current value.</p>
              )}
              {field.isSecret && !value && (
                <p className="text-xs text-amber-600 dark:text-amber-400">⚠ Not set.</p>
              )}
            </div>
          );
        })}
      </div>
    </form>
  );
}
