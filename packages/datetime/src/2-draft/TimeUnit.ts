import { round } from '@williamthorsen/toolbelt.numbers/candidate';

/**
 * A unit of time, measured in milliseconds. Because durations are stored in milliseconds, the largest
 * exact duration is `Number.MAX_SAFE_INTEGER` milliseconds, a little over 100 million days.
 *
 * @category DateTime
 * @experimental
 * @stage draft
 */
export class TimeUnit {
  static readonly Millis = new TimeUnit(1, { singular: 'millisecond', abbrev: 'ms' });
  static readonly Seconds = new TimeUnit(1_000, { singular: 'second', abbrev: 's' });
  static readonly Minutes = new TimeUnit(60_000, { singular: 'minute', abbrev: 'm' });
  static readonly Hours = new TimeUnit(3_600_000, { singular: 'hour', abbrev: 'h' });
  static readonly Days = new TimeUnit(86_400_000, { singular: 'day', abbrev: 'd' });

  /**
   * Every unit, ordered from the coarsest to the finest. Consumers that walk the units read this list,
   * so a unit declared above takes part in the walk only once it is listed here.
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
    this.abbrev = options.abbrev;
    this.singular = options.singular;
    this.plural = `${options.singular}s`;
  }

  /**
   * Converts an amount from one unit to another, optionally rounding the result or rejecting a fractional one.
   */
  static convert(
    amount: number,
    fromUnit: TimeUnit,
    toUnit: TimeUnit,
    options: TimeUnitConversionOptions = {},
  ): number {
    const { decimalPlaces, throwOnFractional } = options;

    // Keep the ratio a whole number by multiplying when converting to a finer unit and dividing
    // when converting to a coarser one. Multiplying by an inexact reciprocal loses precision:
    // 3_600_000 milliseconds would convert to 0.9999999999999999 hours, which floors to zero.
    const value =
      fromUnit.inMillis > toUnit.inMillis
        ? amount * (fromUnit.inMillis / toUnit.inMillis)
        : amount / (toUnit.inMillis / fromUnit.inMillis);

    if (throwOnFractional && !Number.isSafeInteger(value)) {
      throw new Error(
        `${fromUnit.formatLabeledCount(amount)} cannot be converted into an exact whole number of ${toUnit.plural}.`,
      );
    }

    if (decimalPlaces !== undefined) {
      return round(value, decimalPlaces);
    }

    return value;
  }

  /**
   * Formats an amount with this unit's label: abbreviated in the short format, inflected in the long one.
   */
  formatLabeledCount(amount: number, options: TimeUnitLabelOptions = {}): string {
    if (options.format === 'short') {
      return `${amount}${this.abbrev}`;
    }
    return `${amount} ${this.inflectLabel(amount)}`;
  }

  /**
   * Returns the singular label for an amount of exactly 1, else the plural label.
   */
  inflectLabel(amount: number): string {
    return amount === 1 ? this.singular : this.plural;
  }

  /**
   * Returns the plural label.
   */
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
