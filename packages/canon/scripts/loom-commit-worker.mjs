import { parentPort, workerData } from 'node:worker_threads';
import { commit } from '../dist/loom/commit.js';

const { logPath, wid, count } = workerData;
let written = 0;
for (let i = 0; i < count; i++) {
  const r = commit(logPath, {
    writer: 'agent',
    kind: 'presence',
    node: `--node-${wid}-${i}`,
    attention: 0.5,
  });
  if (r.valid) written++;
}
parentPort.postMessage({ written });
