export class TimeUnit {
  static readonly Millis = new TimeUnit(1, { singular: 'millisecond', abbrev: 'ms' });
  static readonly Seconds = new TimeUnit(1_000, { singular: 'second', abbrev: 's' });
  static readonly Minutes = new TimeUnit(60_000, { singular: 'minute', abbrev: 'm' });
  static readonly Hours = new TimeUnit(3_600_000, { singular: 'hour', abbrev: 'h' });
  static readonly Days = new TimeUnit(86_400_000, { singular: 'day', abbrev: 'd' });

  /**
   * Every unit, ordered from the coarsest to the finest. A consumer that walks the units reads the
   * order from here rather than assembling its own, so a unit added above participates in it.
   */
  static readonly coarsestFirst: ReadonlyArray<TimeUnit> = [
    TimeUnit.Days,
    TimeUnit.Hours,
    TimeUnit.Minutes,
    TimeUnit.Seconds,
    TimeUnit.Millis,
  ];

  readonly abbrev: string;
  readonly plural: string;
  readonly singular: string;

  private constructor(
    public readonly inMillis: number,
    options: TimeUnitOptions,
  ) {
    // MAX_SAFE_INTEGER is 2^53, so by representing our duration in milliseconds (the lowest
    // common unit) the highest duration we can represent is
    // 2^53 / 86*10^6 ~= 104 * 10^6 days (about 100 million days).
    this.abbrev = options.abbrev;
    this.singular = options.singular;
    this.plural = `${options.singular}s`;
  }

  static convert(
    amount: number,
    fromUnit: TimeUnit,
    toUnit: TimeUnit,
    options: TimeUnitConversionOptions = {},
  ): number {
    const { decimalPlaces, throwOnFractional } = options;

    if (fromUnit.inMillis === toUnit.inMillis) {
      return amount;
    }
    // Keep the ratio a whole number by multiplying when converting to a finer unit and dividing
    // when converting to a coarser one. Multiplying by an inexact reciprocal loses precision:
    // 3_600_000 milliseconds would convert to 0.9999999999999999 hours, which floors to zero.
    const value =
      fromUnit.inMillis > toUnit.inMillis
        ? amount * (fromUnit.inMillis / toUnit.inMillis)
        : amount / (toUnit.inMillis / fromUnit.inMillis);

    if (throwOnFractional && !Number.isSafeInteger(value)) {
      throw new Error(
        `${fromUnit.getLabeledCount(amount)} cannot be converted into an exact whole number of ${toUnit.plural}.`,
      );
    }

    if (decimalPlaces !== undefined) {
      return Math.round(value * 10 ** decimalPlaces) / 10 ** decimalPlaces;
    }

    return value;
  }

  getLabeledCount(amount: number, options: TimeUnitLabelOptions = {}): string {
    if (options.format === 'short') {
      return `${amount}${this.abbrev}`;
    }
    return `${amount} ${this.getInflectedLabel(amount)}`;
  }

  getInflectedLabel(amount: number): string {
    return amount === 1 ? this.singular : this.plural;
  }

  toString(): string {
    return this.plural;
  }
}

/**
 * Options for how to convert time to a different unit.
 */
export interface TimeUnitConversionOptions {
  /** Throws when the conversion cannot be represented as an exact whole number. */
  readonly throwOnFractional?: boolean | undefined;
  readonly decimalPlaces?: Integer | undefined;
}

export interface TimeUnitLabelOptions {
  format?: 'short' | 'long' | undefined;
}

interface TimeUnitOptions {
  abbrev: string;
  singular: string;
}

type Integer = number;
