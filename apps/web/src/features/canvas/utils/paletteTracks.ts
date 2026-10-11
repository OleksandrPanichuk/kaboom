import { catalogue, type DesignGraph, type Track } from "@repo/design";

export const paletteTracks = (
  track: Track | undefined,
  graph: DesignGraph,
): Track[] | undefined => {
  if (track === undefined) return undefined;

  const drawn = graph.nodes.map((node) => catalogue[node.kind].track);

  return [track, ...new Set(drawn.filter((item) => item !== track))];
};
