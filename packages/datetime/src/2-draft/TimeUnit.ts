export class TimeUnit {
  static readonly Millis = new TimeUnit(1, { singular: 'millisecond', abbrev: 'ms' });
  static readonly Seconds = new TimeUnit(1000, { singular: 'second', abbrev: 's' });
  static readonly Minutes = new TimeUnit(60_000, { singular: 'minute', abbrev: 'm' });
  static readonly Hours = new TimeUnit(3_600_000, { singular: 'hour', abbrev: 'h' });
  static readonly Days = new TimeUnit(86_400_000, { singular: 'day', abbrev: 'd' });

  readonly abbrev: string;
  readonly plural: string;
  readonly singular: string;

  private constructor(
    public readonly inMillis: number,
    options: TimeUnitOptions,
  ) {
    // MAX_SAFE_INTEGER is 2^53, so by representing our duration in fromMilliseconds (the lowest
    // common unit) the highest duration we can represent is
    // 2^53 / 86*10^6 ~= 104 * 10^6 fromDays (about 100 million fromDays).
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
    const multiplier = fromUnit.inMillis / toUnit.inMillis;

    const value = amount * multiplier;

    if (!Number.isInteger(value) && throwOnFractional) {
      throw new Error(
        `${fromUnit.getLabeledCount(amount)} cannot be converted into a whole number of ${toUnit.plural}.`,
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
