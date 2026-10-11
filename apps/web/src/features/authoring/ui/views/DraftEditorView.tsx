import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowLeft, GitFork, ListChecks, Send, Undo2 } from "lucide-react";
import { useMemo } from "react";

import { Button, buttonVariants } from "@/components/ui/Button";
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
import { type SaveState, useDraftEditor } from "@/features/authoring/hooks";
import {
  DraftDetailsForm,
  DraftGraphCard,
  DraftIssues,
  DraftReviews,
  DraftStatusBadge,
  EditorSection,
  SchemaSection,
} from "@/features/authoring/ui/components";
import {
  asContent,
  draftRefs,
  sectionOf,
  textOf,
} from "@/features/authoring/utils";

interface DraftEditorViewProps {
  draftId: string;
  onEditDesign: (designId: string) => void;
}

const SAVE_LABELS: Record<SaveState, string> = {
  saved: "Saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  failed: "Not saved",
};

const jump = (section: DraftSectionId) => {
  const target = document.getElementById(`section-${section}`);

  target?.scrollIntoView({ behavior: "smooth", block: "start" });
  target?.focus({ preventScroll: true });
};

export function DraftEditorView({
  draftId,
  onEditDesign,
}: DraftEditorViewProps) {
  const editor = useDraftEditor(draftId);
  const open = useMutation(openDraftDesignMutation);
  const { draft, content, setField } = editor;
  const reference = asContent(content.reference);
  const refs = useMemo(() => draftRefs(content), [content]);
  const latest = draft.reviews[0];
  const issuesIn = (section: DraftSectionId) =>
    editor.issues.filter((issue) => sectionOf(issue.path) === section).length;
  const editDesign = (part: DraftPart) =>
    void (async () => {
      await editor.flush();

      const { designId } = await open.mutateAsync({ id: draftId, part });

      onEditDesign(designId);
    })();
  const label = (id: DraftSectionId) =>
    DRAFT_SECTIONS.find((section) => section.id === id)!.label;

  return (
    <div className="flex-1 bg-zinc-50/70 px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Link
            to="/authoring"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 self-start text-muted-foreground",
            )}
          >
            <ArrowLeft aria-hidden="true" />
            My problems
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                  {textOf(content, "title") || "Untitled problem"}
                </h1>
                <DraftStatusBadge status={draft.status} />
              </div>
              <p
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
                {draft.problem ? (
                  <>
                    {" · live at "}
                    <Link
                      to="/problems/$slug"
                      params={{ slug: draft.problem.slug }}
                      className="font-medium text-indigo-700 hover:underline"
                    >
                      /problems/{draft.problem.slug}
                    </Link>
                    {` (version ${draft.problem.currentVersion})`}
                  </>
                ) : null}
              </p>
              {draft.forkedFrom ? (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <GitFork aria-hidden="true" className="size-3.5" />
                  Forked from{" "}
                  <Link
                    to="/problems/$slug"
                    params={{ slug: draft.forkedFrom.slug }}
                    className="font-medium text-indigo-700 hover:underline"
                  >
                    {draft.forkedFrom.title}
                  </Link>
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
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
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-medium">A moderator asked for changes</p>
              <p className="mt-1 whitespace-pre-line text-pretty">
                {latest.feedback}
              </p>
            </div>
          ) : null}
          {draft.status === "in-review" ? (
            <p className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950 text-pretty">
              A moderator is reviewing what you sent. You can keep editing; the
              review covers the version you sent, and you can send a newer one
              after withdrawing it.
            </p>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
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
              <Field>
                <FieldLabel htmlFor="draft-statement" className="sr-only">
                  Statement
                </FieldLabel>
                <Textarea
                  id="draft-statement"
                  value={textOf(content, "statement")}
                  rows={10}
                  onChange={(event) =>
                    setField("statement", event.target.value)
                  }
                />
              </Field>
            </EditorSection>
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
              description="A design that solves it. It must score 100, and it is shown to solvers who reveal solutions."
              issues={issuesIn("reference")}
            >
              <DraftGraphCard
                graph={reference.graph}
                editing={open.isPending && open.variables?.part === "reference"}
                onEdit={() => editDesign("reference")}
              />
              <Field>
                <FieldLabel htmlFor="draft-reference-notes">Notes</FieldLabel>
                <Textarea
                  id="draft-reference-notes"
                  value={textOf(reference, "notes")}
                  rows={4}
                  onChange={(event) =>
                    setField("reference", {
                      ...reference,
                      notes: event.target.value,
                    })
                  }
                />
              </Field>
            </EditorSection>
            <EditorSection
              id="drills"
              title={label("drills")}
              description="Scenarios the design must survive: load, schema, documents, key-value, pipeline or network."
              issues={issuesIn("drills")}
            >
              <SchemaSection
                section="drills"
                noun="drills"
                value={content.drills}
                refs={refs}
                issues={editor.issues}
                onChange={(value) => setField("drills", value)}
              />
            </EditorSection>
            <EditorSection
              id="rubric"
              title={label("rubric")}
              description="What a submission is scored on; the weights add up to 100."
              issues={issuesIn("rubric")}
            >
              <SchemaSection
                section="rubric"
                noun="rubric"
                value={content.rubric}
                refs={refs}
                issues={editor.issues}
                onChange={(value) => setField("rubric", value)}
              />
            </EditorSection>
            <EditorSection
              id="hints"
              title={label("hints")}
              description="Up to three, each with a points cost; at most 50 in all."
              issues={issuesIn("hints")}
            >
              <SchemaSection
                section="hints"
                noun="hints"
                value={content.hints}
                refs={refs}
                issues={editor.issues}
                onChange={(value) => setField("hints", value)}
              />
            </EditorSection>
            <EditorSection
              id="advanced"
              title={label("advanced")}
              description="Optional. A challenge needs neither; add an interview to practise it with the interviewer, and chaos settings to tune the generated faults."
              issues={issuesIn("advanced")}
            >
              <SchemaSection
                section="interview"
                noun="an interview"
                value={content.interview}
                refs={refs}
                issues={editor.issues}
                optional
                onChange={(value) => setField("interview", value)}
              />
              <SchemaSection
                section="chaos"
                noun="chaos settings"
                value={content.chaos}
                refs={refs}
                issues={editor.issues}
                optional
                onChange={(value) => setField("chaos", value)}
              />
            </EditorSection>
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
            <section className="flex flex-col gap-3 rounded-2xl border border-black/[0.07] bg-white p-4 sm:p-5">
              <h2 className="font-semibold">Issues</h2>
              <DraftIssues
                issues={editor.issues}
                checked={editor.checked}
                onJump={jump}
              />
            </section>
            <section className="flex flex-col gap-3 rounded-2xl border border-black/[0.07] bg-white p-4 sm:p-5">
              <h2 className="font-semibold">Reviews</h2>
              <DraftReviews reviews={draft.reviews} />
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
