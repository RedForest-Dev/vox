import type { ChainSlot, Language } from '../../../shared/types';

interface ChainNode {
  left: string | null;
  right: string | null;
}

export interface ChainLeaveResult {
  /** nodes whose neighbours changed (their state must be re-sent) */
  affected: string[];
  /** set when two neighbours were joined directly (auto-stitch) */
  stitched?: { leftId: string; rightId: string };
}

/**
 * One open, elastic chain:  ... <-> A <-> YOU <-> B <-> ...
 *
 * Invariants:
 *  - the structure is always a single open line (never a ring, so no triangles);
 *  - new users are appended to the tail;
 *  - when a middle user leaves, his two neighbours are stitched together.
 */
export class ChainEngine {
  private nodes = new Map<string, ChainNode>();
  private tail: string | null = null;

  has(id: string): boolean {
    return this.nodes.has(id);
  }

  getState(id: string): { left: boolean; right: boolean } | null {
    const n = this.nodes.get(id);
    return n ? { left: n.left !== null, right: n.right !== null } : null;
  }

  join(id: string): string[] {
    if (this.nodes.has(id)) return [id];
    const node: ChainNode = { left: null, right: null };
    this.nodes.set(id, node);

    const affected = [id];
    if (this.tail !== null) {
      const tailNode = this.nodes.get(this.tail)!;
      tailNode.right = id;
      node.left = this.tail;
      affected.push(this.tail);
    }
    this.tail = id;
    return affected;
  }

  leave(id: string): ChainLeaveResult {
    const node = this.nodes.get(id);
    if (!node) return { affected: [] };
    this.nodes.delete(id);

    const leftNode = node.left ? this.nodes.get(node.left) : undefined;
    const rightNode = node.right ? this.nodes.get(node.right) : undefined;

    if (leftNode && rightNode && node.left && node.right) {
      leftNode.right = node.right;
      rightNode.left = node.left;
      return {
        affected: [node.left, node.right],
        stitched: { leftId: node.left, rightId: node.right },
      };
    }

    const affected: string[] = [];
    if (leftNode && node.left) {
      leftNode.right = null;
      affected.push(node.left);
      this.tail = node.left; // the left neighbour became the new tail
    }
    if (rightNode && node.right) {
      rightNode.left = null;
      affected.push(node.right);
    }
    if (!leftNode && !rightNode) this.tail = null;
    else if (!leftNode && rightNode) this.tail = this.tail === id ? node.right : this.tail;
    return { affected };
  }

  /**
   * Who receives a message sent through `slot`, and on which of THEIR slots.
   * Sending via my right window arrives in my right neighbour's left window.
   */
  route(id: string, slot: ChainSlot): { targetId: string; targetSlot: ChainSlot } | null {
    const node = this.nodes.get(id);
    if (!node) return null;
    const targetId = slot === 'left' ? node.left : node.right;
    if (!targetId) return null;
    return { targetId, targetSlot: slot === 'left' ? 'right' : 'left' };
  }
}

export const chainEngine = new ChainEngine();

/**
 * One independent chain per language: the Russian chain and the English chain
 * never touch each other. The registry remembers which chain each socket is in.
 */
export class ChainRegistry {
  private engines: Record<Language, ChainEngine> = { ru: new ChainEngine(), en: new ChainEngine() };
  private langBySocket = new Map<string, Language>();

  langOf(id: string): Language | undefined {
    return this.langBySocket.get(id);
  }

  join(id: string, lang: Language): string[] {
    this.langBySocket.set(id, lang);
    return this.engines[lang].join(id);
  }

  leave(id: string): ChainLeaveResult {
    const lang = this.langBySocket.get(id);
    if (!lang) return { affected: [] };
    this.langBySocket.delete(id);
    return this.engines[lang].leave(id);
  }

  getState(id: string): { left: boolean; right: boolean } | null {
    const lang = this.langBySocket.get(id);
    return lang ? this.engines[lang].getState(id) : null;
  }

  route(id: string, slot: ChainSlot): { targetId: string; targetSlot: ChainSlot } | null {
    const lang = this.langBySocket.get(id);
    return lang ? this.engines[lang].route(id, slot) : null;
  }
}

export const chainRegistry = new ChainRegistry();
