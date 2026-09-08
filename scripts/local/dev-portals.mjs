import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const args = process.argv.slice(2);
const { values } = parseArgs({
  args,
  options: { port: { type: 'string', short: 'p' } },
  strict: false,
  allowPositionals: true,
});
const donorPort = Number(values.port ?? process.env.CARE_DONOR_PORT ?? 3001);
const staffPort = Number(process.env.CARE_STAFF_PORT ?? 3002);
if (
  ![donorPort, staffPort].every(
    (port) => Number.isInteger(port) && port > 0 && port <= 65535,
  ) ||
  donorPort === staffPort
) {
  console.error('Choose distinct donor and staff ports between 1 and 65535.');
  process.exit(1);
}

const env = {
  ...process.env,
  CARE_DONOR_PORT: String(donorPort),
  CARE_STAFF_PORT: String(staffPort),
  CARE_PUBLIC_ORIGIN:
    process.env.CARE_PUBLIC_ORIGIN || `http://127.0.0.1:${donorPort}`,
  CARE_STAFF_ORIGIN:
    process.env.CARE_STAFF_ORIGIN || `http://127.0.0.1:${staffPort}`,
};
const vinext = fileURLToPath(
  new URL('./cli.js', import.meta.resolve('vinext')),
);
const staff = fileURLToPath(new URL('./staff-portal.mjs', import.meta.url));
const children = new Set();
let stopping = false;
let killTimer;

function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
  // A failed startup or Ctrl+C must not leave the other portal running.
  killTimer = setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
  }, 5000);
  killTimer.unref();
}

function start(label, entry, commandArgs = []) {
  // Use Node directly so npm does not need platform-specific shell commands.
  const child = spawn(process.execPath, [entry, ...commandArgs], {
    env,
    stdio: 'inherit',
  });
  children.add(child);
  child.once('error', (error) => {
    console.error(`${label} could not start: ${error.message}`);
    stop(1);
  });
  child.once('close', (code, signal) => {
    children.delete(child);
    if (!stopping) {
      if (code !== 0) console.error(`${label} stopped (${signal || code}).`);
      stop(code === 0 ? 0 : 1);
    }
    if (!children.size) clearTimeout(killTimer);
  });
}

process.once('SIGINT', () => stop(0));
process.once('SIGTERM', () => stop(0));
console.log(`Donor website: ${env.CARE_PUBLIC_ORIGIN}/`);
start('Staff portal', staff);
start('Donor website', vinext, [
  'dev',
  ...args,
  '--hostname',
  '127.0.0.1',
  '--port',
  String(donorPort),
]);
