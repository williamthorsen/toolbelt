import { TimeUnit } from './TimeUnit.ts';

/**
 * A point in time, together with the format and time unit that control its string representation.
 */
export class Timestamp {
  private _format: TimestampFormatEnum;
  private readonly _millis: number;
  private _timeUnit: TimeUnit;

  constructor(dateTime?: TimestampInput, options: TimestampOptions = {}) {
    const { format = 'iso', timeUnit = TimeUnit.Millis } = options;
    if (dateTime instanceof Timestamp) {
      this._millis = dateTime._millis;
    } else if (dateTime) {
      this._millis = new Date(dateTime).getTime();
    } else {
      this._millis = Date.now();
    }
    this._format = format;
    this._timeUnit = timeUnit;
  }

  get format(): TimestampFormatEnum {
    return this._format;
  }

  get millis(): number {
    return this._millis;
  }

  get seconds(): number {
    return TimeUnit.convert(this._millis, TimeUnit.Millis, TimeUnit.Seconds);
  }

  get timeUnit(): TimeUnit {
    return this._timeUnit;
  }

  /**
   * Creates a timestamp from milliseconds since the Unix epoch.
   */
  static fromMillis(milliseconds: number): Timestamp {
    return new Timestamp(new Date(milliseconds));
  }

  /**
   * Creates a timestamp from seconds since the Unix epoch, with seconds as its time unit.
   */
  static fromSeconds(seconds: number): Timestamp {
    return new Timestamp(new Date(seconds * 1_000), { timeUnit: TimeUnit.Seconds });
  }

  /**
   * Creates a timestamp for the current time.
   */
  static now(options: TimestampOptions = {}): Timestamp {
    return new Timestamp(undefined, options);
  }

  /**
   * Returns a copy of this timestamp with the given options, which do not inherit this timestamp's own.
   */
  clone(options: TimestampOptions = {}): Timestamp {
    return new Timestamp(this._millis, options);
  }

  /**
   * Replaces the format and time unit given in the options, keeping the others, and returns this timestamp.
   */
  setOptions(options: TimestampOptions = {}): this {
    const { format = this._format, timeUnit = this._timeUnit } = options;
    this._format = format;
    this._timeUnit = timeUnit;
    return this;
  }

  /**
   * Returns the date & time in the format `YYYYMMDD[-HH[MM[SS[.sss]]]]` (depending on the time unit). UTC is implied.
   */
  toCompactString(options: Options = {}): string {
    const [datePart = '', timePart = ''] = this.toIsoString(options).split('T', 2);
    const formattedDatePart = datePart.replaceAll(/[-Z]/g, '');
    const formattedTimePart = timePart.replaceAll(/[:Z]/g, '');

    return timePart.length > 0 ? `${formattedDatePart}-${formattedTimePart}` : formattedDatePart;
  }

  /**
   * Returns the timestamp as a `Date`.
   */
  toDate(): Date {
    return new Date(this._millis);
  }

  /**
   * Returns the date & time in the format `YYYY-MM-DD[ HH:MM[:SS[.sss]]] UTC` (depending on the time unit).
   * It is the same format as `Date.toISOString()` but with a space instead of a `T` and ` UTC` instead of `Z`.
   * This date format is human-readable, sortable, and accepted by the Date constructor.
   * TODO: Decide how to handle hours.
   */
  toHumaneUtcString(options: Options = {}): string {
    const { timeUnit = this.timeUnit } = options;

    if (timeUnit === TimeUnit.Hours) {
      throw new Error('Method does not support TimeUnit.Hours time unit.');
    }

    const isoString = this.toIsoString({ timeUnit });
    return isoString.replace(/T/, ' ').replace(/Z$/, ' UTC');
  }

  /**
   * Returns a timestamp in the format `YYYY-MM-DD[THH[:MM[:SS[.sss]]]]Z` (depending on the time unit).
   */
  toIsoString(options: Options = {}): string {
    const { timeUnit = this.timeUnit } = options;
    const isoDateTime = this.toDate().toISOString();
    switch (timeUnit) {
      case TimeUnit.Seconds:
        return isoDateTime.replace(/\.\d{3}Z$/, 'Z');
      case TimeUnit.Minutes:
        return isoDateTime.replace(/:\d{2}\.\d{3}Z$/, 'Z');
      case TimeUnit.Hours:
        return isoDateTime.replace(/:\d{2}:\d{2}\.\d{3}Z$/, 'Z');
      case TimeUnit.Days: {
        const [datePart] = isoDateTime.split('T', 1);
        return `${datePart}Z`;
      }
      case TimeUnit.Millis:
        return isoDateTime;
      default:
        return isoDateTime;
    }
  }

  /**
   * Returns the locale-formatted date followed by the locale-formatted time.
   */
  toLocaleDateTimeString(locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions): string {
    const date = new Date(this._millis);
    return date.toLocaleDateString(locales, options) + ' ' + date.toLocaleTimeString(locales, options);
  }

  /**
   * Returns the date & time in the format `YYYYMMDD[HH[MM[SS[sss]]]]` (depending on the time unit). UTC is implied.
   */
  toNumericString(options: Options = {}): string {
    return this.toIsoString(options).replaceAll(/[-T:Z.]/g, '');
  }

  /**
   * Returns the timestamp in its own format and time unit, or in those given in the options.
   */
  toString(options: TimestampOptions = {}): string {
    const { format = this._format, timeUnit = this._timeUnit } = options;
    if (format === 'compact') return this.toCompactString({ timeUnit });
    if (format === 'humane') return this.toHumaneUtcString({ timeUnit });
    if (format === 'numeric') return this.toNumericString({ timeUnit });

    return this.toIsoString({ timeUnit });
  }
}

// region | Types
interface Options {
  timeUnit?: TimeUnit | undefined;
}

type TimestampFormatEnum = 'compact' | 'humane' | 'iso' | 'numeric';

export type TimestampInput = Date | number | string | Timestamp;

export interface TimestampOptions extends Options {
  format?: TimestampFormatEnum;
}
// endregion | Types
