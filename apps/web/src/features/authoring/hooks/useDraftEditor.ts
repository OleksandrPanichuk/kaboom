import type { ProblemDraftModel, PublishCheckModel } from "@repo/api-client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { errorMessage } from "@/features/auth";
import {
  checkDraftMutation,
  draftQuery,
  saveDraftMutation,
  submitDraftMutation,
  withdrawReviewMutation,
} from "@/features/authoring/api";
import { AUTOSAVE_DELAY_MS } from "@/features/authoring/constants";
import {
  asContent,
  type DraftContent,
  withGraphsFrom,
} from "@/features/authoring/utils";
import { ApiRequestError } from "@/lib/api";

type Issue = PublishCheckModel["issues"][number];

export type SaveState = "saved" | "unsaved" | "saving" | "failed";

export interface DraftEditor {
  draft: ProblemDraftModel;
  content: DraftContent;
  setField: (key: string, value: unknown) => void;
  saveState: SaveState;
  saveError: string | null;
  issues: Issue[];
  checked: PublishCheckModel | null;
  checking: boolean;
  check: () => void;
  submit: () => void;
  submitting: boolean;
  submitError: string | null;
  withdraw: () => void;
  withdrawing: boolean;
  flush: () => Promise<void>;
}

const issuesOf = (error: unknown): Issue[] | null => {
  if (!(error instanceof ApiRequestError)) return null;

  const issues = error.details?.issues;

  return Array.isArray(issues) ? (issues as Issue[]) : null;
};

export const useDraftEditor = (draftId: string): DraftEditor => {
  const { data: draft } = useSuspenseQuery(draftQuery(draftId));
  const [content, setContent] = useState<DraftContent>(() =>
    asContent(draft.content),
  );
  const contentRef = useRef(content);
  const dirtyRef = useRef(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [checked, setChecked] = useState<PublishCheckModel | null>(null);

  const save = useMutation(saveDraftMutation);
  const checking = useMutation(checkDraftMutation);
  const submitting = useMutation(submitDraftMutation);
  const withdrawing = useMutation(withdrawReviewMutation);

  const flush = useCallback(async () => {
    if (!dirtyRef.current) return;

    dirtyRef.current = false;
    setSaveState("saving");

    try {
      const saved = await save.mutateAsync({
        id: draftId,
        content: contentRef.current,
      });

      if (!dirtyRef.current) {
        const merged = withGraphsFrom(
          contentRef.current,
          asContent(saved.content),
        );

        contentRef.current = merged;
        setContent(merged);
      }

      setSaveState(dirtyRef.current ? "unsaved" : "saved");
    } catch {
      dirtyRef.current = true;
      setSaveState("failed");
    }
  }, [draftId, save]);

  useEffect(() => {
    if (saveState !== "unsaved") return;

    const timer = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [content, saveState, flush]);

  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) event.preventDefault();
    };

    window.addEventListener("beforeunload", leave);

    return () => window.removeEventListener("beforeunload", leave);
  }, []);

  const setField = useCallback((key: string, value: unknown) => {
    const next = { ...contentRef.current, [key]: value };

    contentRef.current = next;
    dirtyRef.current = true;
    setContent(next);
    setChecked(null);
    setSaveState("unsaved");
  }, []);

  const check = useCallback(() => {
    void (async () => {
      await flush();
      setChecked(await checking.mutateAsync(draftId));
    })();
  }, [checking, draftId, flush]);

  const submit = useCallback(() => {
    void (async () => {
      await flush();

      try {
        await submitting.mutateAsync(draftId);
        setChecked(null);
      } catch (error) {
        const issues = issuesOf(error);

        if (issues) setChecked({ ok: false, issues });
      }
    })();
  }, [draftId, flush, submitting]);

  return {
    draft,
    content,
    setField,
    saveState,
    saveError: save.error ? errorMessage(save.error) : null,
    issues: checked?.issues ?? draft.issues,
    checked,
    checking: checking.isPending,
    check,
    submit,
    submitting: submitting.isPending,
    submitError:
      submitting.error && !issuesOf(submitting.error)
        ? errorMessage(submitting.error)
        : null,
    withdraw: () => withdrawing.mutate(draftId),
    withdrawing: withdrawing.isPending,
    flush,
  };
};
