"use client";

import { useMemo, useState, type ReactNode } from "react";
import { apiPost } from "@/lib/api";
import { useSim } from "@/lib/sim-context";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  BatteryCharging,
  Brain,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileCheck2,
  GraduationCap,
  Landmark,
  LineChart,
  Map,
  Scale,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrainFront,
  UsersRound,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PolicyTypeId =
  | "carbon-tax"
  | "ev-subsidy"
  | "education-reform"
  | "healthcare-reform"
  | "metro-expansion";

type ToggleKey = "equityGuardrail" | "publicHearing" | "pilotProgram" | "aiMonitoring" | "revenueNeutral";

type PolicyForm = {
  policyType: PolicyTypeId | "";
  policyName: string;
  district: string;
  implementation: string;
  budget: number;
  intensity: number;
  targetReach: number;
  toggles: Record<ToggleKey, boolean>;
};

type PolicyType = {
  id: PolicyTypeId;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "civic" | "signal" | "solar" | "park" | "coral" | "transit";
  defaultBudget: number;
  aiRecommendations: string[];
  risks: string[];
};

const steps = [
  { label: "Policy", description: "Choose scope" },
  { label: "Parameters", description: "Tune levers" },
  { label: "Safeguards", description: "Set controls" },
  { label: "Review", description: "Ship proposal" }
];

const policyTypes: PolicyType[] = [
  {
    id: "carbon-tax",
    title: "Carbon Tax",
    description: "Price emissions, fund transition programs, and reduce pollution across industrial corridors.",
    icon: CircleDollarSign,
    tone: "solar",
    defaultBudget: 420,
    aiRecommendations: [
      "Start with a phased rate to protect small manufacturers.",
      "Allocate 32% of revenue to household energy rebates.",
      "Run a district equity audit before citywide rollout."
    ],
    risks: ["Regressive cost burden", "Industrial relocation pressure", "Short-term consumer price increase"]
  },
  {
    id: "ev-subsidy",
    title: "EV Subsidy",
    description: "Accelerate EV adoption with targeted rebates, charging access, and fleet electrification.",
    icon: BatteryCharging,
    tone: "signal",
    defaultBudget: 260,
    aiRecommendations: [
      "Prioritize rebates in high-pollution commute zones.",
      "Pair subsidies with charging buildout near multifamily housing.",
      "Reserve 18% of budget for public fleet conversion."
    ],
    risks: ["Uneven charger access", "Grid peak pressure", "Subsidy capture by high-income households"]
  },
  {
    id: "education-reform",
    title: "Education Reform",
    description: "Improve outcomes with school funding, teacher capacity, digital access, and after-school support.",
    icon: GraduationCap,
    tone: "park",
    defaultBudget: 680,
    aiRecommendations: [
      "Fund early literacy first in districts with compounding gaps.",
      "Tie teacher retention grants to high-need schools.",
      "Measure impact through attendance and third-grade reading gains."
    ],
    risks: ["Slow outcome visibility", "Staffing capacity", "Procurement delays"]
  },
  {
    id: "healthcare-reform",
    title: "Healthcare Reform",
    description: "Expand preventative care, emergency response, clinic access, and health equity programs.",
    icon: Stethoscope,
    tone: "coral",
    defaultBudget: 740,
    aiRecommendations: [
      "Deploy mobile clinics to heat-vulnerable neighborhoods.",
      "Expand preventative care slots before emergency capacity.",
      "Use opt-in AI triage with clinical human review."
    ],
    risks: ["Clinical staffing shortage", "Privacy sensitivity", "Provider network fragmentation"]
  },
  {
    id: "metro-expansion",
    title: "Metro Expansion",
    description: "Plan high-capacity rail expansion with ridership, equity, land use, and construction tradeoffs.",
    icon: TrainFront,
    tone: "transit",
    defaultBudget: 1200,
    aiRecommendations: [
      "Run a two-corridor pilot before committing the full capital plan.",
      "Prioritize station access for underserved employment centers.",
      "Phase construction to avoid peak commuter disruption."
    ],
    risks: ["Capital overrun", "Construction disruption", "Displacement near stations"]
  }
];

const districts = ["Citywide", "Civic Core", "North Loop", "Harbor Edge", "Greenline", "East Habitat"];
const implementations = ["90-day pilot", "6-month phased rollout", "12-month citywide rollout", "3-year capital plan"];

const initialForm: PolicyForm = {
  policyType: "",
  policyName: "",
  district: "Citywide",
  implementation: "6-month phased rollout",
  budget: 420,
  intensity: 58,
  targetReach: 64,
  toggles: {
    equityGuardrail: true,
    publicHearing: true,
    pilotProgram: true,
    aiMonitoring: true,
    revenueNeutral: false
  }
};

export function PolicyBuilder() {
  const { simId } = useSim();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<PolicyForm>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedPolicy = policyTypes.find((policy) => policy.id === form.policyType) ?? null;
  const impact = useMemo(() => calculateImpact(form), [form]);
  const completion = Math.round(((step + 1) / steps.length) * 100);

  function updateForm<Key extends keyof PolicyForm>(key: Key, value: PolicyForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
  }

  function selectPolicy(policy: PolicyType) {
    setForm((current) => ({
      ...current,
      policyType: policy.id,
      policyName: current.policyName || policy.title,
      budget: policy.defaultBudget
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next.policyType;
      delete next.policyName;
      return next;
    });
  }

  function toggle(key: ToggleKey) {
    setForm((current) => ({
      ...current,
      toggles: {
        ...current.toggles,
        [key]: !current.toggles[key]
      }
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next.safeguards;
      return next;
    });
  }

  function validateStep(currentStep = step) {
    const nextErrors: Record<string, string> = {};

    if (currentStep === 0) {
      if (!form.policyType) nextErrors.policyType = "Select a policy type.";
      if (form.policyName.trim().length < 4) nextErrors.policyName = "Name must be at least 4 characters.";
      if (!form.district) nextErrors.district = "Choose a district scope.";
    }

    if (currentStep === 1) {
      if (form.budget < 25) nextErrors.budget = "Budget must be at least $25M.";
      if (form.intensity < 10) nextErrors.intensity = "Policy intensity must be at least 10%.";
      if (form.targetReach < 15) nextErrors.targetReach = "Target reach must be at least 15%.";
    }

    if (currentStep === 2) {
      const enabled = Object.values(form.toggles).filter(Boolean).length;
      if (enabled < 2) nextErrors.safeguards = "Enable at least two safeguards before review.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function nextStep() {
    if (!validateStep()) return;
    setStep((value) => Math.min(value + 1, steps.length - 1));
  }

  function previousStep() {
    setStep((value) => Math.max(value - 1, 0));
  }

  async function submitPolicy() {
    if (!validateStep(2) || !simId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const selected = policyTypes.find((p) => p.id === form.policyType);
      const payload = {
        simulation_id: simId,
        name: form.policyName,
        category: form.policyType,
        description: selected?.description ?? "",
        district: form.district,
        implementation_period: form.implementation,
        budget_millions: form.budget,
        intensity: form.intensity,
        target_reach: form.targetReach,
        safeguards: Object.entries(form.toggles)
          .filter(([, v]) => v)
          .map(([k]) => k),
        status: "proposed",
      };
      await apiPost("/api/v1/policies", payload);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create policy");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="glass-card city-map overflow-hidden rounded-lg p-4 sm:p-5 lg:p-6">
        <div className="relative z-[1] flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <Badge variant="glass" className="mb-3 gap-1.5">
              <Sparkles className="size-3.5 text-city-civic" />
              AI-assisted governance studio
            </Badge>
            <h1 className="text-display-md text-foreground">Visual Policy Builder</h1>
            <p className="mt-3 max-w-3xl text-body-lg text-muted-foreground">
              Create, simulate, validate, and summarize civic policies with configurable levers and AI recommendations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success" className="gap-1.5">
              <BadgeCheck className="size-3.5" />
              Validation active
            </Badge>
            <Button variant="outline">
              <FileCheck2 />
              Save draft
            </Button>
            <Button variant="signal">
              <Brain />
              Ask PolisAI
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="grid gap-5">
          <Stepper currentStep={step} completion={completion} />

          <div className="surface-card overflow-hidden rounded-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.24 }}
                className="p-4 sm:p-5 lg:p-6"
              >
                {step === 0 ? (
                  <PolicyStep
                    form={form}
                    selectedPolicy={selectedPolicy}
                    errors={errors}
                    onSelectPolicy={selectPolicy}
                    onUpdate={updateForm}
                  />
                ) : null}
                {step === 1 ? <ParametersStep form={form} errors={errors} onUpdate={updateForm} /> : null}
                {step === 2 ? <SafeguardsStep form={form} errors={errors} onToggle={toggle} /> : null}
                {step === 3 ? <ReviewStep form={form} selectedPolicy={selectedPolicy} impact={impact} /> : null}
              </motion.div>
            </AnimatePresence>

            <div className="flex flex-col-reverse gap-3 border-t border-border/70 bg-white/[0.72] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <Button variant="outline" onClick={previousStep} disabled={step === 0}>
                <ArrowLeft />
                Back
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row">
                {step < steps.length - 1 ? (
                  <Button onClick={nextStep} variant="signal">
                    Continue
                    <ArrowRight />
                  </Button>
                ) : submitted ? (
                  <Badge variant="success" className="px-4 py-2">Policy submitted!</Badge>
                ) : (
                  <>
                    {submitError && <p className="text-caption text-city-coral">{submitError}</p>}
                    <Button onClick={submitPolicy} variant="signal" disabled={submitting}>
                      {submitting ? "Submitting…" : "Generate proposal"}
                      <FileCheck2 />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <AIRecommendations selectedPolicy={selectedPolicy} form={form} />
        </div>

        <SummaryPanel form={form} selectedPolicy={selectedPolicy} impact={impact} errors={errors} />
      </section>
    </div>
  );
}

function Stepper({ currentStep, completion }: { currentStep: number; completion: number }) {
  return (
    <div className="surface-card rounded-lg p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="token-label">Builder progress</p>
          <h2 className="text-title-md text-foreground">{completion}% configured</h2>
        </div>
        <Badge variant="glass">{steps[currentStep].label}</Badge>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-2 rounded-full bg-city-civic"
          animate={{ width: `${completion}%` }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-4">
        {steps.map((item, index) => (
          <button
            key={item.label}
            type="button"
            className={cn(
              "rounded-md border px-3 py-3 text-left transition-all",
              index === currentStep
                ? "border-city-civic/35 bg-city-civic/10 shadow-polis-xs"
                : index < currentStep
                  ? "border-city-park/25 bg-city-park/10"
                  : "border-border/70 bg-white/[0.64]"
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full text-[11px] font-bold",
                  index <= currentStep ? "bg-city-civic text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {index < currentStep ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span className="text-body-sm font-bold text-foreground">{item.label}</span>
            </div>
            <p className="mt-1 pl-8 text-caption text-muted-foreground">{item.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function PolicyStep({
  form,
  selectedPolicy,
  errors,
  onSelectPolicy,
  onUpdate
}: {
  form: PolicyForm;
  selectedPolicy: PolicyType | null;
  errors: Record<string, string>;
  onSelectPolicy: (policy: PolicyType) => void;
  onUpdate: <Key extends keyof PolicyForm>(key: Key, value: PolicyForm[Key]) => void;
}) {
  return (
    <div className="grid gap-6">
      <SectionHeading
        eyebrow="Step 01"
        title="Choose the policy architecture"
        description="Start from one of five civic policy templates, then scope it by name and district."
      />

      <div className="grid gap-3 lg:grid-cols-5">
        {policyTypes.map((policy) => {
          const Icon = policy.icon;
          const active = form.policyType === policy.id;

          return (
            <button
              key={policy.id}
              type="button"
              onClick={() => onSelectPolicy(policy)}
              className={cn(
                "group rounded-lg border p-4 text-left shadow-polis-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-polis-md",
                active
                  ? "border-city-civic/45 bg-city-civic/10"
                  : "border-border/70 bg-white/[0.76] hover:border-primary/30"
              )}
            >
              <div className={cn("mb-5 grid size-11 place-items-center rounded-md", toneClass(policy.tone))}>
                <Icon className="size-5" />
              </div>
              <p className="text-body-sm font-bold text-foreground">{policy.title}</p>
              <p className="mt-2 text-caption text-muted-foreground">{policy.description}</p>
            </button>
          );
        })}
      </div>
      {errors.policyType ? <ErrorText>{errors.policyType}</ErrorText> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Policy name" error={errors.policyName}>
          <Input
            value={form.policyName}
            onChange={(event) => onUpdate("policyName", event.target.value)}
            placeholder="e.g. Greenline Clean Mobility Act"
          />
        </Field>
        <Field label="District scope" error={errors.district}>
          <SelectField value={form.district} onChange={(value) => onUpdate("district", value)} options={districts} />
        </Field>
        <Field label="Implementation model">
          <SelectField value={form.implementation} onChange={(value) => onUpdate("implementation", value)} options={implementations} />
        </Field>
      </div>

      {selectedPolicy ? (
        <div className="rounded-lg border border-city-civic/20 bg-city-civic/10 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="size-4 text-city-civic" />
            <p className="text-body-sm font-bold text-foreground">PolisAI template insight</p>
          </div>
          <p className="text-body-sm text-muted-foreground">
            {selectedPolicy.title} proposals perform best when paired with explicit equity safeguards and a measurable pilot window.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ParametersStep({
  form,
  errors,
  onUpdate
}: {
  form: PolicyForm;
  errors: Record<string, string>;
  onUpdate: <Key extends keyof PolicyForm>(key: Key, value: PolicyForm[Key]) => void;
}) {
  return (
    <div className="grid gap-6">
      <SectionHeading
        eyebrow="Step 02"
        title="Tune the policy levers"
        description="Use sliders to balance ambition, budget, and reach before simulation."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SliderControl
          label="Annual budget"
          value={form.budget}
          min={25}
          max={1500}
          step={25}
          suffix="M"
          prefix="$"
          error={errors.budget}
          onChange={(value) => onUpdate("budget", value)}
        />
        <SliderControl
          label="Policy intensity"
          value={form.intensity}
          min={0}
          max={100}
          step={1}
          suffix="%"
          error={errors.intensity}
          onChange={(value) => onUpdate("intensity", value)}
        />
        <SliderControl
          label="Target reach"
          value={form.targetReach}
          min={0}
          max={100}
          step={1}
          suffix="%"
          error={errors.targetReach}
          onChange={(value) => onUpdate("targetReach", value)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ParameterCard icon={Scale} label="Equity sensitivity" value={`${Math.round(form.targetReach * 0.84)}%`} />
        <ParameterCard icon={LineChart} label="Fiscal efficiency" value={`${Math.round((form.intensity / Math.max(form.budget, 1)) * 920)} pts`} />
        <ParameterCard icon={Zap} label="Implementation velocity" value={form.implementation.includes("90") ? "Fast" : form.implementation.includes("3-year") ? "Capital" : "Balanced"} />
      </div>
    </div>
  );
}

function SafeguardsStep({
  form,
  errors,
  onToggle
}: {
  form: PolicyForm;
  errors: Record<string, string>;
  onToggle: (key: ToggleKey) => void;
}) {
  const safeguards: { key: ToggleKey; label: string; description: string; icon: LucideIcon }[] = [
    {
      key: "equityGuardrail",
      label: "Equity guardrail",
      description: "Require district-level impact review before approval.",
      icon: Scale
    },
    {
      key: "publicHearing",
      label: "Public hearing",
      description: "Schedule citizen feedback before citywide rollout.",
      icon: UsersRound
    },
    {
      key: "pilotProgram",
      label: "Pilot program",
      description: "Start with a controlled launch and measurable gates.",
      icon: Map
    },
    {
      key: "aiMonitoring",
      label: "AI monitoring",
      description: "Continuously evaluate drift, bias, outcomes, and risk.",
      icon: Brain
    },
    {
      key: "revenueNeutral",
      label: "Revenue neutral",
      description: "Offset new spending with savings, fees, or grants.",
      icon: Banknote
    }
  ];

  return (
    <div className="grid gap-6">
      <SectionHeading
        eyebrow="Step 03"
        title="Add governance safeguards"
        description="Every proposal needs explicit controls, approval gates, and public accountability."
      />

      <div className="grid gap-3 lg:grid-cols-2">
        {safeguards.map((item) => {
          const Icon = item.icon;
          const active = form.toggles[item.key];

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onToggle(item.key)}
              className={cn(
                "flex items-start justify-between gap-4 rounded-lg border p-4 text-left shadow-polis-xs transition-all hover:-translate-y-0.5 hover:shadow-polis-md",
                active ? "border-city-civic/35 bg-city-civic/10" : "border-border/70 bg-white/[0.76]"
              )}
            >
              <div className="flex min-w-0 gap-3">
                <div className={cn("grid size-10 shrink-0 place-items-center rounded-md", active ? "bg-city-civic text-white" : "bg-muted text-muted-foreground")}>
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-body-sm font-bold text-foreground">{item.label}</p>
                  <p className="mt-1 text-body-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <span
                className={cn(
                  "relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors",
                  active ? "bg-city-civic" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 size-4 rounded-full bg-white shadow-polis-xs transition-transform",
                    active ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </span>
            </button>
          );
        })}
      </div>
      {errors.safeguards ? <ErrorText>{errors.safeguards}</ErrorText> : null}
    </div>
  );
}

function ReviewStep({
  form,
  selectedPolicy,
  impact
}: {
  form: PolicyForm;
  selectedPolicy: PolicyType | null;
  impact: ReturnType<typeof calculateImpact>;
}) {
  return (
    <div className="grid gap-6">
      <SectionHeading
        eyebrow="Step 04"
        title="Review the generated policy"
        description="PolisAI converts your selections into an executive-ready proposal summary."
      />

      <div className="rounded-lg border border-white/70 bg-white/[0.78] p-5 shadow-polis-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge variant="glass" className="mb-3">{selectedPolicy?.title ?? "Policy proposal"}</Badge>
            <h3 className="text-title-lg text-foreground">{form.policyName || "Untitled policy"}</h3>
            <p className="mt-2 max-w-2xl text-body-sm text-muted-foreground">
              Deploy a {form.implementation.toLowerCase()} across {form.district}, backed by a ${form.budget}M annual plan,
              {` ${form.intensity}%`} policy intensity, and {form.targetReach}% target reach.
            </p>
          </div>
          <Badge variant={impact.readiness >= 80 ? "success" : "warning"}>{impact.readiness}% readiness</Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <ReviewMetric label="Fiscal impact" value={`${impact.fiscal > 0 ? "+" : ""}${impact.fiscal}%`} />
          <ReviewMetric label="Citizen benefit" value={`${impact.citizen}%`} />
          <ReviewMetric label="Risk score" value={`${impact.risk}%`} />
          <ReviewMetric label="Confidence" value={`${impact.confidence}%`} />
        </div>
      </div>
    </div>
  );
}

function AIRecommendations({ selectedPolicy, form }: { selectedPolicy: PolicyType | null; form: PolicyForm }) {
  const recommendations = selectedPolicy?.aiRecommendations ?? [
    "Select a policy type to generate recommendations.",
    "PolisAI will compare fiscal, equity, and implementation tradeoffs.",
    "Recommendations update as budget, intensity, and safeguards change."
  ];

  return (
    <section className="glass-card rounded-lg p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="token-label">AI recommendations</p>
          <h2 className="text-title-md text-foreground">PolisAI policy copilot</h2>
        </div>
        <Badge variant="secondary">Live</Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {recommendations.map((recommendation, index) => (
          <motion.div
            key={recommendation}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-lg border border-white/70 bg-white/[0.74] p-4 shadow-polis-xs"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-md bg-city-signal/10 text-city-signal">
                <Sparkles className="size-3.5" />
              </div>
              <p className="text-caption font-bold uppercase text-muted-foreground">Recommendation {index + 1}</p>
            </div>
            <p className="text-body-sm text-foreground">{recommendation}</p>
          </motion.div>
        ))}
      </div>

      {selectedPolicy ? (
        <div className="mt-4 rounded-lg border border-city-solar/25 bg-city-solar/[0.12] p-4">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#8A5A00]" />
            <p className="text-body-sm font-bold text-foreground">Risk watch</p>
          </div>
          <p className="text-body-sm text-muted-foreground">
            {selectedPolicy.risks[form.intensity > 72 ? 1 : form.budget > selectedPolicy.defaultBudget ? 2 : 0]}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function SummaryPanel({
  form,
  selectedPolicy,
  impact,
  errors
}: {
  form: PolicyForm;
  selectedPolicy: PolicyType | null;
  impact: ReturnType<typeof calculateImpact>;
  errors: Record<string, string>;
}) {
  const enabledSafeguards = Object.entries(form.toggles).filter(([, enabled]) => enabled).length;
  const PolicyIcon = selectedPolicy?.icon ?? Landmark;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <aside className="sticky top-20 grid h-fit gap-5">
      <section className="surface-card rounded-lg p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="token-label">Summary panel</p>
            <h2 className="text-title-lg text-foreground">Policy package</h2>
          </div>
          <div className={cn("grid size-11 place-items-center rounded-md", selectedPolicy ? toneClass(selectedPolicy.tone) : "bg-muted text-muted-foreground")}>
            <PolicyIcon className="size-5" />
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-white/[0.76] p-4">
          <p className="text-body-sm font-bold text-foreground">{form.policyName || "Untitled policy"}</p>
          <p className="mt-1 text-body-sm text-muted-foreground">{selectedPolicy?.description ?? "Choose a policy type to begin."}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <SummaryMetric label="Budget" value={`$${form.budget}M`} />
          <SummaryMetric label="Intensity" value={`${form.intensity}%`} />
          <SummaryMetric label="Reach" value={`${form.targetReach}%`} />
          <SummaryMetric label="Safeguards" value={`${enabledSafeguards}/5`} />
        </div>

        <div className="mt-5 grid gap-3">
          <ImpactBar label="Readiness" value={impact.readiness} tone="civic" />
          <ImpactBar label="Citizen benefit" value={impact.citizen} tone="park" />
          <ImpactBar label="Implementation risk" value={impact.risk} tone="coral" inverted />
        </div>
      </section>

      <section className="glass-card rounded-lg p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="token-label">Validation</p>
            <h3 className="text-title-md text-foreground">{hasErrors ? "Needs attention" : "Ready for review"}</h3>
          </div>
          <Badge variant={hasErrors ? "warning" : "success"}>{hasErrors ? "Fix" : "Clean"}</Badge>
        </div>
        {hasErrors ? (
          <div className="grid gap-2">
            {Object.values(errors).map((error) => (
              <div key={error} className="rounded-md border border-city-solar/25 bg-city-solar/[0.12] px-3 py-2 text-body-sm text-[#8A5A00]">
                {error}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-muted-foreground">
            The proposal has the minimum required scope, funding, controls, and simulation inputs.
          </p>
        )}
      </section>
    </aside>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="max-w-3xl">
      <p className="token-label">{eyebrow}</p>
      <h2 className="mt-2 text-title-lg text-foreground">{title}</h2>
      <p className="mt-2 text-body-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-body-sm font-bold text-foreground">{label}</span>
      {children}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </label>
  );
}

function SelectField({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring h-10 w-full appearance-none rounded-md border border-input bg-white/[0.82] px-3 pr-9 text-body-sm font-semibold text-foreground shadow-polis-xs transition-colors hover:border-primary/35"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  prefix = "",
  suffix = "",
  error,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  error?: string;
  onChange: (value: number) => void;
}) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="rounded-lg border border-border/70 bg-white/[0.76] p-4 shadow-polis-xs">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-body-sm font-bold text-foreground">{label}</p>
          <p className="mt-1 text-caption text-muted-foreground">
            {min}
            {suffix} to {max}
            {suffix}
          </p>
        </div>
        <Badge variant="glass">
          {prefix}
          {value}
          {suffix}
        </Badge>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-city-civic"
        style={{
          background: `linear-gradient(90deg, #009E9D ${percent}%, #E8F0F1 ${percent}%)`
        }}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
    </div>
  );
}

function ParameterCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-white/[0.76] p-4 shadow-polis-xs">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-md bg-city-civic/10 text-city-civic">
          <Icon className="size-4" />
        </div>
        <p className="text-body-sm font-bold text-foreground">{label}</p>
      </div>
      <Badge variant="glass">{value}</Badge>
    </div>
  );
}

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-white/[0.72] p-3">
      <p className="token-label">{label}</p>
      <p className="mt-2 text-title-md text-foreground">{value}</p>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-white/[0.72] p-3">
      <p className="text-caption font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-title-md text-foreground">{value}</p>
    </div>
  );
}

function ImpactBar({
  label,
  value,
  tone,
  inverted = false
}: {
  label: string;
  value: number;
  tone: "civic" | "park" | "coral";
  inverted?: boolean;
}) {
  const color = {
    civic: "bg-city-civic",
    park: "bg-city-park",
    coral: "bg-city-coral"
  }[tone];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-body-sm">
        <span className="font-semibold text-foreground">{label}</span>
        <span className={cn("font-mono text-[11px] font-bold", inverted ? "text-city-coral" : "text-city-civic")}>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <motion.div
          className={cn("h-2 rounded-full", color)}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>
    </div>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return <p className="text-caption font-semibold text-city-coral">{children}</p>;
}

function calculateImpact(form: PolicyForm) {
  const safeguardCount = Object.values(form.toggles).filter(Boolean).length;
  const budgetWeight = Math.min(34, form.budget / 42);
  const intensityWeight = form.intensity * 0.22;
  const reachWeight = form.targetReach * 0.26;
  const safeguardWeight = safeguardCount * 5;
  const riskBase = Math.round(form.intensity * 0.46 + Math.max(0, form.budget - 800) * 0.018 - safeguardCount * 5);
  const readiness = clamp(Math.round(38 + budgetWeight + intensityWeight + safeguardWeight), 0, 99);
  const citizen = clamp(Math.round(28 + reachWeight + safeguardCount * 7 + (form.toggles.publicHearing ? 6 : 0)), 0, 99);
  const risk = clamp(riskBase, 8, 92);
  const fiscal = clamp(Math.round((form.targetReach - form.budget / 22) / 2), -38, 46);
  const confidence = clamp(Math.round((readiness + citizen + (100 - risk)) / 3), 0, 99);

  return { readiness, citizen, risk, fiscal, confidence };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toneClass(tone: PolicyType["tone"]) {
  return {
    civic: "bg-city-civic/10 text-city-civic",
    signal: "bg-city-signal/10 text-city-signal",
    solar: "bg-city-solar/[0.16] text-[#8A5A00]",
    park: "bg-city-park/10 text-city-park",
    coral: "bg-city-coral/10 text-city-coral",
    transit: "bg-city-transit/10 text-city-transit"
  }[tone];
}
