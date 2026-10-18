import type { PublishCheckModel } from "@repo/api-client";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { GitFork, ListChecks, Send, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, FieldLabel } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { errorMessage } from "@/features/auth";
import {
  type DraftPart,
  openDraftDesignMutation,
} from "@/features/authoring/api";
import {
  DRAFT_SECTIONS,
  type DraftSectionId,
} from "@/features/authoring/constants";
import {
  type SaveState,
  useActiveSection,
  useDraftEditor,
} from "@/features/authoring/hooks";
import {
  DraftDetailsForm,
  DraftGraphCard,
  DraftReviews,
  DraftStatusBadge,
  EditorNav,
  EditorSection,
  IssuesStrip,
  RubricWeights,
  type SchemaFormReveal,
  SchemaSection,
} from "@/features/authoring/ui/components";
import {
  asContent,
  draftRefs,
  sectionOf,
  sectionState,
  textOf,
  weightTotal,
} from "@/features/authoring/utils";

interface DraftEditorViewProps {
  draftId: string;
  onEditDesign: (designId: string) => void;
}

type Issue = PublishCheckModel["issues"][number];

const SAVE_LABELS: Record<SaveState, string> = {
  saved: "Saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  failed: "Not saved",
};

const REVIEW_LABELS = {
  pending: "Waiting for a moderator",
  approved: "Approved and published",
  rejected: "Sent back",
  withdrawn: "Withdrawn",
} as const;

const FOCUSABLE = [
  "input:not([type=radio]):not(:disabled), textarea, [role=combobox]",
  "input[type=radio]:checked",
  "button",
];

const scrollToSection = (id: string) => {
  const target = document.getElementById(`section-${id}`);

  target?.scrollIntoView({ behavior: "smooth", block: "start" });
  target?.focus({ preventScroll: true });
};

const scrollToPath = (path: ReadonlyArray<string | number>) => {
  for (let length = path.length; length > 0; length -= 1) {
    const key = path.slice(0, length).join(".");
    const target = document.querySelector<HTMLElement>(
      `[data-path="${CSS.escape(key)}"]`,
    );

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      FOCUSABLE.map((selector) => target.querySelector<HTMLElement>(selector))
        .find(Boolean)
        ?.focus({ preventScroll: true });

      return;
    }
  }

  scrollToSection(sectionOf(path));
};

const when = (at: string) =>
  new Date(at).toLocaleDateString("en", { day: "numeric", month: "short" });

export function DraftEditorView({
  draftId,
  onEditDesign,
}: DraftEditorViewProps) {
  const editor = useDraftEditor(draftId);
  const open = useMutation(openDraftDesignMutation);
  const { draft, content, setField } = editor;
  const reference = asContent(content.reference);
  const refs = useMemo(() => draftRefs(content), [content]);
  const [reveal, setReveal] = useState<SchemaFormReveal | null>(null);
  const [strict, setStrict] = useState(false);

  if (editor.checked !== null && !strict) setStrict(true);

  const latest = draft.reviews[0];
  const issuesIn = (section: DraftSectionId) =>
    editor.issues.filter((issue) => sectionOf(issue.path) === section).length;
  const label = (id: DraftSectionId) =>
    DRAFT_SECTIONS.find((section) => section.id === id)!.label;
  const navIds = useMemo(
    () => [
      ...DRAFT_SECTIONS.map((section) => section.id),
      ...(draft.reviews.length > 0 ? ["reviews"] : []),
    ],
    [draft.reviews.length],
  );
  const active = useActiveSection(navIds);
  const editDesign = (part: DraftPart) =>
    void (async () => {
      await editor.flush();

      const { designId } = await open.mutateAsync({ id: draftId, part });

      onEditDesign(designId);
    })();
  const jumpTo = (issue: Issue) =>
    setReveal({ path: issue.path, at: Date.now() });
  const schemaProps = (id: DraftSectionId) => ({
    id,
    title: label(id),
    refs,
    issues: editor.issues,
    issueCount: issuesIn(id),
    strict,
    reveal,
  });

  useEffect(() => {
    if (!reveal) return;

    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => scrollToPath(reveal.path)),
    );

    return () => cancelAnimationFrame(frame);
  }, [reveal]);

  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="z-10 border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:px-8 lg:sticky lg:top-12">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-sm text-muted-foreground">
              <Link
                to="/authoring"
                className="text-interactive-foreground hover:underline"
              >
                My problems
              </Link>
              <span aria-hidden="true"> / </span>
              {draft.problem ? "Update" : "Draft"}
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="min-w-0 truncate text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
                {textOf(content, "title") || "Untitled problem"}
              </h1>
              <DraftStatusBadge status={draft.status} />
              <span
                role="status"
                className={cn(
                  "text-sm text-muted-foreground",
                  editor.saveState === "failed" && "text-destructive",
                )}
              >
                {SAVE_LABELS[editor.saveState]}
                {editor.saveState === "failed" && editor.saveError
                  ? `: ${editor.saveError}`
                  : ""}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={editor.checking}
              onClick={editor.check}
            >
              <ListChecks aria-hidden="true" />
              {editor.checking ? "Checking…" : "Check"}
            </Button>
            {draft.status === "in-review" ? (
              <Button
                variant="outline"
                disabled={editor.withdrawing}
                onClick={editor.withdraw}
              >
                <Undo2 aria-hidden="true" />
                Withdraw
              </Button>
            ) : (
              <Button disabled={editor.submitting} onClick={editor.submit}>
                <Send aria-hidden="true" />
                {editor.submitting ? "Sending…" : "Send for review"}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-4 pt-5 sm:px-8">
        {draft.problem || draft.forkedFrom ? (
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {draft.problem ? (
              <span>
                Live at{" "}
                <Link
                  to="/problems/$slug"
                  params={{ slug: draft.problem.slug }}
                  className="font-mono text-interactive-foreground hover:underline"
                >
                  /problems/{draft.problem.slug}
                </Link>{" "}
                (version {draft.problem.currentVersion})
              </span>
            ) : null}
            {draft.forkedFrom ? (
              <span className="flex items-center gap-1.5">
                <GitFork aria-hidden="true" className="size-3.5" />
                Forked from{" "}
                <Link
                  to="/problems/$slug"
                  params={{ slug: draft.forkedFrom.slug }}
                  className="font-medium text-interactive-foreground hover:underline"
                >
                  {draft.forkedFrom.title}
                </Link>
              </span>
            ) : null}
          </p>
        ) : null}
        {editor.submitError ? (
          <p role="alert" className="text-sm text-destructive">
            {editor.submitError}
          </p>
        ) : null}
        {open.error ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(open.error)}
          </p>
        ) : null}
        {draft.status === "changes-requested" && latest?.feedback ? (
          <div className="rounded-xl border border-warning-border bg-warning-surface px-4 py-3 text-sm text-warning-foreground">
            <p className="font-medium">A moderator asked for changes</p>
            <p className="mt-1 whitespace-pre-line text-pretty">
              {latest.feedback}
            </p>
          </div>
        ) : null}
        {draft.status === "in-review" ? (
          <p className="rounded-xl border border-interactive-border bg-interactive-surface px-4 py-3 text-sm text-interactive-foreground text-pretty">
            A moderator is reviewing what you sent. You can keep editing; the
            review covers the version you sent, and you can send a newer one
            after withdrawing it.
          </p>
        ) : null}
        <IssuesStrip
          issues={editor.issues}
          checked={editor.checked}
          onJump={jumpTo}
        />
      </div>

      <div className="grid gap-6 px-4 py-5 sm:px-8 sm:pb-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <EditorNav
          items={DRAFT_SECTIONS.map((section) => ({
            id: section.id,
            label: section.label,
            state: sectionState(content, section.id),
            issues: issuesIn(section.id),
          }))}
          active={active}
          review={
            latest
              ? {
                  label: REVIEW_LABELS[latest.status],
                  detail: when(latest.decidedAt ?? latest.submittedAt),
                }
              : null
          }
          onJump={scrollToSection}
        />

        <div className="flex min-w-0 flex-col gap-6">
          <EditorSection
            id="details"
            title={label("details")}
            issues={issuesIn("details")}
          >
            <DraftDetailsForm
              content={content}
              locked={{ slug: draft.problem !== null }}
              onChange={setField}
            />
          </EditorSection>
          <EditorSection
            id="statement"
            title={label("statement")}
            description="What the solver reads: what to build, for whom, and at what scale."
            issues={issuesIn("statement")}
          >
            <Field data-path="statement">
              <FieldLabel htmlFor="draft-statement" className="sr-only">
                Statement
              </FieldLabel>
              <Textarea
                id="draft-statement"
                value={textOf(content, "statement")}
                rows={12}
                className="text-[15px] leading-relaxed"
                onChange={(event) => setField("statement", event.target.value)}
              />
            </Field>
          </EditorSection>
          <div className="grid gap-6 xl:grid-cols-2">
            <EditorSection
              id="baseline"
              title={label("baseline")}
              description="What the solver starts from. It should score 0."
              issues={issuesIn("baseline")}
            >
              <DraftGraphCard
                graph={content.baseline}
                editing={open.isPending && open.variables?.part === "baseline"}
                onEdit={() => editDesign("baseline")}
              />
            </EditorSection>
            <EditorSection
              id="reference"
              title={label("reference")}
              description="A design that solves it. It must score 100, and solvers who reveal solutions see it."
              issues={issuesIn("reference")}
            >
              <DraftGraphCard
                graph={reference.graph}
                editing={open.isPending && open.variables?.part === "reference"}
                onEdit={() => editDesign("reference")}
              />
              <Field data-path="reference.notes" className="gap-1.5">
                <FieldLabel
                  htmlFor="draft-reference-notes"
                  className="text-subtle-foreground"
                >
                  Notes
                </FieldLabel>
                <Textarea
                  id="draft-reference-notes"
                  value={textOf(reference, "notes")}
                  rows={3}
                  onChange={(event) =>
                    setField("reference", {
                      ...reference,
                      notes: event.target.value,
                    })
                  }
                />
              </Field>
            </EditorSection>
          </div>
          <SchemaSection
            {...schemaProps("drills")}
            description="Scenarios the design must survive. Rubric items score them."
            section="drills"
            noun="drills"
            value={content.drills}
            onChange={(value) => setField("drills", value)}
          />
          <SchemaSection
            {...schemaProps("rubric")}
            description="What a submission is scored on; the weights add up to 100."
            section="rubric"
            noun="rubric"
            value={content.rubric}
            extra={<RubricWeights total={weightTotal(content.rubric)} />}
            onChange={(value) => setField("rubric", value)}
          />
          <SchemaSection
            {...schemaProps("hints")}
            description="Up to three, each with a points cost; at most 50 in all."
            section="hints"
            noun="hints"
            value={content.hints}
            onChange={(value) => setField("hints", value)}
          />
          <SchemaSection
            {...schemaProps("interview")}
            description="Optional. Add one to practise this problem with the interviewer."
            section="interview"
            noun="an interview"
            value={content.interview}
            optional
            onChange={(value) => setField("interview", value)}
          />
          <SchemaSection
            {...schemaProps("chaos")}
            description="Optional. Tunes the faults generated from the design; the defaults suit most problems."
            section="chaos"
            noun="chaos settings"
            value={content.chaos}
            optional
            onChange={(value) => setField("chaos", value)}
          />
          {draft.reviews.length > 0 ? (
            <EditorSection id="reviews" title="Reviews">
              <DraftReviews reviews={draft.reviews} />
            </EditorSection>
          ) : null}
        </div>
      </div>
    </div>
  );
}
