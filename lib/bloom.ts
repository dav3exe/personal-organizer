/**
 * Minimal Bloom filter: a compact set that answers "definitely not present" or
 * "probably present". It never gives false negatives, only (rare) false positives,
 * so a "probably present" answer must always be confirmed against the database.
 */
export class BloomFilter {
  private readonly bits: Uint8Array;
  private readonly size: number;
  private readonly hashCount: number;

  /**
   * @param expectedItems how many items the filter is sized for
   * @param falsePositiveRate target false-positive rate at that size (e.g. 0.01)
   */
  constructor(expectedItems: number, falsePositiveRate: number) {
    const n = Math.max(1, expectedItems);
    this.size = Math.ceil((-n * Math.log(falsePositiveRate)) / Math.LN2 ** 2);
    this.hashCount = Math.max(1, Math.round((this.size / n) * Math.LN2));
    this.bits = new Uint8Array(Math.ceil(this.size / 8));
  }

  add(value: string): void {
    for (const index of this.indexes(value)) {
      this.bits[index >> 3] |= 1 << (index & 7);
    }
  }

  /** false = definitely not added; true = probably added (confirm elsewhere). */
  mightContain(value: string): boolean {
    for (const index of this.indexes(value)) {
      if ((this.bits[index >> 3] & (1 << (index & 7))) === 0) return false;
    }
    return true;
  }

  // Double hashing (Kirsch–Mitzenmacher): index_i = h1 + i * h2.
  private *indexes(value: string): Generator<number> {
    const h1 = fnv1a(value, 0x811c9dc5);
    const h2 = fnv1a(value, 0x01000193) | 1; // odd, so strides cover the table
    for (let i = 0; i < this.hashCount; i++) {
      yield ((h1 + Math.imul(i, h2)) >>> 0) % this.size;
    }
  }
}

/** 32-bit FNV-1a hash with a configurable offset basis. */
function fnv1a(value: string, seed: number): number {
  let hash = seed >>> 0;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
