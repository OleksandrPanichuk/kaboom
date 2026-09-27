import { useEffect, useRef } from "react";

import type { DesignWorkspaceContext } from "@/features/designs";
import { reportDesignSettled } from "@/features/interview/api";

const SETTLE_MS = 4_000;

interface InterviewBridgeProps {
  interviewId: string;
  active: boolean;
  context: DesignWorkspaceContext;
  contextRef: { current: DesignWorkspaceContext | null };
  ownRevisions: { current: Set<number> };
}

export function InterviewBridge({
  interviewId,
  active,
  context,
  contextRef,
  ownRevisions,
}: InterviewBridgeProps) {
  const settledAt = useRef(context.revision);

  useEffect(() => {
    contextRef.current = context;
  });

  useEffect(() => {
    if (!active || context.saving) return;
    if (context.revision === settledAt.current) return;
    if (ownRevisions.current.has(context.revision)) {
      settledAt.current = context.revision;

      return;
    }

    const timer = setTimeout(() => {
      settledAt.current = context.revision;
      void reportDesignSettled(interviewId).catch(() => undefined);
    }, SETTLE_MS);

    return () => clearTimeout(timer);
  }, [active, context.revision, context.saving, interviewId, ownRevisions]);

  return null;
}
