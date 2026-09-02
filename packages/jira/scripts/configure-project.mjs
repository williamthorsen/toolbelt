#!/usr/bin/env node

// configure-project.mjs — Reconciles a Jira project's statuses, workflow transitions, and board
// features against a declarative spec (the `acli jira project update` that does not exist).
//
// Jira Cloud exposes no CLI for statuses or workflows, so this drives the REST v3 and Agile APIs
// directly. Requests are issued as same-origin `fetch` calls inside a live Chrome tab over the
// DevTools Protocol, so the page's own session authenticates them and no credential is stored
// anywhere. That is also the constraint: a browser must be running with a debugging port open and
// a tab on the Jira site.
//
// The run is idempotent — a project already matching the spec reports no changes — and reads the
// configuration back from the server afterwards rather than trusting what it sent.
//
// Usage:
//   configure-project.mjs --project THOR [options]
//   configure-project.mjs --help
//
// Examples:
//   configure-project.mjs --project THOR --cdp-port 9173 --dry-run
//   configure-project.mjs --project THOR --cdp-port 9173
//   configure-project.mjs --project THOR --cdp-port 9173 --seed-backlog 'To Do'

import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const PROG = 'configure-project.mjs';
const DEFAULT_CDP_PORT = '9222';
const DEFAULT_SITE_HOST = 'atlassian';
const BACKLOG_BATCH_SIZE = 50;
const STATUS_CATEGORIES = ['TODO', 'IN_PROGRESS', 'DONE'];

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    showUsage(0);
  }
  if (!options.project) {
    die("--project is required (try '--help')");
  }

  const spec = await loadSpec(options.spec);
  const connection = await connectToTab(options.cdpPort, options.siteHost);

  try {
    const current = await readConfiguration(connection.request, options.project);
    const plan = buildPlan(spec, current);
    printPlan(plan, current, options);

    if (options.dryRun) {
      console.log('\ndry run: nothing was written');
      return;
    }

    await applyWorkflowChanges(connection.request, current, plan);
    await applyBoardFeatures(connection.request, current, plan);

    if (options.seedBacklog) {
      await seedBacklog(connection.request, current, options.project, options.seedBacklog);
    }

    await verifyConfiguration(connection.request, options.project, spec);
  } finally {
    connection.close();
  }
}

// region | Helpers

// Brings each board feature to the state the spec names.
async function applyBoardFeatures(request, current, plan) {
  for (const toggle of plan.featureToggles) {
    // The board-scoped endpoint carries the feature in the body; its project-scoped counterpart
    // carries it in the path instead, so the two take different shapes.
    const path = `/rest/agile/1.0/board/${current.board.id}/features`;
    const body = { boardId: current.board.id, feature: toggle.feature, enabling: toggle.to === 'ENABLED' };
    requireOk(await request('PUT', path, body), `set board feature ${toggle.feature} to ${toggle.to}`);
    console.log(`feature  ${toggle.feature} → ${toggle.to}`);
  }
}

// Writes the reconciled status and transition graph in one call, then confirms the updates landed.
async function applyWorkflowChanges(request, current, plan) {
  if (plan.statusUpdates.length === 0 && plan.creations.length === 0 && plan.transitionRenames.length === 0) {
    console.log('workflow unchanged');
    return;
  }

  const payload = buildWorkflowUpdatePayload(current, plan);
  assertGraphPreserved(current, payload);

  const result = await request('POST', '/rest/api/3/workflows/update', payload);
  requireOk(result, 'update workflow');
  console.log(`workflow updated: ${plan.statusUpdates.length} amended, ${plan.creations.length} created`);

  // The workflow API's own statuses array is the intended channel for a name or category change;
  // fall back to the status API where the read-back shows one did not take.
  const applied = await request('GET', `/rest/api/3/statuses/search?projectId=${current.project.id}&maxResults=100`);
  requireOk(applied, 'read statuses back');
  const stale = plan.statusUpdates.filter(
    (update) =>
      !applied.json.values.some(
        (status) => status.id === update.id && status.name === update.to && status.statusCategory === update.category,
      ),
  );
  if (stale.length > 0) {
    const statuses = stale.map((update) => ({
      id: update.id,
      name: update.to,
      statusCategory: update.category,
      // Mirrors buildWorkflowUpdatePayload: both channels write this field, so both apply its rule.
      description: update.to === update.from ? update.description : '',
    }));
    requireOk(await request('PUT', '/rest/api/3/statuses', { statuses }), 'amend statuses');
    console.log(`amended via status API: ${stale.map((update) => `${update.from} → ${update.to}`).join(', ')}`);
  }
}

// Fails when a payload would drop a status or transition the workflow currently has, or would
// leave any status with no transition into it.
function assertGraphPreserved(current, payload) {
  const [workflow] = payload.workflows;

  const references = new Set(workflow.statuses.map((status) => status.statusReference));
  for (const status of current.workflow.statuses) {
    if (!references.has(status.statusReference)) {
      die(`refusing to write: status ${status.statusReference} would be dropped from the workflow`);
    }
  }

  const transitionIds = new Set(workflow.transitions.map((transition) => transition.id));
  for (const transition of current.workflow.transitions) {
    if (!transitionIds.has(transition.id)) {
      die(`refusing to write: transition ${transition.id} (${transition.name}) would be dropped`);
    }
  }

  // The write replaces the graph wholesale, so a status left untargeted is reachable by no route
  // and offers the board no way into it. A status that already carried no transition is passed
  // over: it is not this write's doing, and refusing over it would block every reconciliation of
  // the project in which it sits.
  const targeted = new Set(workflow.transitions.map((transition) => transition.toStatusReference));
  const targetedBefore = new Set(current.workflow.transitions.map((transition) => transition.toStatusReference));
  const heldBefore = new Set(current.workflow.statuses.map((status) => status.statusReference));
  for (const reference of references) {
    if (targeted.has(reference) || (heldBefore.has(reference) && !targetedBefore.has(reference))) continue;
    die(`refusing to write: status ${reference} would be left with no transition into it`);
  }
}

// Resolves each spec status against the live configuration: unchanged, amended in place, or new.
function buildPlan(spec, current) {
  // Jira reports one status under two casings across endpoints ('Waiting for customer' from the
  // project resource, 'Waiting for Customer' from the workflow), so names match case-insensitively
  // and a casing difference is itself an amendment.
  const byName = new Map(current.statuses.map((status) => [normalizeName(status.name), status]));
  const claimed = new Set();
  const statusUpdates = [];
  const creations = [];

  for (const wanted of spec.statuses) {
    const match =
      byName.get(normalizeName(wanted.name)) ??
      (wanted.aliases ?? []).map((name) => byName.get(normalizeName(name))).find(Boolean);

    if (!match) {
      // A status the workflow does not yet hold is referenced by a UUID the API requires us to mint.
      creations.push({ name: wanted.name, category: wanted.category, statusReference: randomUUID() });
      continue;
    }

    claimed.add(normalizeName(match.name));
    // A matched name settles identity alone; the category is reconciled on its own, or a template
    // that categorized a status differently would be reported as already conformant.
    if (match.name !== wanted.name || match.statusCategory !== wanted.category) {
      statusUpdates.push({
        statusReference: match.statusReference,
        id: match.id,
        from: match.name,
        to: wanted.name,
        fromCategory: match.statusCategory,
        category: wanted.category,
        description: match.description ?? '',
      });
    }
  }

  // A transition's name is what the board's action menu shows, so it tracks its target status.
  const transitionRenames = [];
  for (const transition of current.workflow.transitions) {
    if (transition.type !== 'GLOBAL') continue;
    const target = current.statuses.find((status) => status.statusReference === transition.toStatusReference);
    if (!target) continue;
    const update = statusUpdates.find((entry) => entry.statusReference === target.statusReference);
    const wantedName = update ? update.to : target.name;
    if (transition.name !== wantedName) {
      transitionRenames.push({ id: transition.id, from: transition.name, to: wantedName });
    }
  }

  const featureToggles = Object.entries(spec.boardFeatures ?? {})
    .map(([feature, state]) => ({ feature, to: state, from: current.features.get(feature) }))
    .filter((toggle) => toggle.from !== toggle.to);

  const unmanaged = current.statuses.filter((status) => !claimed.has(normalizeName(status.name)));

  return { statusUpdates, creations, transitionRenames, featureToggles, unmanaged };
}

// Composes the bulk workflow-update body from the live graph, so nothing unstated is discarded.
function buildWorkflowUpdatePayload(current, plan) {
  const statuses = current.statuses.map((status) => {
    const update = plan.statusUpdates.find((entry) => entry.statusReference === status.statusReference);
    return {
      id: status.id,
      statusReference: status.statusReference,
      name: update ? update.to : status.name,
      statusCategory: update ? update.category : status.statusCategory,
      // A renamed status keeps a description written for the status it no longer is; a status whose
      // category alone changes is still itself, so its description stands.
      description: update && update.to !== update.from ? '' : (status.description ?? ''),
    };
  });

  for (const creation of plan.creations) {
    statuses.push({
      statusReference: creation.statusReference,
      name: creation.name,
      statusCategory: creation.category,
      description: '',
    });
  }

  const transitions = current.workflow.transitions.map((transition) => {
    const rename = plan.transitionRenames.find((entry) => entry.id === transition.id);
    return rename ? { ...transition, name: rename.to } : transition;
  });

  // The API requires an id on a new transition rather than assigning one, so continue the decade
  // spacing Jira uses for a team-managed project's global transitions.
  let nextId = Math.max(...current.workflow.transitions.map((transition) => Number(transition.id)));
  for (const creation of plan.creations) {
    nextId += 10;
    transitions.push({
      id: String(nextId),
      name: creation.name,
      type: 'GLOBAL',
      toStatusReference: creation.statusReference,
    });
  }

  return {
    statuses,
    workflows: [
      {
        id: current.workflow.id,
        version: current.workflow.version,
        statuses: [
          ...current.workflow.statuses.map((status) => ({
            statusReference: status.statusReference,
            layout: status.layout ?? {},
          })),
          ...plan.creations.map((creation) => ({ statusReference: creation.statusReference, layout: {} })),
        ],
        transitions,
        startPointLayout: current.workflow.startPointLayout ?? { x: 0, y: 0 },
      },
    ],
  };
}

// Opens a DevTools Protocol session against a tab on the Jira site and returns a request function
// that issues same-origin calls from inside that page.
async function connectToTab(port, siteHost) {
  let targets;
  try {
    targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  } catch {
    die(`no DevTools endpoint at 127.0.0.1:${port}; start Chrome with --remote-debugging-port=${port}`);
  }

  const target = targets.find((entry) => entry.type === 'page' && (entry.url ?? '').includes(siteHost));
  if (!target) {
    die(`no tab matching '${siteHost}' at 127.0.0.1:${port}; open the Jira site in that browser`);
  }
  // Requests inherit this page's session, and the match is a bare substring over whichever target
  // happens to come first, so the chosen origin is reported before anything is read or written.
  console.log(`tab      ${target.url}`);

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let nextId = 1;

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    message.error ? entry.reject(new Error(JSON.stringify(message.error))) : entry.resolve(message.result);
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve);
    socket.addEventListener('error', () => reject(new Error('DevTools socket failed to open')));
  });

  // Evaluates a fetch inside the page and returns its status and parsed body.
  async function request(method, path, body) {
    const init = {
      method,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    };
    const expression = `(async () => {
      const response = await fetch(${JSON.stringify(path)}, ${JSON.stringify(init)});
      const text = await response.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}
      return JSON.stringify({ status: response.status, json, text: json ? null : text.slice(0, 1000) });
    })()`;

    const id = nextId++;
    const result = await new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(
        JSON.stringify({
          id,
          method: 'Runtime.evaluate',
          params: { expression, awaitPromise: true, returnByValue: true },
        }),
      );
    });

    if (result.exceptionDetails) {
      die(`${method} ${path} threw in the page: ${result.exceptionDetails.exception?.description ?? 'unknown'}`);
    }
    return JSON.parse(result.result.value);
  }

  return { request, close: () => socket.close() };
}

// Reports the message and exits non-zero.
function die(message) {
  console.error(`${PROG}: ${message}`);
  process.exit(1);
}

// Reads and validates the spec file.
async function loadSpec(path) {
  let spec;
  try {
    spec = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    die(`cannot read spec '${path}': ${error.message}`);
  }

  if (!Array.isArray(spec.statuses) || spec.statuses.length === 0) {
    die(`spec '${path}' has no statuses`);
  }
  // Two entries claiming one live status would both resolve to it, and the write would carry only
  // the first, dropping the other without a word.
  const claims = new Map();
  for (const status of spec.statuses) {
    if (!status.name || !STATUS_CATEGORIES.includes(status.category)) {
      die(`spec '${path}': each status needs a name and a category of ${STATUS_CATEGORIES.join(', ')}`);
    }
    for (const name of [status.name, ...(status.aliases ?? [])]) {
      const claimant = claims.get(normalizeName(name));
      if (claimant) {
        die(`spec '${path}': '${name}' is claimed by both '${claimant}' and '${status.name}'`);
      }
      claims.set(normalizeName(name), status.name);
    }
  }
  return spec;
}

// Reduces a status name to its comparison form.
function normalizeName(name) {
  return name.trim().toLowerCase();
}

// Parses long options into a normalized shape.
function parseOptions(argv) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        project: { type: 'string' },
        spec: { type: 'string' },
        'cdp-port': { type: 'string' },
        'site-host': { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        'seed-backlog': { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: false,
    }));
  } catch (error) {
    console.error(`${PROG}: ${error.message}`);
    showUsage(1);
  }

  return {
    project: values.project,
    spec: values.spec ?? fileURLToPath(new URL('./project-spec.json', import.meta.url)),
    cdpPort: values['cdp-port'] ?? process.env.CDP_PORT ?? DEFAULT_CDP_PORT,
    siteHost: values['site-host'] ?? DEFAULT_SITE_HOST,
    dryRun: values['dry-run'],
    seedBacklog: values['seed-backlog'],
    help: values.help,
  };
}

// Prints the reconciliation plan as the run's unit of review.
function printPlan(plan, current, options) {
  console.log(`project  ${options.project} (id ${current.project.id}), board ${current.board.id}`);
  console.log(`workflow ${current.workflow.name}`);

  for (const update of plan.statusUpdates) {
    const parts = [];
    if (update.to !== update.from) parts.push(`'${update.from}' → '${update.to}'`);
    if (update.category !== update.fromCategory) parts.push(`${update.fromCategory} → ${update.category}`);
    console.log(`update   status ${update.id}: ${parts.join(', ')}`);
  }
  for (const creation of plan.creations) {
    console.log(`create   status '${creation.name}' (${creation.category})`);
  }
  for (const rename of plan.transitionRenames) {
    console.log(`rename   transition ${rename.id}: '${rename.from}' → '${rename.to}'`);
  }
  for (const creation of plan.creations) {
    console.log(`create   transition GLOBAL → '${creation.name}'`);
  }
  for (const toggle of plan.featureToggles) {
    console.log(`toggle   ${toggle.feature}: ${toggle.from ?? 'absent'} → ${toggle.to}`);
  }
  for (const status of plan.unmanaged) {
    console.log(`unmanaged status '${status.name}' is not in the spec and will not be touched`);
  }
  if (options.seedBacklog) {
    console.log(`seed     move every '${options.seedBacklog}' work item off the board`);
  }

  const changes =
    plan.statusUpdates.length + plan.creations.length + plan.transitionRenames.length + plan.featureToggles.length;
  if (changes === 0) {
    console.log('no changes: the project already matches the spec');
  }
}

// Reads the project, board, statuses, workflow graph, and board features.
async function readConfiguration(request, projectKey) {
  const project = await request('GET', `/rest/api/3/project/${projectKey}`);
  requireOk(project, `read project ${projectKey}`);

  const boards = await request('GET', `/rest/agile/1.0/board?projectKeyOrId=${projectKey}`);
  requireOk(boards, `read boards for ${projectKey}`);
  const board = boards.json.values[0];
  if (!board) {
    die(`project ${projectKey} has no board`);
  }

  const issueTypes = await request('GET', `/rest/api/3/project/${projectKey}/statuses`);
  requireOk(issueTypes, `read issue types for ${projectKey}`);

  const workflows = await request('POST', '/rest/api/3/workflows?expand=statuses', {
    projectAndIssueTypes: [{ projectId: project.json.id, issueTypeId: issueTypes.json[0].id }],
  });
  requireOk(workflows, `read workflow for ${projectKey}`);
  const workflow = workflows.json.workflows[0];
  if (!workflow) {
    die(`project ${projectKey} has no workflow`);
  }

  const features = await request('GET', `/rest/agile/1.0/board/${board.id}/features`);
  requireOk(features, `read features for board ${board.id}`);

  return {
    project: project.json,
    board,
    statuses: workflows.json.statuses,
    workflow,
    features: new Map(features.json.features.map((feature) => [feature.feature, feature.state])),
  };
}

// Reports the board's column coverage and order, neither of which the public API can set.
async function reportBoardColumns(request, current, spec) {
  const configuration = await request('GET', `/rest/agile/1.0/board/${current.board.id}/configuration`);
  requireOk(configuration, `read configuration for board ${current.board.id}`);

  const columns = configuration.json.columnConfig.columns;
  console.log(`columns  ${columns.map((column) => column.name).join(' | ')}`);

  // A status mapped to no column is absent from the board and the backlog alike, which leaves its
  // work items reachable only through search.
  const mapped = new Set(columns.flatMap((column) => column.statuses.map((status) => status.id)));
  const uncovered = spec.statuses
    .map((wanted) => current.statuses.find((status) => status.name === wanted.name))
    .filter((status) => status && !mapped.has(status.id));
  if (uncovered.length > 0) {
    console.log(`columns  ${uncovered.map((status) => `'${status.name}'`).join(', ')} map to no column,`);
    console.log('         so their work items appear only in search; add a column for each in the');
    console.log('         board settings, which the public API cannot do');
  }

  const wantedOrder = spec.statuses
    .map((status) => status.name)
    .filter((name) => columns.some((column) => column.name === name));
  const actualOrder = columns.map((column) => column.name).filter((name) => wantedOrder.includes(name));
  if (wantedOrder.join(' | ') !== actualOrder.join(' | ')) {
    console.log(`columns  order differs from the spec (${wantedOrder.join(' | ')}); reorder by dragging in the UI`);
  }
}

// Exits when a response is not a success, naming the operation and the server's reply.
function requireOk(result, label) {
  if (result.status < 200 || result.status >= 300) {
    die(`${label} failed (HTTP ${result.status}): ${result.text ?? JSON.stringify(result.json)}`);
  }
}

// Collects every work-item key a JQL query matches.
async function searchIssueKeys(request, jql) {
  const keys = [];
  let nextPageToken;

  do {
    const body = { jql, fields: ['key'], maxResults: 100, ...(nextPageToken ? { nextPageToken } : {}) };
    const result = await request('POST', '/rest/api/3/search/jql', body);
    requireOk(result, `search '${jql}'`);
    keys.push(...result.json.issues.map((issue) => issue.key));
    nextPageToken = result.json.nextPageToken;
  } while (nextPageToken);

  return keys;
}

// Moves every work item in a status off the board and into the backlog.
async function seedBacklog(request, current, projectKey, status) {
  const jql = `project = "${projectKey}" AND status = "${status}"`;
  const keys = await searchIssueKeys(request, jql);
  if (keys.length === 0) {
    console.log(`backlog  no '${status}' work items to move`);
    return;
  }

  for (let index = 0; index < keys.length; index += BACKLOG_BATCH_SIZE) {
    const batch = keys.slice(index, index + BACKLOG_BATCH_SIZE);
    const path = `/rest/agile/1.0/backlog/${current.board.id}/issue`;
    requireOk(await request('POST', path, { issues: batch }), `move ${batch.length} work items to the backlog`);
  }

  console.log(`backlog  moved ${keys.length} '${status}' work items off the board`);
  console.log(`         undo: POST /rest/agile/1.0/board/${current.board.id}/issue with the same keys`);
}

// Displays command-line syntax. Can exit with or without an error code.
function showUsage(code) {
  const stream = code === 0 ? console.log : console.error;
  stream(`Reconcile a Jira project's statuses, workflow transitions, and board features against a spec.

Usage:
  ${PROG} --project <key> [options]
  ${PROG} --help

Options:
  --project <key>        Jira project key to reconcile (required)
  --spec <path>          Spec file (default: project-spec.json beside this script)
  --cdp-port <port>      Chrome DevTools port (default: $CDP_PORT, else ${DEFAULT_CDP_PORT})
  --site-host <match>    Substring identifying the Jira tab (default: ${DEFAULT_SITE_HOST})
  --dry-run              Print the reconciliation plan; write nothing
  --seed-backlog <name>  Also move every work item in that status off the board
  -h, --help             Show this help

Authentication:
  Requests run as same-origin fetches inside a live Chrome tab over the DevTools Protocol, so the
  page's own session authenticates them. Start Chrome with --remote-debugging-port=<port> and open
  the Jira site in a tab. No token is read or stored.

Examples:
  ${PROG} --project THOR --cdp-port 9173 --dry-run
  ${PROG} --project THOR --cdp-port 9173 --seed-backlog 'To Do'`);
  process.exit(code);
}

// Reads the configuration back from the server and prints what it now holds.
async function verifyConfiguration(request, projectKey, spec) {
  const current = await readConfiguration(request, projectKey);

  console.log('\nconfiguration after the run:');
  for (const status of spec.statuses) {
    const live = current.statuses.find((entry) => entry.name === status.name);
    const transition = current.workflow.transitions.find(
      (entry) => entry.type === 'GLOBAL' && entry.toStatusReference === live?.statusReference,
    );
    const matches = live && live.statusCategory === status.category && transition?.name === status.name;
    const mark = matches ? 'ok  ' : 'MISS';
    console.log(
      `  ${mark} ${status.name} (${live?.statusCategory ?? 'absent'}),` +
        ` transition '${transition?.name ?? 'absent'}'`,
    );
  }
  for (const [feature, state] of Object.entries(spec.boardFeatures ?? {})) {
    const mark = current.features.get(feature) === state ? 'ok  ' : 'MISS';
    console.log(`  ${mark} ${feature} = ${current.features.get(feature) ?? 'absent'}`);
  }

  await reportBoardColumns(request, current, spec);
}

// endregion | Helpers

await main();
