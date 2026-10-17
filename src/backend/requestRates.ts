// Small time buckets bound memory even when many requests start each second.
export class RequestRates {
  private buckets = new Map<number, { starts: number; completions: number }>();

  record(kind: 'starts' | 'completions', now = performance.now()) {
    const slot = Math.floor(now / 10) * 10;
    const bucket = this.buckets.get(slot) ?? { starts: 0, completions: 0 };
    bucket[kind]++;
    this.buckets.set(slot, bucket);
  }

  read(now = performance.now()) {
    const counts = { starts: 0, completions: 0 };
    for (const [time, bucket] of this.buckets) {
      if (time <= now - 1000) this.buckets.delete(time);
      else {
        counts.starts += bucket.starts;
        counts.completions += bucket.completions;
      }
    }
    return counts;
  }

  clear() {
    this.buckets.clear();
  }
}
