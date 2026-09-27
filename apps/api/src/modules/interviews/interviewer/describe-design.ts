import { type DesignGraph, runLints } from "@repo/design";

export const describeDesign = (
  graph: DesignGraph,
  revision: number,
): string => {
  if (graph.nodes.length === 0)
    return `Revision ${revision}: the canvas is empty.`;

  const regions = new Map(graph.groups.map((group) => [group.id, group.label]));
  const nodes = graph.nodes.map((node) => {
    const region = node.groupId
      ? ` in ${regions.get(node.groupId) ?? node.groupId}`
      : "";
    const notes = node.notes ? ` notes: ${JSON.stringify(node.notes)}` : "";

    return `- ${node.id} [${node.kind}] ${JSON.stringify(node.label)}${region} ${JSON.stringify(node.props)}${notes}`;
  });
  const edges = graph.edges.map((edge) => {
    const props = [
      edge.props.share !== 1 ? `share ${edge.props.share}` : null,
      edge.props.fanOut !== 1 ? `fan-out ${edge.props.fanOut}` : null,
    ].filter(Boolean);

    return `- ${edge.from} -> ${edge.to} (${edge.kind}${props.length > 0 ? `, ${props.join(", ")}` : ""})`;
  });
  const hits = runLints(graph).map(
    (hit) => `- ${hit.severity}: ${hit.message}`,
  );

  return [
    `Revision ${revision}.`,
    "Nodes:",
    ...nodes,
    "Edges:",
    ...(edges.length > 0 ? edges : ["- none"]),
    "Checks:",
    ...(hits.length > 0 ? hits : ["- none"]),
  ].join("\n");
};
