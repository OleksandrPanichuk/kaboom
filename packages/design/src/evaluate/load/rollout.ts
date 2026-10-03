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
}

export const startRollout = (
  release: Release,
  t: number,
  replicas: number,
): Rollout => ({
  release,
  startedAt: t,
  target: replicas,
  old: replicas,
  created: [],
  phase: "rolling",
  canaryReadyAt: null,
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
      } else if (misbehaves(rolloutStepAt(rollout, props, t))) {
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

const misbehaves = (step: RolloutStep) =>
  step.failing > 0 || step.slow > 0 || step.restarts > 0;

export const rolloutStepAt = (
  rollout: Rollout,
  props: DeploymentProps,
  t: number,
): RolloutStep => {
  const ready = readyAt(rollout, props, t);
  const switched = props.strategy !== "blue-green" || rollout.old === 0;
  const serving = switched ? ready : 0;
  const pods = podsAt(rollout, props, t);
  const hung = switched ? pods.filter((pod) => pod.state === "hung").length : 0;

  return {
    phase: rollout.phase,
    old: rollout.old,
    ready,
    starting: rollout.created.length - ready,
    failing:
      rollout.release === "never-ready" || rollout.release === "broken"
        ? serving
        : hung,
    slow: rollout.release === "slow" ? serving : 0,
    restarts: pods.reduce((sum, pod) => sum + pod.restarts, 0),
  };
};

export const servingPods = (
  step: RolloutStep,
  props: DeploymentProps,
): number =>
  props.strategy === "blue-green" && step.old > 0
    ? step.old
    : step.old + step.ready;
