import type { NodeProps } from "../../catalogue";
import type { RolloutPhase, RolloutStep } from "../result";
import type { Release } from "../scenario";

type DeploymentProps = NodeProps<"k8s-deployment">;

export const SLOWDOWN = 2;

export const DEADLOCK_AFTER_SECONDS = 300;

export const LIVENESS_DETECT_SECONDS = 30;

export const RESTART_BACKOFF_SECONDS = 10;

export const CRASH_LOOP_RESTARTS = 3;

export const MAX_RESTART_BACKOFF_SECONDS = 300;

type PodState = "starting" | "ready" | "hung";

interface Pod {
  state: PodState;
  restarts: number;
}

const backoff = (restarts: number) =>
  Math.min(
    MAX_RESTART_BACKOFF_SECONDS,
    RESTART_BACKOFF_SECONDS * 2 ** (restarts - 1),
  );

const podAt = (release: Release, props: DeploymentProps, age: number): Pod => {
  if (release !== "deadlocks") {
    return {
      state: age >= props.startupSeconds ? "ready" : "starting",
      restarts: 0,
    };
  }

  let start = 0;
  let restarts = 0;

  for (;;) {
    const ready = start + props.startupSeconds;
    const hung = ready + DEADLOCK_AFTER_SECONDS;

    if (age < ready) return { state: "starting", restarts };
    if (age < hung) return { state: "ready", restarts };
    if (!props.livenessProbe) return { state: "hung", restarts };

    const restarted = hung + LIVENESS_DETECT_SECONDS;

    if (age < restarted) return { state: "hung", restarts };

    restarts += 1;
    start = restarted + backoff(restarts);

    if (age < start) return { state: "starting", restarts };
  }
};

const podsAt = (rollout: Rollout, props: DeploymentProps, t: number) =>
  rollout.created.map((created) => podAt(rollout.release, props, t - created));

export interface Rollout {
  release: Release;
  startedAt: number;
  target: number;
  old: number;
  created: number[];
  phase: RolloutPhase;
  canaryReadyAt: number | null;
  oldFailsFrom: number | null;
  oldFailureCause: "migration" | "rotation" | "release" | null;
}

export const startRollout = (
  release: Release,
  t: number,
  replicas: number,
  oldFailure: {
    from: number;
    cause: "migration" | "rotation" | "release";
  } | null = null,
): Rollout => ({
  release,
  startedAt: t,
  target: replicas,
  old: replicas,
  created: [],
  phase: "rolling",
  canaryReadyAt: null,
  oldFailsFrom: oldFailure?.from ?? null,
  oldFailureCause: oldFailure?.cause ?? null,
});

const passesReadiness = (release: Release, props: DeploymentProps) =>
  release !== "never-ready" || !props.readinessProbe;

const readyAt = (rollout: Rollout, props: DeploymentProps, t: number) =>
  passesReadiness(rollout.release, props)
    ? podsAt(rollout, props, t).filter((pod) => pod.state !== "starting").length
    : 0;

const create = (rollout: Rollout, t: number, count: number) => {
  for (let index = 0; index < count; index++) rollout.created.push(t);
};

const roll = (rollout: Rollout, props: DeploymentProps, t: number) => {
  const ready = readyAt(rollout, props, t);
  const surplus = rollout.old + ready - (rollout.target - props.maxUnavailable);

  rollout.old -= Math.min(rollout.old, Math.max(0, surplus));

  const room =
    rollout.target + props.maxSurge - (rollout.old + rollout.created.length);

  create(
    rollout,
    t,
    Math.max(0, Math.min(room, rollout.target - rollout.created.length)),
  );
};

export const advanceRollout = (
  rollout: Rollout,
  props: DeploymentProps,
  t: number,
): void => {
  if (rollout.phase !== "rolling") return;

  const first = t === rollout.startedAt;

  switch (props.strategy) {
    case "recreate":
      if (first) {
        rollout.old = 0;
        create(rollout, t, rollout.target);
      }
      break;
    case "blue-green":
      if (first) create(rollout, t, rollout.target);
      if (readyAt(rollout, props, t) === rollout.target) rollout.old = 0;
      break;
    case "canary": {
      if (first) create(rollout, t, 1);

      const ready = readyAt(rollout, props, t);

      if (rollout.canaryReadyAt === null) {
        if (ready > 0) rollout.canaryReadyAt = t;
      } else if (misbehaves(newPodsAt(rollout, props, t))) {
        rollout.created = [];
        rollout.phase = "rolled-back";

        return;
      } else if (t >= rollout.canaryReadyAt + props.canarySeconds) {
        roll(rollout, props, t);
      }
      break;
    }
    case "rolling":
      roll(rollout, props, t);
      break;
  }

  if (rollout.old === 0 && readyAt(rollout, props, t) === rollout.target) {
    rollout.phase = "complete";
  } else if (t - rollout.startedAt >= props.progressDeadlineSeconds) {
    rollout.phase = "stalled";
  }
};

interface NewPods {
  failing: number;
  slow: number;
  restarts: number;
}

const misbehaves = (pods: NewPods) =>
  pods.failing > 0 || pods.slow > 0 || pods.restarts > 0;

const switchedAt = (rollout: Rollout, props: DeploymentProps) =>
  props.strategy !== "blue-green" || rollout.old === 0;

const newPodsAt = (
  rollout: Rollout,
  props: DeploymentProps,
  t: number,
): NewPods => {
  const serving = switchedAt(rollout, props) ? readyAt(rollout, props, t) : 0;
  const pods = podsAt(rollout, props, t);
  const hung = switchedAt(rollout, props)
    ? pods.filter((pod) => pod.state === "hung").length
    : 0;

  return {
    failing:
      rollout.release === "never-ready" || rollout.release === "broken"
        ? serving
        : hung,
    slow: rollout.release === "slow" ? serving : 0,
    restarts: pods.reduce((sum, pod) => sum + pod.restarts, 0),
  };
};

export const rolloutStepAt = (
  rollout: Rollout,
  props: DeploymentProps,
  t: number,
): RolloutStep => {
  const ready = readyAt(rollout, props, t);
  const fresh = newPodsAt(rollout, props, t);
  const oldFailing =
    rollout.oldFailsFrom !== null && t >= rollout.oldFailsFrom
      ? rollout.old
      : 0;

  return {
    phase: rollout.phase,
    old: rollout.old,
    ready,
    starting: rollout.created.length - ready,
    failing: fresh.failing + oldFailing,
    slow: fresh.slow,
    restarts: fresh.restarts,
  };
};

export const inheritedFailure = (
  previous: Rollout,
  props: DeploymentProps,
  t: number,
): { from: number; cause: Rollout["oldFailureCause"] & string } | null => {
  if (
    previous.phase !== "complete" &&
    previous.oldFailsFrom !== null &&
    previous.oldFailureCause !== null
  ) {
    return { from: previous.oldFailsFrom, cause: previous.oldFailureCause };
  }

  if (
    previous.phase === "complete" &&
    newPodsAt(previous, props, t).failing > 0
  ) {
    return { from: t, cause: "release" };
  }

  return null;
};

export const servingPods = (
  step: RolloutStep,
  props: DeploymentProps,
): number =>
  props.strategy === "blue-green" && step.old > 0
    ? step.old
    : step.old + step.ready;
