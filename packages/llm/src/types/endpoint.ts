import type { Job, ProviderConnection, Usage } from './job.ts';

/**
 * An operator's endpoint, served by `createJobHandler`, on which `runJob` runs a job. The endpoint runs its own job on
 * its own provider connection; the page sends only the job's input.
 */
export interface EndpointConnection {
  /** The URL that the handler serves. */
  readonly url: string;
  /** Headers added to the request, such as a bot-check token. A header here overrides the runner's own. */
  readonly headers?: Readonly<Record<string, string>>;
}

/** The counter's decision on a job: allowed, or refused by the named limit. */
export type JobCount = { readonly allowed: true } | { readonly allowed: false; readonly limit: string };

/**
 * The reservation's decision on a job: refused by the named limit, or granted with the most output tokens that the
 * job may produce across its rounds, a positive integer, and the callback that settles the reservation. The handler
 * calls `settle` exactly once, whether the job completes, ends unfinished, fails, or is cancelled, and awaits it
 * before it ends the response; a throw from it goes to `onError`.
 */
export type JobReservation =
  | {
      readonly allowed: true;
      readonly maxOutputTokens: number;
      settle(settlement: JobSettlement): Promise<void> | void;
    }
  | { readonly allowed: false; readonly limit: string };

/**
 * How a reserved job ended, with the usage of every round that reported one. A `failed` or `cancelled` job's usage
 * excludes the round in flight, whose usage the provider never reported.
 */
export interface JobSettlement {
  readonly status: 'cancelled' | 'completed' | 'failed' | 'unfinished';
  readonly usage: Usage;
}

/** How `createJobHandler` builds, caps, and admits the jobs that it runs. */
export interface JobHandlerOptions<Result> {
  /** The operator's provider connection, read once when the handler is created. */
  readonly connection: ProviderConnection;
  /** The longest input that the handler accepts, counted in UTF-16 code units (`string.length`); a positive integer. */
  readonly maxInputLength: number;
  /** The most rounds that any job runs, applied when it is lower than the job's own `maxRounds`; a positive integer. */
  readonly maxRounds?: number;
  /**
   * Checks that a request comes from a person rather than a bot, before the job is counted. `false` refuses the job,
   * and a throw refuses it as unavailable. It receives the request after the handler has read its body.
   */
  readonly checkBot?: (request: Request) => Promise<boolean>;
  /**
   * Counts a job against the operator's limits before its first model request, and refuses it when a limit is
   * reached. A throw refuses the job as well. It receives the request after the handler has read its body.
   */
  readonly countJob?: (request: Request) => Promise<JobCount>;
  /**
   * Reserves a job's budget after `countJob` and before its first model request. It refuses the job, or grants a
   * reservation whose `maxOutputTokens` lowers the job's own cap and whose `settle` the handler calls once the job
   * ends. A throw refuses the job as unavailable. It receives the request after the handler has read its body.
   */
  readonly reserveJob?: (request: Request) => Promise<JobReservation>;
  /**
   * Receives each error that the handler withholds from the page: a failed job, a failed `createJob`, a failed bot
   * check, a failed counter, a failed reservation, or a failed settlement. The handler ignores a throw from it.
   */
  readonly onError?: (error: unknown) => void;
  /** Builds a fresh job for a request's input. */
  createJob(input: string): Job<Result>;
}

/** How `createTurnstileVerifier` reads and verifies a request's Cloudflare Turnstile token. */
export interface TurnstileVerifierOptions {
  /** The widget's secret key. */
  readonly secretKey: string;
  /** The request header that holds the token; defaults to `cf-turnstile-response`. */
  readonly header?: string;
  /** The hostname on which the token must have been issued. */
  readonly expectedHostname?: string;
  /** The widget action for which the token must have been issued. */
  readonly expectedAction?: string;
}

/** How `createUpstashJobCounter` identifies a caller and caps the jobs counted in Upstash Redis. */
export interface UpstashJobCounterOptions {
  /** The database's REST URL. */
  readonly url: string;
  /** The database's REST token. */
  readonly token: string;
  /**
   * Returns the caller's IP from a header that the host sets and a client cannot forge, such as `x-real-ip` on Vercel
   * or `cf-connecting-ip` on Cloudflare. An absent or empty IP refuses the job as unavailable.
   */
  readonly readCallerIp: (request: Request) => string | undefined;
  /** The most jobs that one IP runs in a UTC day; a positive integer. */
  readonly perIpLimit: number;
  /**
   * The most jobs that all callers together run in a UTC day; a positive integer. Without it, the counter limits jobs
   * per IP alone and does not keep a site-wide count, such as when `reserveJob` bounds the site's spend.
   */
  readonly globalDailyLimit?: number;
  /** The prefix of the counters' keys, which lets several apps share one database; defaults to `llm-jobs`. */
  readonly keyPrefix?: string;
}

/** Why an endpoint refused a job before running it. */
export type JobRefusalReason =
  | 'bot-check-failed'
  | 'bot-check-unavailable'
  | 'counter-unavailable'
  | 'input-too-long'
  | 'invalid-body'
  | 'limit-reached'
  | 'method-not-allowed';
