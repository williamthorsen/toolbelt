import path from 'node:path';

import {
  type SecretQuery,
  UnstorableSecretError,
  type WritableSecretStore,
} from '@williamthorsen/toolbelt.secrets/candidate';

import type { JiraRequest, TokenTransportOptions } from '../../3-candidate/createTokenTransport.ts';
import { createFakeRequest, type FakeCall, type FakeRoutes } from '../../test-utils/createFakeRequest.ts';
import type { TbJiraEffects } from '../subcommand-support.ts';

const CLOUD_ID = 'cloud-1';

/** Jira reads the workflow graph through a POST, since the request carries the issue types in a body. */
const READ_ONLY_POSTS = new Set(['/rest/api/3/workflows']);

export const HARNESS_VERSION = '9.9.9';

/**
 * Builds a runner harness over an in-memory keychain and a fake transport, collecting what a run writes to each
 * stream. The site's tenant-info read is answered here too, so no test reaches the network.
 */
export function createTbJiraHarness(options: HarnessOptions = {}): TbJiraHarness {
  const {
    cwd = '/repo',
    env = {},
    files = {},
    isTty = false,
    keystoreFault,
    prompted = '',
    readOnly = false,
    routes = {},
    stdin = '',
    stored = {},
    unstorable,
  } = options;

  const secrets = new Map(Object.entries(stored));
  const output: string[] = [];
  const errors: string[] = [];
  const fetchedUrls: string[] = [];
  const { calls, request } = createFakeRequest(routes);
  let transportOptions: TokenTransportOptions | undefined;

  function refuse(): never {
    throw new Error(keystoreFault);
  }

  let secretReads = 0;
  const store: WritableSecretStore = {
    deleteSecret: (query) => (keystoreFault === undefined ? secrets.delete(buildKey(query)) : refuse()),
    findSecret: (query) => {
      secretReads += 1;

      return keystoreFault === undefined ? secrets.get(buildKey(query)) : refuse();
    },
    hasSecret: (query) => (keystoreFault === undefined ? secrets.has(buildKey(query)) : refuse()),
    setSecret: (query, secret) => {
      if (unstorable !== undefined) throw new UnstorableSecretError(unstorable);

      void (keystoreFault === undefined ? secrets.set(buildKey(query), secret) : refuse());
    },
  };

  return {
    calls,
    effects: {
      createRequest: (options) => {
        transportOptions = options;

        return readOnly ? guardReads(request) : request;
      },
      createStore: () => store,
      cwd: () => cwd,
      env,
      fetch: (input) => {
        fetchedUrls.push(describeFetchTarget(input));

        return Promise.resolve(Response.json({ cloudId: CLOUD_ID }));
      },
      // The real ascent is covered by `findSpecPath`'s own test; here the path is composed, and whether it
      // holds a spec is `files`' business.
      findSpecPath: (fromDir) => path.join(fromDir, 'jira-project-spec.json'),
      isStdinTty: () => isTty,
      promptSecret: () => Promise.resolve(prompted),
      readStdin: () => stdin,
      readTextFile: (filePath) => {
        const text = files[filePath];
        if (text === undefined) throw new Error(`No fake file at '${filePath}'.`);

        return text;
      },
      resolveVersion: () => HARNESS_VERSION,
      write: (text) => void output.push(text),
      writeError: (text) => void errors.push(text),
    },
    fetchedUrls: () => fetchedUrls,
    readErrors: () => errors.join(''),
    readOutput: () => output.join(''),
    secretReads: () => secretReads,
    stored: () => Object.fromEntries(secrets),
    transportOptions: () => transportOptions,
  };
}

export interface HarnessOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  /** What `readTextFile` answers with, keyed by path. */
  files?: Record<string, string>;
  isTty?: boolean;
  /** Makes every keychain call throw, which is how an unreachable keychain is exercised. */
  keystoreFault?: string;
  prompted?: string;
  /** Fails the run on any call that writes, which is how a dry run is held to writing nothing. */
  readOnly?: boolean;
  routes?: FakeRoutes;
  stdin?: string;
  stored?: Record<string, string>;
  /** Makes `setSecret` raise `UnstorableSecretError`, which the keychain never sees. */
  unstorable?: string;
}

export interface TbJiraHarness {
  /** Every call the transport was asked to issue, in order. */
  calls: readonly FakeCall[];
  effects: TbJiraEffects;
  /** Every URL `fetch` was called with, which is the site the cloudId was read from. */
  fetchedUrls: () => string[];
  readErrors: () => string;
  readOutput: () => string;
  /** How many times the token itself was retrieved, which reporting a source must never do. */
  secretReads: () => number;
  stored: () => Record<string, string>;
  /** The credential the transport was built with, or `undefined` where the run never reached it. */
  transportOptions: () => TokenTransportOptions | undefined;
}

// region | Helpers

/** Names the in-memory item a query addresses. */
function buildKey(query: SecretQuery): string {
  return `${query.account ?? ''}|${query.service}`;
}

/** Names the URL a fetch was aimed at, whichever of the three forms the argument takes. */
function describeFetchTarget(input: Parameters<typeof globalThis.fetch>[0]): string {
  if (input instanceof URL) return input.href;
  if (typeof input === 'string') return input;

  return input.url;
}

/**
 * Wraps a transport so that a call which is not a known read fails the test rather than reaching the fake
 * routes. The allowance is a list rather than a denial of the writes this package makes today, so a write added
 * later fails a dry run's test by default.
 */
function guardReads(request: JiraRequest): JiraRequest {
  return (method, path, body) => {
    const isRead = method === 'GET' || (method === 'POST' && READ_ONLY_POSTS.has(path.split('?', 1)[0] ?? path));
    if (!isRead) throw new Error(`A read-only run issued ${method} ${path}.`);

    return request(method, path, body);
  };
}

// endregion | Helpers
