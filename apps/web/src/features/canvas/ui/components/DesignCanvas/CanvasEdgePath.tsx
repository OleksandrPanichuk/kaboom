import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
  Position,
} from "@xyflow/react";
import { memo } from "react";

import type { CanvasEdge } from "@/features/canvas/typedefs";

const LANE_GAP = 56;

const arc = (
  { sourceX, sourceY, targetX, targetY }: EdgeProps<CanvasEdge>,
  offset: number,
): [string, number, number] => {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.hypot(dx, dy) || 1;
  const cx = (sourceX + targetX) / 2 + (-dy / length) * offset * 2;
  const cy = (sourceY + targetY) / 2 + (dx / length) * offset * 2;

  return [
    `M ${sourceX},${sourceY} Q ${cx},${cy} ${targetX},${targetY}`,
    0.25 * sourceX + 0.5 * cx + 0.25 * targetX,
    0.25 * sourceY + 0.5 * cy + 0.25 * targetY,
  ];
};

function CanvasEdgePathComponent(props: EdgeProps<CanvasEdge>) {
  const { data, label, style, markerStart, markerEnd, interactionWidth } =
    props;
  const lanes = data?.lanes ?? 1;
  const lane = data?.lane ?? 0;

  const [path, labelX, labelY] =
    lanes > 1
      ? arc(
          props,
          (lane - (lanes - 1) / 2) * LANE_GAP * (data?.reversed ? -1 : 1),
        )
      : getSmoothStepPath(props);

  return (
    <>
      <BaseEdge
        path={path}
        style={
          data?.weight === undefined
            ? style
            : {
                ...style,
                strokeWidth: 1.25 + data.weight * 4,
                opacity: data.weight === 0 ? 0.3 : 1,
              }
        }
        markerStart={markerStart}
        markerEnd={markerEnd}
        interactionWidth={interactionWidth}
      />
      {data?.cardinality ? (
        <EdgeLabelRenderer>
          <span
            className="pointer-events-none absolute font-mono text-[11px] font-semibold text-violet-700"
            style={{
              transform: `translate(${props.sourcePosition === Position.Left ? "-100%" : "0"}, -100%) translate(${props.sourceX + (props.sourcePosition === Position.Left ? -6 : 6)}px, ${props.sourceY - 2}px)`,
            }}
          >
            {data.cardinality === "one-to-one" ? "1" : "N"}
          </span>
          <span
            className="pointer-events-none absolute font-mono text-[11px] font-semibold text-violet-700"
            style={{
              transform: `translate(${props.targetPosition === Position.Left ? "-100%" : "0"}, -100%) translate(${props.targetX + (props.targetPosition === Position.Left ? -8 : 8)}px, ${props.targetY - 2}px)`,
            }}
          >
            1
          </span>
        </EdgeLabelRenderer>
      ) : null}
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-zinc-600"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const CanvasEdgePath = memo(CanvasEdgePathComponent);
