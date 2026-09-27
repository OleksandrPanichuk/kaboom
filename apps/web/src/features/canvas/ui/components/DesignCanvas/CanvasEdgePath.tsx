import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
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
  const { data, label, style, markerEnd, interactionWidth } = props;
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
        style={style}
        markerEnd={markerEnd}
        interactionWidth={interactionWidth}
      />
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
