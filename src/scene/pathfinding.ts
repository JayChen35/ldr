// Road graph + A* search. Nodes are road waypoints; edges connect nodes
// that lie along the same drawn cobblestone strip.

export interface Node {
  id: string;
  x: number;
  y: number;
}
export interface Graph {
  nodes: Map<string, Node>;
  edges: Map<string, Set<string>>;
  list: Node[]; // ordered list for nearest-node lookup
}

export function buildPathGraph(): Graph {
  const N = (id: string, x: number, y: number): Node => ({ id, x, y });

  // Nodes are placed roughly along the cobble strips drawn in island.ts.
  // Plaza is the central hub.
  const nodes: Node[] = [
    N('plaza', 240, 168),

    // Palace front patio (where the man emerges from after laundry)
    N('palace_door', 240, 152),

    // Bakery front
    N('bakery_road1', 215, 165),
    N('bakery_door', 188, 162),

    // Coffee shop front
    N('coffee_road1', 265, 165),
    N('coffee_door', 292, 162),

    // Market
    N('market_road1', 240, 178),
    N('market_door', 240, 184),

    // West/east perimeter strolls
    N('west_road1', 200, 170),
    N('west_perim', 145, 175),
    N('east_road1', 280, 170),
    N('east_perim', 335, 175),

    // South beach approach
    N('beach', 240, 196),
  ];
  const map = new Map<string, Node>();
  for (const n of nodes) map.set(n.id, n);

  const edges = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!edges.has(a)) edges.set(a, new Set());
    if (!edges.has(b)) edges.set(b, new Set());
    edges.get(a)!.add(b);
    edges.get(b)!.add(a);
  };

  link('plaza', 'palace_door');
  link('plaza', 'bakery_road1');
  link('bakery_road1', 'bakery_door');
  link('plaza', 'coffee_road1');
  link('coffee_road1', 'coffee_door');
  link('plaza', 'market_road1');
  link('market_road1', 'market_door');
  link('market_door', 'beach');
  link('plaza', 'west_road1');
  link('west_road1', 'west_perim');
  link('plaza', 'east_road1');
  link('east_road1', 'east_perim');
  link('west_perim', 'beach');
  link('east_perim', 'beach');
  // Perimeter loop along south
  link('west_perim', 'market_door');
  link('east_perim', 'market_door');
  // Bakery & coffee both connect via plaza only (no shortcut needed)

  return { nodes: map, edges, list: nodes };
}

function dist(a: Node, b: Node) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// A* search. With ~14 nodes this is overkill but keeps things tidy.
export function aStar(graph: Graph, fromId: string, toId: string): Node[] | null {
  if (fromId === toId) return [graph.nodes.get(fromId)!];
  const start = graph.nodes.get(fromId);
  const goal = graph.nodes.get(toId);
  if (!start || !goal) return null;

  const open = new Set<string>([fromId]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  gScore.set(fromId, 0);
  fScore.set(fromId, dist(start, goal));

  while (open.size > 0) {
    // node in open with lowest f
    let currentId: string | null = null;
    let bestF = Infinity;
    for (const id of open) {
      const f = fScore.get(id) ?? Infinity;
      if (f < bestF) {
        bestF = f;
        currentId = id;
      }
    }
    if (!currentId) return null;
    if (currentId === toId) {
      const path: Node[] = [];
      let cur: string | undefined = currentId;
      while (cur) {
        path.unshift(graph.nodes.get(cur)!);
        cur = cameFrom.get(cur);
      }
      return path;
    }
    open.delete(currentId);
    const current = graph.nodes.get(currentId)!;
    const neighbors = graph.edges.get(currentId);
    if (!neighbors) continue;
    for (const nbId of neighbors) {
      const nb = graph.nodes.get(nbId)!;
      const tentative = (gScore.get(currentId) ?? Infinity) + dist(current, nb);
      if (tentative < (gScore.get(nbId) ?? Infinity)) {
        cameFrom.set(nbId, currentId);
        gScore.set(nbId, tentative);
        fScore.set(nbId, tentative + dist(nb, goal));
        open.add(nbId);
      }
    }
  }
  return null;
}

// Find graph node nearest to a given screen-space point. Used to project
// the cursor onto the road network.
export function nearestNode(graph: Graph, x: number, y: number): Node {
  let best = graph.list[0];
  let bestD = Infinity;
  for (const n of graph.list) {
    const d = (n.x - x) * (n.x - x) + (n.y - y) * (n.y - y);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}
