import {
  type CostEstimate,
  type DesignEdge,
  type DesignGraph,
  type DesignGroup,
  type DesignNode,
  type LintHit,
  opensConnections,
  referencesOf,
} from "@repo/design";

import type { DesignEditor } from "@/features/designs/hooks";
import {
  hostsFor,
  labelIn,
  nodesWithin,
  replicaLabels,
  sharedGroupId,
} from "@/features/designs/utils";
import {
  EdgeInspector,
  GroupInspector,
  InspectorEmpty,
  NodeInspector,
  type PlacementFields,
  relationColumns,
  SelectionInspector,
} from "@/features/properties";

interface WorkspaceInspectorProps {
  graph: DesignGraph;
  editor: DesignEditor;
  nodes: DesignNode[];
  edges: DesignEdge[];
  group: DesignGroup | null;
  hits: LintHit[];
  estimate: CostEstimate;
  placement: PlacementFields;
  onShowGroup: (groupId: string) => void;
  onGroupDissolved: () => void;
  onDelete: () => void;
}

export function WorkspaceInspector({
  graph,
  editor,
  nodes,
  edges,
  group,
  hits,
  estimate,
  placement,
  onShowGroup,
  onGroupDissolved,
  onDelete,
}: WorkspaceInspectorProps) {
  const labelOf = (id: string) => labelIn(graph, id);
  const [node] = nodes;
  const [edge] = edges;

  if (group && nodes.length + edges.length === 0) {
    return (
      <GroupInspector
        key={group.id}
        group={group}
        members={nodesWithin(graph, group.id).map((item) => labelOf(item.id))}
        hosts={hostsFor(graph, group)}
        onRename={(label) => editor.renameRegion(group.id, label)}
        onEngineChange={(engine) =>
          editor.apply([
            { op: "update-group", id: group.id, patch: { engine } },
          ])
        }
        onStoredOnChange={(storedOn) =>
          editor.apply([
            { op: "update-group", id: group.id, patch: { storedOn } },
          ])
        }
        onDissolve={() => {
          editor.dissolveRegion(group.id);
          onGroupDissolved();
        }}
      />
    );
  }

  if (node && nodes.length === 1 && edges.length === 0) {
    return (
      <NodeInspector
        key={node.id}
        node={node}
        hits={hits.filter((hit) => hit.nodeIds.includes(node.id))}
        replicas={replicaLabels(graph, node.id)}
        groups={graph.groups}
        onShowGroup={onShowGroup}
        cost={estimate.nodes.find((item) => item.nodeId === node.id) ?? null}
        placement={placement}
        onRegionChange={(target) => editor.placeInRegion([node.id], target)}
        onPatch={(patch) => editor.updateNode(node.id, patch)}
        edges={graph.edges}
        onApply={editor.apply}
        onDelete={onDelete}
      />
    );
  }

  if (edge && edges.length === 1 && nodes.length === 0) {
    const target = graph.nodes.find((item) => item.id === edge.to);

    return (
      <EdgeInspector
        key={edge.id}
        edge={edge}
        onPatch={(patch) => editor.updateEdge(edge.id, patch)}
        fromLabel={labelOf(edge.from)}
        toLabel={labelOf(edge.to)}
        columns={relationColumns(graph, edge.id)}
        referenceName={
          referencesOf(graph).find((item) => item.edge.id === edge.id)?.field
            .name ?? null
        }
        pooled={target ? opensConnections(edge.kind, target.kind) : false}
        onApply={editor.apply}
        onDelete={onDelete}
      />
    );
  }

  if (nodes.length + edges.length > 1) {
    return (
      <SelectionInspector
        nodes={nodes.length}
        edges={edges.length}
        groups={graph.groups}
        placement={placement}
        region={sharedGroupId(nodes)}
        onRegionChange={(target) =>
          editor.placeInRegion(
            nodes.map((item) => item.id),
            target,
          )
        }
        onDelete={onDelete}
      />
    );
  }

  return <InspectorEmpty />;
}
