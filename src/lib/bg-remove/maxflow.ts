// Minimum s-t cut with the Boykov–Kolmogorov algorithm ("An Experimental
// Comparison of Min-Cut/Max-Flow Algorithms for Energy Minimization in
// Vision", 2004), written for typed arrays. Same structure as the compact
// version OpenCV uses for GrabCut: edges come in pairs (index ^ 1 is the
// reverse edge), index 0 and 1 are unused so 0 can mean "none".

const TERMINAL = -1;
const ORPHAN = -2;

export class Graph {
  private readonly n: number;
  private readonly first: Int32Array;
  /** Residual terminal capacity: > 0 towards the source, < 0 towards the sink. */
  private readonly weight: Float64Array;
  private readonly dst: Int32Array;
  private readonly next: Int32Array;
  private readonly cap: Float64Array;
  private edgeCount = 2;
  private flow = 0;
  /** 0: source side, 1: sink side (valid after maxFlow). */
  private readonly t: Uint8Array;

  constructor(nodes: number, edgePairs: number) {
    this.n = nodes;
    this.first = new Int32Array(nodes);
    this.weight = new Float64Array(nodes);
    this.t = new Uint8Array(nodes);
    const edges = 2 + edgePairs * 2;
    this.dst = new Int32Array(edges);
    this.next = new Int32Array(edges);
    this.cap = new Float64Array(edges);
  }

  /** Capacity of the source → i and i → sink links (added to what is already there). */
  addTermWeights(i: number, source: number, sink: number) {
    const dw = this.weight[i]!;
    if (dw > 0) source += dw;
    else sink -= dw;
    this.flow += Math.min(source, sink);
    this.weight[i] = source - sink;
  }

  /** An edge i → j with capacity w and its reverse j → i with capacity rev. */
  addEdges(i: number, j: number, w: number, rev: number) {
    const e = this.edgeCount;
    if (e + 1 >= this.dst.length) throw new Error("Too many edges");
    this.dst[e] = j;
    this.next[e] = this.first[i]!;
    this.cap[e] = w;
    this.first[i] = e;
    this.dst[e + 1] = i;
    this.next[e + 1] = this.first[j]!;
    this.cap[e + 1] = rev;
    this.first[j] = e + 1;
    this.edgeCount = e + 2;
  }

  maxFlow(): number {
    const { n, first, weight, dst, next, cap, t } = this;
    const NIL = n;
    // Active queue as a linked list; -1: not queued, NIL: end of the list.
    const qnext = new Int32Array(n + 1).fill(-1);
    const parent = new Int32Array(n);
    const ts = new Int32Array(n);
    const dist = new Int32Array(n);
    const orphans: number[] = [];
    let last = NIL;
    qnext[NIL] = NIL;
    for (let i = 0; i < n; i++) {
      if (weight[i] !== 0) {
        qnext[last] = i;
        last = i;
        dist[i] = 1;
        parent[i] = TERMINAL;
        t[i] = weight[i]! < 0 ? 1 : 0;
      }
    }
    let head = qnext[NIL]!;
    qnext[last] = NIL;
    qnext[NIL] = -1;
    let currTs = 0;

    for (;;) {
      let e0 = -1;
      // Grow both search trees until an edge joins them.
      while (head !== NIL) {
        const v = head;
        if (parent[v] !== 0) {
          const vt = t[v]!;
          for (let ei = first[v]!; ei !== 0; ei = next[ei]!) {
            if (cap[ei ^ vt] === 0) continue;
            const u = dst[ei]!;
            if (parent[u] === 0) {
              t[u] = vt;
              parent[u] = ei ^ 1;
              ts[u] = ts[v]!;
              dist[u] = dist[v]! + 1;
              if (qnext[u] === -1) {
                qnext[u] = NIL;
                qnext[last] = u;
                last = u;
              }
              continue;
            }
            if (t[u] !== vt) {
              e0 = ei ^ vt;
              break;
            }
            if (dist[u]! > dist[v]! + 1 && ts[u]! <= ts[v]!) {
              parent[u] = ei ^ 1;
              ts[u] = ts[v]!;
              dist[u] = dist[v]! + 1;
            }
          }
          if (e0 > 0) break;
        }
        head = qnext[v]!;
        qnext[v] = -1;
      }
      if (e0 <= 0) break;

      // Bottleneck of the path.
      let min = cap[e0]!;
      for (let k = 1; k >= 0; k--) {
        let v = dst[e0 ^ k]!;
        for (;;) {
          const ei = parent[v]!;
          if (ei < 0) break;
          min = Math.min(min, cap[ei ^ k]!);
          v = dst[ei]!;
        }
        min = Math.min(min, Math.abs(weight[v]!));
      }

      // Augment and collect orphans.
      cap[e0] -= min;
      cap[e0 ^ 1] += min;
      this.flow += min;
      for (let k = 1; k >= 0; k--) {
        let v = dst[e0 ^ k]!;
        for (;;) {
          const ei = parent[v]!;
          if (ei < 0) break;
          cap[ei ^ (k ^ 1)] += min;
          cap[ei ^ k] -= min;
          if (cap[ei ^ k] === 0) {
            orphans.push(v);
            parent[v] = ORPHAN;
          }
          v = dst[ei]!;
        }
        weight[v] += min * (1 - k * 2);
        if (weight[v] === 0) {
          orphans.push(v);
          parent[v] = ORPHAN;
        }
      }

      // Adopt the orphans.
      currTs++;
      while (orphans.length) {
        const v2 = orphans.pop()!;
        let minDist = Number.MAX_SAFE_INTEGER;
        let best = 0;
        const vt = t[v2]!;
        for (let ei = first[v2]!; ei !== 0; ei = next[ei]!) {
          if (cap[ei ^ (vt ^ 1)] === 0) continue;
          let u = dst[ei]!;
          if (t[u] !== vt || parent[u] === 0) continue;
          let d = 0;
          for (;;) {
            if (ts[u] === currTs) {
              d += dist[u]!;
              break;
            }
            const ej = parent[u]!;
            d++;
            if (ej < 0) {
              if (ej === ORPHAN) d = Number.MAX_SAFE_INTEGER - 1;
              else {
                ts[u] = currTs;
                dist[u] = 1;
              }
              break;
            }
            u = dst[ej]!;
          }
          if (++d < Number.MAX_SAFE_INTEGER) {
            if (d < minDist) {
              minDist = d;
              best = ei;
            }
            for (let w = dst[ei]!; ts[w] !== currTs; w = dst[parent[w]!]!) {
              ts[w] = currTs;
              dist[w] = --d;
            }
          }
        }
        parent[v2] = best;
        if (best > 0) {
          ts[v2] = currTs;
          dist[v2] = minDist;
          continue;
        }
        // No parent: v2 leaves its tree; its children become orphans.
        ts[v2] = 0;
        for (let ei = first[v2]!; ei !== 0; ei = next[ei]!) {
          const u = dst[ei]!;
          const ej = parent[u]!;
          if (t[u] !== vt || ej === 0) continue;
          if (cap[ei ^ (vt ^ 1)] !== 0 && qnext[u] === -1) {
            qnext[u] = NIL;
            if (head === NIL) head = u;
            else qnext[last] = u;
            last = u;
          }
          if (ej > 0 && dst[ej] === v2) {
            parent[u] = ORPHAN;
            orphans.push(u);
          }
        }
      }
    }
    // Nodes never reached stay on the source side (t = 0).
    for (let i = 0; i < n; i++) if (parent[i] === 0) t[i] = 0;
    return this.flow;
  }

  inSourceSegment(i: number) {
    return this.t[i] === 0;
  }
}
