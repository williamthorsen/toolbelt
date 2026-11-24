import type { SyncedRepository } from '../1-proposed/ports.ts';

/** How a switchable remote answers: by delegating, by rejecting at once, or never. */
export type RemoteMode = 'online' | 'offline' | 'hung';

/** A remote whose reachability a test sets. */
export interface SwitchableRemote extends SyncedRepository {
  mode: RemoteMode;
}

/**
 * Wraps a repository in a remote that delegates while `online`, rejects with an `Error` while `offline`, and while
 * `hung` returns a promise that never settles and ignores its signal.
 */
export function createSwitchableRemote(inner: SyncedRepository): SwitchableRemote {
  const remote: SwitchableRemote = {
    mode: 'online',
    load(options) {
      return answer(() => inner.load(options));
    },
    apply(versions, options) {
      return answer(() => inner.apply(versions, options));
    },
  };
  return remote;

  function answer<T>(delegate: () => Promise<T>): Promise<T> {
    switch (remote.mode) {
      case 'online':
        return delegate();
      case 'offline':
        return Promise.reject(new Error('The remote is offline'));
      case 'hung':
        return new Promise<T>(() => {});
    }
  }
}
