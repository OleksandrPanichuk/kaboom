import type {
  DesignGraph,
  EvaluationResult,
  Finding,
  LoadScenarioInput,
} from "@repo/design";
import { Save } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import type { ScenarioDraft } from "@/features/simulation/typedefs";

import { ClientSummary } from "./ClientSummary";
import { FaultList } from "./FaultList";
import { FindingsList } from "./FindingsList";
import { ScenarioForm } from "./ScenarioForm";
import { StepScrubber } from "./StepScrubber";

interface RunPanelProps {
  graph: DesignGraph;
  draft: ScenarioDraft;
  onDraftChange: (draft: ScenarioDraft) => void;
  scenario: LoadScenarioInput;
  result: EvaluationResult;
  step: number;
  onStepChange: (step: number) => void;
  onShowFinding: (finding: Finding) => void;
  save: {
    disabled: boolean;
    pending: boolean;
    note: string | null;
    onSave: () => void;
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b px-4 py-4 last:border-b-0">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function RunPanel({
  graph,
  draft,
  onDraftChange,
  scenario,
  result,
  step,
  onStepChange,
  onShowFinding,
  save,
}: RunPanelProps) {
  const stepSeconds = scenario.stepSeconds ?? 10;
  const slo = scenario.slo ?? { p99Ms: 300, availability: 0.999 };

  return (
    <div className="flex flex-col">
      <Section title="Results">
        <StepScrubber
          step={step}
          steps={result.steps.length}
          stepSeconds={stepSeconds}
          onChange={onStepChange}
        />
        <ClientSummary graph={graph} step={result.steps[step]} slo={slo} />
      </Section>
      <Section title="Findings">
        <FindingsList
          findings={result.findings}
          stepSeconds={stepSeconds}
          onShow={onShowFinding}
        />
      </Section>
      <Section title="Scenario">
        <ScenarioForm draft={draft} onChange={onDraftChange} />
      </Section>
      <Section title="Faults">
        <FaultList graph={graph} draft={draft} onChange={onDraftChange} />
      </Section>
      <div className="flex flex-col gap-2 px-4 py-4">
        <Button disabled={save.disabled || save.pending} onClick={save.onSave}>
          <Save aria-hidden="true" />
          {save.pending ? "Saving…" : "Save this run"}
        </Button>
        <p
          aria-live="polite"
          className="text-xs leading-5 text-muted-foreground"
        >
          {save.note ??
            "Runs update as you edit. Save one to keep its findings with this revision."}
        </p>
      </div>
    </div>
  );
}
