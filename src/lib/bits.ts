// Decay bits for the games, and the arithmetic that keeps them fair.
//
// The gateway's /v1/seeds answers up to 64 integers of 48 bits each, replayed from the append-only archive of bytes
// the instrument has already emitted. Real radioactive decay, previously served, so two readers can get the same
// ones; fine for a game, not for a secret (the keyed tier, /v1/bytes, is for that). This module treats the seeds as
// one stream of bits and draws from it:
//
//   bits(k)      the next k bits as an integer (k <= 32)
//   int(range)   an unbiased integer in [0, range): the fewest bits that cover the range, and any draw at or above
//                the range is THROWN AWAY and drawn again. Taking "seed mod range" instead would favour the low
//                values whenever the range does not divide the seed's; the count of rejected draws is kept and
//                shown, because that is the price of fairness and a reader should see it paid.
//   shuffle(a,k) the first k of a Fisher-Yates shuffle, each step an int() over what is left: every ordering of
//                k from n is equally likely, with no replacement.
//
// One shared source for the whole app (src/lib/bits.ts: `decay`), so bits left over from one game are used by the
// next rather than fetched again: the gateway is rate-limited per address and the bits are the same stream either way.
import { getSeeds, SEEDS_PER_REQUEST, type Seeds } from "./api";

export const SEED_BITS = 48;

export interface Receipt { bits: number; rejected: number; requests: number; note: string }

export class BitSource {
  private seeds: number[] = [];
  private pos = 0;        // the next unread bit, counted across the seeds
  private used = 0;       // bits handed out, ever
  private rejected = 0;   // draws thrown away by int(), ever
  private requests = 0;   // asks of /v1/seeds, ever
  private note = "";
  private pending: Promise<void> | null = null;
  private readonly fetchSeeds: (n: number) => Promise<Seeds>;

  constructor(fetchSeeds: (n: number) => Promise<Seeds> = (n) => getSeeds(n)) { this.fetchSeeds = fetchSeeds; }

  get remaining(): number { return this.seeds.length * SEED_BITS - this.pos; }

  private async need(k: number): Promise<void> {
    while (this.remaining < k) {
      if (!this.pending) {
        this.pending = this.fetchSeeds(SEEDS_PER_REQUEST).then((s) => {
          if (!Array.isArray(s.seeds) || s.seeds.length === 0) throw new Error("/v1/seeds answered with no seeds");
          // the seeds already read are dropped, so the array never grows past two requests' worth
          const keep = Math.floor(this.pos / SEED_BITS);
          this.seeds = this.seeds.slice(keep).concat(s.seeds);
          this.pos -= keep * SEED_BITS;
          this.requests++;
          this.note = s.note ?? "";
        }).finally(() => { this.pending = null; });
      }
      await this.pending;
    }
  }

  /** The next k bits (k <= 32) as an unsigned integer, most significant first. */
  async bits(k: number): Promise<number> {
    if (k < 0 || k > 32) throw new RangeError("bits(k): k must be 0..32");
    await this.need(k);
    let v = 0;
    for (let j = 0; j < k; j++) {
      const p = this.pos++;
      const seed = this.seeds[Math.floor(p / SEED_BITS)];
      const bit = Math.floor(seed / 2 ** (SEED_BITS - 1 - (p % SEED_BITS))) % 2;
      v = v * 2 + bit;
    }
    this.used += k;
    return v;
  }

  /** An unbiased integer in [0, range), by rejection. */
  async int(range: number): Promise<number> {
    if (!Number.isInteger(range) || range < 1 || range > 2 ** 32) throw new RangeError("int(range): range must be 1..2^32");
    if (range === 1) return 0;
    let k = 0;
    while (2 ** k < range) k++;
    for (;;) {
      const v = await this.bits(k);
      if (v < range) return v;
      this.rejected++;
    }
  }

  async ints(n: number, range: number): Promise<number[]> {
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push(await this.int(range));
    return out;
  }

  /** The first k items of a fair shuffle of `items` (all of them when k is omitted). Without replacement. */
  async shuffle<T>(items: readonly T[], k = items.length): Promise<T[]> {
    const a = items.slice();
    const n = Math.min(k, a.length);
    for (let i = 0; i < n; i++) {
      const j = i + (await this.int(a.length - i));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, n);
  }

  /** The tally so far; the difference between two of these is one game's receipt. */
  snapshot(): Receipt { return { bits: this.used, rejected: this.rejected, requests: this.requests, note: this.note }; }
}

/** What one action cost: the bits used, the draws rejected, the requests made, between two snapshots. */
export function receipt(before: Receipt, after: Receipt): Receipt {
  return { bits: after.bits - before.bits, rejected: after.rejected - before.rejected, requests: after.requests - before.requests, note: after.note };
}

/** The one source every game draws from. */
export const decay = new BitSource();

/** Run one game's draw against the shared source and return its result with its receipt. */
export async function draw<T>(fn: (src: BitSource) => Promise<T>): Promise<{ result: T; receipt: Receipt }> {
  const before = decay.snapshot();
  const result = await fn(decay);
  return { result, receipt: receipt(before, decay.snapshot()) };
}
