import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const manifestPath = resolve(process.cwd(), 'scripts/non-migration-deployables.manifest.json');
const requestedNames = process.argv.slice(2);

const MAX_ATTEMPTS = Number.parseInt(process.env.EDGE_FUNCTION_DEPLOY_RETRIES ?? '3', 10);
const RETRY_DELAY_MS = Number.parseInt(process.env.EDGE_FUNCTION_DEPLOY_RETRY_DELAY_MS ?? '5000', 10);

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

const runCommand = (command, args) =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      env: process.env,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`${command} ${args.join(' ')} failed with exit code ${code ?? 'unknown'}.`));
    });

    child.on('error', rejectPromise);
  });

const runCommandWithRetry = async (command, args, label) => {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      if (attempt > 1) {
        console.log(`Retrying ${label} (attempt ${attempt}/${MAX_ATTEMPTS})...`);
      }
      await runCommand(command, args);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= MAX_ATTEMPTS) {
        break;
      }
      console.warn(`${label} failed: ${lastError.message}`);
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError ?? new Error(`${label} failed.`);
};

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const deployables = Array.isArray(manifest.deployables) ? manifest.deployables : [];
const selectedDeployables =
  requestedNames.length > 0
    ? deployables.filter((deployable) => requestedNames.includes(deployable.name))
    : deployables;

if (selectedDeployables.length === 0) {
  console.error('No deployables matched the requested function names.');
  process.exit(1);
}

const projectRef =
  process.env.SUPABASE_PROD_PROJECT_REF?.trim() || process.env.SUPABASE_DEV_PROJECT_REF?.trim();

for (const deployable of selectedDeployables) {
  console.log(`\nDeploying ${deployable.name} from ${deployable.path}`);
  const [command, ...args] = deployable.deployCommand;
  const deployArgs =
    projectRef && command === 'supabase' && !args.includes('--project-ref')
      ? [...args, '--project-ref', projectRef]
      : args;
  await runCommandWithRetry(command, deployArgs, deployable.name);
}

console.log('\nEdge function deployment commands completed.');
