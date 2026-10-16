import { catalogue, type DesignGraph, TRACK_LABELS } from "@repo/design";
import type { InterviewDimension } from "@repo/scoring";

import { SKILL_LABELS } from "@/modules/skills/skills.constants";

import type { SharedInterview, SharedView } from "./share.entity";
import { SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH } from "./shares.constants";

export interface CardFonts {
  sans: string;
  mono: string;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

const COLORS = {
  background: "#0e1116",
  panel: "#131820",
  border: "#252c36",
  node: "#1a202a",
  nodeBorder: "#323b48",
  text: "#e8edf3",
  muted: "#8d97a5",
  ember: "#f26a2e",
  edge: "#f26a2e",
  group: "#3a4452",
  good: "#3fb97a",
  fair: "#e0a43a",
  poor: "#f0645a",
};

const NODE_WIDTH = 200;
const NODE_HEIGHT = 64;
const LAYER_GAP = 280;
const ROW_GAP = 104;

export const escapeXml = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export const truncate = (text: string, max: number): string =>
  text.length <= max
    ? text
    : `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`;

export const wrapText = (
  text: string,
  maxChars: number,
  maxLines: number,
): string[] => {
  const lines: string[] = [];
  let line = "";

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line === "" ? word : `${line} ${word}`;

    if (next.length <= maxChars) {
      line = next;
      continue;
    }

    if (line !== "") lines.push(line);
    line = word;

    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && line !== "") lines.push(line);

  if (lines.length === maxLines) {
    const used = lines.join(" ").length;

    if (used < text.trim().length) {
      lines[maxLines - 1] = truncate(`${lines[maxLines - 1]} …`, maxChars);
    }
  }

  return lines.map((each) => truncate(each, maxChars));
};

const layered = (graph: DesignGraph): Map<string, Point> => {
  const ids = graph.nodes.map((node) => node.id);
  const depth = new Map(ids.map((id) => [id, 0]));

  for (const _round of ids) {
    let changed = false;

    for (const edge of graph.edges) {
      const from = depth.get(edge.from);
      const to = depth.get(edge.to);

      if (from === undefined || to === undefined || edge.from === edge.to) {
        continue;
      }

      if (to < from + 1 && from + 1 < ids.length) {
        depth.set(edge.to, from + 1);
        changed = true;
      }
    }

    if (!changed) break;
  }

  const rows = new Map<number, number>();

  return new Map(
    ids.map((id) => {
      const layer = depth.get(id) ?? 0;
      const row = rows.get(layer) ?? 0;

      rows.set(layer, row + 1);

      return [id, { x: layer * LAYER_GAP, y: row * ROW_GAP }];
    }),
  );
};

export const positionsOf = (
  graph: DesignGraph,
  layout: Record<string, Point>,
): Map<string, Point> => {
  const placed = graph.nodes.filter((node) => layout[node.id] !== undefined);

  if (placed.length === graph.nodes.length && placed.length > 0) {
    return new Map(graph.nodes.map((node) => [node.id, layout[node.id]!]));
  }

  return layered(graph);
};

const diagram = (
  graph: DesignGraph,
  layout: Record<string, Point>,
  box: Box,
  fonts: CardFonts,
): string => {
  const inner = {
    x: box.x + 28,
    y: box.y + 28,
    width: box.width - 56,
    height: box.height - 56,
  };
  const frame = `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="22" fill="${COLORS.panel}" stroke="${COLORS.border}"/><rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="22" fill="url(#dots)"/>`;

  if (graph.nodes.length === 0) {
    return `${frame}<text x="${box.x + box.width / 2}" y="${box.y + box.height / 2}" text-anchor="middle" font-family="${fonts.sans}" font-size="24" fill="${COLORS.muted}">An empty canvas</text>`;
  }

  const positions = positionsOf(graph, layout);
  const xs = [...positions.values()].map((point) => point.x);
  const ys = [...positions.values()].map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const width = Math.max(...xs) - left + NODE_WIDTH;
  const height = Math.max(...ys) - top + NODE_HEIGHT;
  const scale = Math.min(inner.width / width, inner.height / height, 1.25);
  const offsetX = inner.x + (inner.width - width * scale) / 2;
  const offsetY = inner.y + (inner.height - height * scale) / 2;
  const at = (point: Point): Point => ({
    x: offsetX + (point.x - left) * scale,
    y: offsetY + (point.y - top) * scale,
  });
  const nodeWidth = NODE_WIDTH * scale;
  const nodeHeight = NODE_HEIGHT * scale;
  const center = (id: string): Point | null => {
    const point = positions.get(id);

    if (!point) return null;

    const corner = at(point);

    return { x: corner.x + nodeWidth / 2, y: corner.y + nodeHeight / 2 };
  };

  const groups = graph.groups
    .map((group) => {
      const members = graph.nodes
        .filter((node) => node.groupId === group.id)
        .map((node) => positions.get(node.id))
        .filter((point): point is Point => point !== undefined)
        .map(at);

      if (members.length === 0) return "";

      const pad = 14 * scale + 6;
      const x = Math.min(...members.map((point) => point.x)) - pad;
      const y = Math.min(...members.map((point) => point.y)) - pad;
      const right =
        Math.max(...members.map((point) => point.x)) + nodeWidth + pad;
      const bottom =
        Math.max(...members.map((point) => point.y)) + nodeHeight + pad;

      return `<rect x="${x}" y="${y}" width="${right - x}" height="${bottom - y}" rx="${12 * scale + 4}" fill="none" stroke="${COLORS.group}" stroke-dasharray="6 6"/>`;
    })
    .join("");

  const edges = graph.edges
    .map((edge) => {
      const from = center(edge.from);
      const to = center(edge.to);

      if (!from || !to) return "";

      return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${COLORS.edge}" stroke-opacity="0.55" stroke-width="${Math.max(1.5, 2.5 * scale)}"/>`;
    })
    .join("");

  const labelSize = Math.max(9, Math.min(20, 17 * scale));
  const kindSize = labelSize * 0.72;
  const fits = Math.max(4, Math.floor(nodeWidth / (labelSize * 0.56)) - 1);
  const nodes = graph.nodes
    .map((node) => {
      const point = positions.get(node.id);

      if (!point) return "";

      const { x, y } = at(point);
      const kind = catalogue[node.kind].label;
      const label = node.label.trim() === "" ? kind : node.label;
      const showKind = nodeHeight >= 34;
      const labelY = showKind
        ? y + nodeHeight / 2 - kindSize * 0.25
        : y + nodeHeight / 2 + labelSize * 0.35;

      return `<rect x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" rx="${10 * scale + 2}" fill="${COLORS.node}" stroke="${COLORS.nodeBorder}"/><text x="${x + 14 * scale + 4}" y="${labelY}" font-family="${fonts.sans}" font-weight="600" font-size="${labelSize}" fill="${COLORS.text}">${escapeXml(truncate(label, fits))}</text>${
        showKind
          ? `<text x="${x + 14 * scale + 4}" y="${labelY + kindSize * 1.35}" font-family="${fonts.mono}" font-size="${kindSize}" fill="${COLORS.muted}">${escapeXml(truncate(kind, Math.floor(fits * 1.2)))}</text>`
          : ""
      }`;
    })
    .join("");

  return `${frame}${groups}${edges}${nodes}`;
};

const brand = (fonts: CardFonts, label: string): string =>
  `<rect x="60" y="48" width="40" height="40" rx="11" fill="${COLORS.ember}"/><rect x="72" y="60" width="16" height="16" rx="3" transform="rotate(45 80 68)" fill="none" stroke="#fff" stroke-width="3"/><text x="114" y="77" font-family="${fonts.sans}" font-weight="600" font-size="26" fill="${COLORS.text}">Kaboom</text><text x="${SHARE_IMAGE_WIDTH - 60}" y="76" text-anchor="end" font-family="${fonts.mono}" font-size="20" fill="${COLORS.muted}">${escapeXml(label)}</text>`;

const lines = (
  text: string[],
  x: number,
  y: number,
  size: number,
  fonts: CardFonts,
): string =>
  text
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * size * 1.12}" font-family="${fonts.sans}" font-weight="600" font-size="${size}" letter-spacing="-1" fill="${COLORS.text}">${escapeXml(line)}</text>`,
    )
    .join("");

const tone = (share: number): string =>
  share >= 0.75 ? COLORS.good : share >= 0.5 ? COLORS.fair : COLORS.poor;

export const dimensionShares = (
  interview: SharedInterview,
): Array<{ dimension: InterviewDimension; share: number }> => {
  const totals = new Map<
    InterviewDimension,
    { earned: number; weight: number }
  >();

  for (const item of interview.items) {
    if (item.score === null) continue;

    const total = totals.get(item.dimension) ?? { earned: 0, weight: 0 };

    totals.set(item.dimension, {
      earned: total.earned + (item.weight * item.score) / 3,
      weight: total.weight + item.weight,
    });
  }

  return [...totals.entries()]
    .filter(([, total]) => total.weight > 0)
    .map(([dimension, total]) => ({
      dimension,
      share: total.earned / total.weight,
    }));
};

const byline = (view: SharedView): string =>
  view.owner ? `by ${view.owner.displayName}` : "";

const designCard = (view: SharedView, fonts: CardFonts): string => {
  const title = wrapText(view.title, 34, 2);
  const titleTop = 168;
  const metaY = titleTop + (title.length - 1) * 58 + 50;
  const parts = [
    byline(view),
    `${view.graph.nodes.length} component${view.graph.nodes.length === 1 ? "" : "s"}`,
  ].filter(Boolean);

  return `${brand(fonts, view.kind === "schema" ? "Data model" : "System design")}${lines(title, 60, titleTop, 52, fonts)}<text x="60" y="${metaY}" font-family="${fonts.sans}" font-size="24" fill="${COLORS.muted}">${escapeXml(parts.join(" · "))}</text>${diagram(view.graph, view.layout, { x: 60, y: metaY + 30, width: SHARE_IMAGE_WIDTH - 120, height: SHARE_IMAGE_HEIGHT - metaY - 70 }, fonts)}`;
};

const interviewCard = (
  view: SharedView,
  interview: SharedInterview,
  fonts: CardFonts,
): string => {
  const title = wrapText(interview.problem.title, 26, 2);
  const titleTop = 160;
  const metaY = titleTop + (title.length - 1) * 52 + 44;
  const meta = [
    `${interview.problem.difficulty[0]?.toUpperCase() ?? ""}${interview.problem.difficulty.slice(1)}`,
    TRACK_LABELS[interview.problem.track],
    byline(view),
  ].filter(Boolean);
  const score = interview.score ?? interview.designScore;
  const scoreRight = SHARE_IMAGE_WIDTH - 60;
  const dimensions = dimensionShares(interview).slice(0, 4);
  const barsY = metaY + 52;
  const column = (SHARE_IMAGE_WIDTH - 120 - 3 * 32) / 4;
  const bars = dimensions
    .map(({ dimension, share }, index) => {
      const x = 60 + index * (column + 32);

      return `<text x="${x}" y="${barsY}" font-family="${fonts.sans}" font-size="18" fill="${COLORS.muted}">${escapeXml(SKILL_LABELS[dimension])}</text><rect x="${x}" y="${barsY + 14}" width="${column}" height="8" rx="4" fill="${COLORS.border}"/><rect x="${x}" y="${barsY + 14}" width="${Math.max(8, column * share)}" height="8" rx="4" fill="${tone(share)}"/>`;
    })
    .join("");
  const diagramTop = dimensions.length > 0 ? barsY + 52 : metaY + 32;

  return `${brand(fonts, "Mock interview")}${lines(title, 60, titleTop, 48, fonts)}<text x="60" y="${metaY}" font-family="${fonts.sans}" font-size="22" fill="${COLORS.muted}">${escapeXml(meta.join(" · "))}</text><text x="${scoreRight - 68}" y="${titleTop + 28}" text-anchor="end" font-family="${fonts.sans}" font-weight="600" font-size="104" letter-spacing="-3" fill="${tone(score / 100)}">${score}</text><text x="${scoreRight}" y="${titleTop + 28}" text-anchor="end" font-family="${fonts.sans}" font-size="30" fill="${COLORS.muted}">/100</text>${bars}${diagram(view.graph, view.layout, { x: 60, y: diagramTop, width: SHARE_IMAGE_WIDTH - 120, height: SHARE_IMAGE_HEIGHT - diagramTop - 40 }, fonts)}`;
};

export const shareCardSvg = (view: SharedView, fonts: CardFonts): string => {
  const body = view.interview
    ? interviewCard(view, view.interview, fonts)
    : designCard(view, fonts);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_IMAGE_WIDTH}" height="${SHARE_IMAGE_HEIGHT}" viewBox="0 0 ${SHARE_IMAGE_WIDTH} ${SHARE_IMAGE_HEIGHT}"><defs><pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#ffffff" fill-opacity="0.06"/></pattern><radialGradient id="glow" cx="0.85" cy="0.1" r="0.7"><stop offset="0" stop-color="${COLORS.ember}" stop-opacity="0.22"/><stop offset="1" stop-color="${COLORS.ember}" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="${COLORS.background}"/><rect width="100%" height="100%" fill="url(#glow)"/>${body}</svg>`;
};
