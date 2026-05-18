import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const manifestPath = resolve(process.cwd(), 'scripts/non-migration-deployables.manifest.json');
const requestedNames = process.argv.slice(2);

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

const projectRef = process.env.SUPABASE_PROD_PROJECT_REF?.trim();

for (const deployable of selectedDeployables) {
  console.log(`\nDeploying ${deployable.name} from ${deployable.path}`);
  const [command, ...args] = deployable.deployCommand;
  const deployArgs =
    projectRef && command === 'supabase' && !args.includes('--project-ref')
      ? [...args, '--project-ref', projectRef]
      : args;
  await runCommand(command, deployArgs);
}

console.log('\nEdge function deployment commands completed.');
