import { formatStamp, isDeviceId, MAX_STAMP_COUNTER, MAX_STAMP_TIME, parseStamp } from '../internal/parseStamp.ts';

/** Options for a `HybridClock`. */
export interface HybridClockOptions {
  /** Identifies the device: printable ASCII characters other than the space, which no other device uses. */
  deviceId: string;
  /**
   * A stamp from an earlier clock's `last`, which this clock resumes after. A device persists it across restarts, so
   * that a wall clock set back while the device was off cannot make it issue a stamp twice.
   */
  last?: string | undefined;
  /** Returns the wall-clock time in milliseconds since the epoch. Defaults to `Date.now`. */
  now?: () => number;
}

/**
 * A hybrid logical clock, which issues change stamps that increase strictly on one device, even when its wall clock
 * goes backward, and that follow every stamp observed from another device.
 *
 * @category Sync
 * @experimental
 * @stage proposed
 */
export class HybridClock {
  readonly deviceId: string;
  #counter = 0;
  readonly #now: () => number;
  #time = -Infinity;

  constructor({ deviceId, last, now = Date.now }: HybridClockOptions) {
    if (!isDeviceId(deviceId)) {
      throw new TypeError(`A device id must be printable ASCII without spaces: ${JSON.stringify(deviceId)}`);
    }
    this.deviceId = deviceId;
    this.#now = now;
    if (last !== undefined) {
      this.observe(last);
    }
  }

  /** Returns the clock's state as a stamp for a later clock's `last` option, or `undefined` before the first stamp. */
  get last(): string | undefined {
    if (this.#time === -Infinity) return undefined;
    return formatStamp({ time: this.#time, counter: this.#counter, deviceId: this.deviceId });
  }

  /** Returns a stamp greater than every stamp that the clock has issued or observed. */
  issue(): string {
    const wallTime = Math.floor(this.#now());
    if (wallTime > this.#time) {
      this.#time = wallTime;
      this.#counter = 0;
    } else if (this.#counter < MAX_STAMP_COUNTER) {
      this.#counter += 1;
    } else {
      this.#time += 1;
      this.#counter = 0;
    }
    if (!(this.#time >= 0 && this.#time <= MAX_STAMP_TIME)) {
      throw new RangeError(`The clock's time is outside the range that a stamp expresses: ${this.#time}`);
    }
    return formatStamp({ time: this.#time, counter: this.#counter, deviceId: this.deviceId });
  }

  /** Advances the clock past a stamp from another device, throwing a `TypeError` when it is not a stamp. */
  observe(stamp: string): void {
    const { time, counter } = parseStamp(stamp);
    if (time < this.#time || (time === this.#time && counter <= this.#counter)) return;
    this.#time = time;
    this.#counter = counter;
  }
}
