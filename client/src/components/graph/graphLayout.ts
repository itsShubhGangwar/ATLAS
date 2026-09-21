import { Node, Edge, MarkerType } from "reactflow";
import { GraphModel, GraphNode, GraphEdge } from "../../types";

export type GraphLayoutType = "hierarchical" | "force" | "radial" | "circular" | "grid";

export interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalSpacing?: number;
  verticalSpacing?: number;
}

/**
 * 1. Hierarchical Layout: Multi-tier layered architectural topology
 */
function computeHierarchicalLayout(
  graph: GraphModel,
  options: LayoutOptions
): Node[] {
  const specNodes = graph.nodes.filter((n) => n.type === "spec");
  const tagNodes = graph.nodes.filter((n) => n.type === "tag");
  const endpointNodes = graph.nodes.filter((n) => n.type === "endpoint");
  const schemaNodes = graph.nodes.filter((n) => n.type === "schema");
  const securityNodes = graph.nodes.filter((n) => n.type === "security");

  const maxEndpointsPerRow = 10;
  const endpointCols = Math.min(endpointNodes.length, maxEndpointsPerRow);
  const schemaCols = 9;

  const maxCols = Math.max(1, tagNodes.length, endpointCols, schemaCols);
  const colWidth = options.horizontalSpacing || 280;
  const totalWidth = maxCols * colWidth;
  const centerX = totalWidth / 2;

  const nodes: Node[] = [];

  // Tier 0: Spec Nodes (y = 50)
  specNodes.forEach((node, index) => {
    const x = centerX - 120 + index * colWidth;
    nodes.push({
      id: node.id,
      type: "spec",
      position: { x, y: 50 },
      data: { ...node.data, label: node.label },
    });
  });

  // Tier 1: Tag Nodes (y = 220)
  const tagSpacing = colWidth * 0.75;
  const tagStartX = centerX - (tagNodes.length * tagSpacing) / 2 + tagSpacing / 4;
  tagNodes.forEach((node, index) => {
    nodes.push({
      id: node.id,
      type: "tag",
      position: { x: tagStartX + index * tagSpacing, y: 220 },
      data: { ...node.data, label: node.label },
    });
  });

  // Tier 2: Endpoint Nodes (y = 390, balanced rows)
  endpointNodes.forEach((node, index) => {
    const row = Math.floor(index / maxEndpointsPerRow);
    const col = index % maxEndpointsPerRow;
    const countInThisRow = Math.min(
      maxEndpointsPerRow,
      endpointNodes.length - row * maxEndpointsPerRow
    );
    const rowStartX = centerX - (countInThisRow * colWidth) / 2 + 20;
    nodes.push({
      id: node.id,
      type: "endpoint",
      position: { x: rowStartX + col * colWidth, y: 390 + row * 160 },
      data: { ...node.data, label: node.label },
    });
  });

  // Tier 3: Security Nodes
  const endpointRows = Math.ceil(endpointNodes.length / maxEndpointsPerRow) || 1;
  const tier3StartY = 390 + endpointRows * 160 + 30;

  securityNodes.forEach((node, index) => {
    const secStartX = centerX - (securityNodes.length * colWidth) / 2 + 20;
    nodes.push({
      id: node.id,
      type: "security",
      position: { x: secStartX + index * colWidth, y: tier3StartY },
      data: { ...node.data, label: node.label },
    });
  });

  // Tier 4: Schemas
  const schemaStartY = tier3StartY + (securityNodes.length > 0 ? 140 : 0);
  schemaNodes.forEach((node, index) => {
    const row = Math.floor(index / schemaCols);
    const col = index % schemaCols;
    const countInThisRow = Math.min(
      schemaCols,
      schemaNodes.length - row * schemaCols
    );
    const rowStartX = centerX - (countInThisRow * colWidth) / 2 + 20;
    nodes.push({
      id: node.id,
      type: "schema",
      position: { x: rowStartX + col * colWidth, y: schemaStartY + row * 150 },
      data: { ...node.data, label: node.label },
    });
  });

  return nodes;
}

/**
 * 2. Force-Directed Layout: Stable, deterministic spring-electrical simulation
 */
function computeForceDirectedLayout(
  graph: GraphModel,
  _options: LayoutOptions
): Node[] {
  const sortedNodes = [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id));
  const nodeCount = sortedNodes.length;
  if (nodeCount === 0) return [];

  const nodeMap = new Map<
    string,
    { x: number; y: number; vx: number; vy: number; node: GraphNode }
  >();

  // Deterministic initial placement based on type
  sortedNodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodeCount;
    let r = 500;
    if (node.type === "spec") r = 50;
    else if (node.type === "tag") r = 240;
    else if (node.type === "endpoint") r = 460;
    else if (node.type === "schema") r = 700;
    else if (node.type === "security") r = 280;

    nodeMap.set(node.id, {
      x: 1000 + r * Math.cos(angle),
      y: 800 + r * Math.sin(angle),
      vx: 0,
      vy: 0,
      node,
    });
  });

  const iterations = 120;
  const k = 220;
  const kSq = k * k;
  let temp = 90;
  const coolingFactor = 0.96;

  for (let iter = 0; iter < iterations; iter++) {
    const entries = Array.from(nodeMap.values());

    // Repulsion between all pairs
    for (let i = 0; i < entries.length; i++) {
      const p1 = entries[i];
      for (let j = i + 1; j < entries.length; j++) {
        const p2 = entries[j];
        let dx = p1.x - p2.x;
        let dy = p1.y - p2.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) {
          dx = 1;
          dist = 1;
        }
        const force = kSq / dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        p1.vx += fx;
        p1.vy += fy;
        p2.vx -= fx;
        p2.vy -= fy;
      }
    }

    // Attraction along edges
    for (const edge of graph.edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (source && target) {
        let dx = target.x - source.x;
        let dy = target.y - source.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) {
          dx = 1;
          dist = 1;
        }
        const force = (dist * dist) / k;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      }
    }

    // Centering force
    for (const p of entries) {
      const dx = 1000 - p.x;
      const dy = 800 - p.y;
      p.vx += dx * 0.05;
      p.vy += dy * 0.05;
    }

    // Update positions with temperature clamp
    for (const p of entries) {
      const dispLength = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (dispLength > 0) {
        const capped = Math.min(dispLength, temp);
        p.x += (p.vx / dispLength) * capped;
        p.y += (p.vy / dispLength) * capped;
      }
      p.vx = 0;
      p.vy = 0;
    }

    temp *= coolingFactor;
  }

  // Normalize into balanced viewport box
  const allEntries = Array.from(nodeMap.values());
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const e of allEntries) {
    if (e.x < minX) minX = e.x;
    if (e.x > maxX) maxX = e.x;
    if (e.y < minY) minY = e.y;
    if (e.y > maxY) maxY = e.y;
  }

  const rangeX = Math.max(maxX - minX, 1);
  const rangeY = Math.max(maxY - minY, 1);
  const targetW = 1800;
  const targetH = 1400;

  return allEntries.map((e) => {
    const normX = 100 + ((e.x - minX) / rangeX) * targetW;
    const normY = 100 + ((e.y - minY) / rangeY) * targetH;
    return {
      id: e.node.id,
      type: e.node.type,
      position: { x: Math.round(normX), y: Math.round(normY) },
      data: { ...e.node.data, label: e.node.label },
    };
  });
}

/**
 * 3. Radial Layout: Concentric orbital rings around central hub
 */
function computeRadialLayout(
  graph: GraphModel,
  _options: LayoutOptions
): Node[] {
  const specNodes = graph.nodes.filter((n) => n.type === "spec");
  const securityNodes = graph.nodes.filter((n) => n.type === "security");
  const tagNodes = graph.nodes.filter((n) => n.type === "tag");
  const endpointNodes = graph.nodes.filter((n) => n.type === "endpoint");
  const schemaNodes = graph.nodes.filter((n) => n.type === "schema");

  const centerX = 1200;
  const centerY = 1200;
  const nodes: Node[] = [];

  // Center hub: Spec
  specNodes.forEach((node, i) => {
    nodes.push({
      id: node.id,
      type: "spec",
      position: { x: centerX - 120, y: centerY - 50 + i * 140 },
      data: { ...node.data, label: node.label },
    });
  });

  // Ring 1: Tags & Security Schemes
  const innerRing = [...securityNodes, ...tagNodes];
  const r1 = 340;
  innerRing.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / innerRing.length - Math.PI / 2;
    nodes.push({
      id: node.id,
      type: node.type,
      position: {
        x: Math.round(centerX + r1 * Math.cos(angle) - 100),
        y: Math.round(centerY + r1 * Math.sin(angle) - 40),
      },
      data: { ...node.data, label: node.label },
    });
  });

  // Ring 2: Endpoints
  const r2 = 680;
  endpointNodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / endpointNodes.length - Math.PI / 2;
    nodes.push({
      id: node.id,
      type: "endpoint",
      position: {
        x: Math.round(centerX + r2 * Math.cos(angle) - 120),
        y: Math.round(centerY + r2 * Math.sin(angle) - 45),
      },
      data: { ...node.data, label: node.label },
    });
  });

  // Ring 3: Schemas
  const r3 = 1080;
  schemaNodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / schemaNodes.length - Math.PI / 2;
    nodes.push({
      id: node.id,
      type: "schema",
      position: {
        x: Math.round(centerX + r3 * Math.cos(angle) - 110),
        y: Math.round(centerY + r3 * Math.sin(angle) - 40),
      },
      data: { ...node.data, label: node.label },
    });
  });

  return nodes;
}

/**
 * 4. Circular Layout: Deterministic perimeter ring with internal chords
 */
function computeCircularLayout(
  graph: GraphModel,
  _options: LayoutOptions
): Node[] {
  const specNodes = graph.nodes.filter((n) => n.type === "spec");
  const securityNodes = graph.nodes
    .filter((n) => n.type === "security")
    .sort((a, b) => a.label.localeCompare(b.label));
  const tagNodes = graph.nodes
    .filter((n) => n.type === "tag")
    .sort((a, b) => a.label.localeCompare(b.label));
  const endpointNodes = graph.nodes
    .filter((n) => n.type === "endpoint")
    .sort((a, b) => a.label.localeCompare(b.label));
  const schemaNodes = graph.nodes
    .filter((n) => n.type === "schema")
    .sort((a, b) => a.label.localeCompare(b.label));

  const orderedNodes = [
    ...specNodes,
    ...securityNodes,
    ...tagNodes,
    ...endpointNodes,
    ...schemaNodes,
  ];

  const total = orderedNodes.length;
  if (total === 0) return [];

  const radius = Math.max(800, Math.round((total * 160) / (2 * Math.PI)));
  const centerX = radius + 150;
  const centerY = radius + 150;

  return orderedNodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / total - Math.PI / 2;
    return {
      id: node.id,
      type: node.type,
      position: {
        x: Math.round(centerX + radius * Math.cos(angle) - 110),
        y: Math.round(centerY + radius * Math.sin(angle) - 40),
      },
      data: { ...node.data, label: node.label },
    };
  });
}

/**
 * 5. Grid Layout: Structured rectangular matrix for dense catalog inspection
 */
function computeGridLayout(
  graph: GraphModel,
  _options: LayoutOptions
): Node[] {
  const specNodes = graph.nodes.filter((n) => n.type === "spec");
  const securityNodes = graph.nodes
    .filter((n) => n.type === "security")
    .sort((a, b) => a.label.localeCompare(b.label));
  const tagNodes = graph.nodes
    .filter((n) => n.type === "tag")
    .sort((a, b) => a.label.localeCompare(b.label));
  const endpointNodes = graph.nodes
    .filter((n) => n.type === "endpoint")
    .sort((a, b) => a.label.localeCompare(b.label));
  const schemaNodes = graph.nodes
    .filter((n) => n.type === "schema")
    .sort((a, b) => a.label.localeCompare(b.label));

  const orderedNodes = [
    ...specNodes,
    ...securityNodes,
    ...tagNodes,
    ...endpointNodes,
    ...schemaNodes,
  ];

  const total = orderedNodes.length;
  if (total === 0) return [];

  const cols = 8;
  const colWidth = 280;
  const rowHeight = 150;
  const startX = 60;
  const startY = 60;

  return orderedNodes.map((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      id: node.id,
      type: node.type,
      position: {
        x: startX + col * colWidth,
        y: startY + row * rowHeight,
      },
      data: { ...node.data, label: node.label },
    };
  });
}

/**
 * Computes deterministic layout positions across 5 graph algorithms
 */
export const computeGraphLayout = (
  graph: GraphModel,
  layoutType: GraphLayoutType = "hierarchical",
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } => {
  let nodes: Node[] = [];

  switch (layoutType) {
    case "force":
      nodes = computeForceDirectedLayout(graph, options);
      break;
    case "radial":
      nodes = computeRadialLayout(graph, options);
      break;
    case "circular":
      nodes = computeCircularLayout(graph, options);
      break;
    case "grid":
      nodes = computeGridLayout(graph, options);
      break;
    case "hierarchical":
    default:
      nodes = computeHierarchicalLayout(graph, options);
      break;
  }

  const isCurved =
    layoutType === "radial" ||
    layoutType === "circular" ||
    layoutType === "force";

  // Create formatted React Flow edges
  const edges: Edge[] = graph.edges.map((e: GraphEdge) => {
    const edgeStyle = getEdgeStyle(e.type);
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: e.type === "CONTAINS" || e.type === "REQUEST_BODY",
      type: isCurved ? "default" : "smoothstep",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: edgeStyle.color,
      },
      style: {
        stroke: edgeStyle.color,
        strokeWidth: 1.3,
        strokeDasharray: edgeStyle.dasharray,
      },
      labelStyle: {
        fill: "#77777D",
        fontSize: 10,
        fontFamily: "monospace",
      },
      labelBgStyle: {
        fill: "#111113",
        fillOpacity: 0.95,
      },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 3,
    };
  });

  return { nodes, edges };
};

export const getEdgeStyle = (type: GraphEdge["type"]) => {
  switch (type) {
    case "CONTAINS":
      return { color: "#6A6A74", dasharray: "4,4" };
    case "RETURNS":
      return { color: "#5A5A64", dasharray: undefined };
    case "REQUEST_BODY":
      return { color: "#6A6A74", dasharray: "3,3" };
    case "SECURED_BY":
      return { color: "#4E4E56", dasharray: "2,2" };
    case "USES_SCHEMA":
      return { color: "#5A5A64", dasharray: "4,2" };
    case "TAGGED_WITH":
      return { color: "#4E4E56", dasharray: "2,4" };
    default:
      return { color: "#5A5A64", dasharray: undefined };
  }
};
