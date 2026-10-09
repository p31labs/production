import { parentPort, workerData } from 'node:worker_threads';
import { readEvents } from '../dist/loom/jsonl.js';
import { reduce, initialState } from '../dist/loom/events.js';
import { canonicalize } from '../dist/loom/gate.js';

const { logPath } = workerData;
const events = readEvents(logPath);
let state = initialState();
for (const e of events) state = reduce(state, e);
parentPort.postMessage(canonicalize(state));
