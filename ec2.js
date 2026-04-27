import { execSync, spawnSync } from 'child_process';
import inquirer from 'inquirer';
import { PROFILE, ssoSignin, loadHistory, saveHistory } from './common.js';

// start-session failures (e.g. AccessDenied) return almost instantly;
// real sessions run far longer. Anything failing within this window is
// treated as a setup failure and falls back to the default document.
const STARTUP_FAILURE_WINDOW_MS = 3000;

const HISTORY_FILE = 'ec2-history.json';

const getInstances = () => {
  const cmd = `aws ec2 describe-instances --filters Name=instance-state-name,Values=running --output json --profile ${PROFILE}`;
  const { Reservations } = JSON.parse(execSync(cmd).toString());

  const instances = [];
  for (const r of Reservations) {
    for (const i of r.Instances) {
      const nameTag = i.Tags?.find(t => t.Key === 'Name');
      instances.push({
        name: nameTag?.Value || '(no name)',
        id: i.InstanceId,
        type: i.InstanceType,
      });
    }
  }
  return instances.sort((a, b) => a.name.localeCompare(b.name));
};

const connectShell = (instanceId) => {
  console.log(`Connecting: ${instanceId}`);
  const localeExport = 'export LANG=C.UTF-8 LC_ALL=C.UTF-8';
  const initCmd = `${localeExport}; exec bash -l`;
  const prefix = process.platform === 'win32' ? 'chcp 65001 >nul && ' : '';

  const start = Date.now();
  try {
    execSync(`${prefix}aws ssm start-session --target ${instanceId} --document-name AWS-StartInteractiveCommand --parameters command="${initCmd}" --profile ${PROFILE}`, { stdio: 'inherit' });
    return;
  } catch (e) {
    if (Date.now() - start >= STARTUP_FAILURE_WINDOW_MS) throw e;
  }

  console.log('\n[fallback] AWS-StartInteractiveCommand denied — using default session');
  const copied = process.platform === 'win32' && spawnSync('clip', { input: localeExport }).status === 0;
  if (copied) {
    console.log(`[fallback] copied to clipboard: ${localeExport}`);
    console.log('[fallback] paste with Ctrl+Shift+V then Enter to apply');
  } else {
    console.log(`[fallback] run after connect: ${localeExport}`);
  }
  execSync(`${prefix}aws ssm start-session --target ${instanceId} --profile ${PROFILE}`, { stdio: 'inherit' });
};

const main = async () => {
  try {
    ssoSignin();

    const instances = getInstances();
    if (instances.length === 0) {
      throw new Error('No running EC2 instances found');
    }

    const idMap = new Map(instances.map(i => [i.id, i]));
    const recents = (loadHistory(HISTORY_FILE)[PROFILE] || [])
      .map(h => idMap.get(h.id))
      .filter(Boolean);

    let instanceId;
    if (recents.length > 0) {
      const { picked } = await inquirer.prompt([{
        type: 'list',
        name: 'picked',
        message: 'Quick connect (recent):',
        choices: [
          ...recents.map(i => ({ name: `${i.name} (${i.id}) [${i.type}]`, value: i.id })),
          { name: '── show all instances ──', value: null },
        ],
        pageSize: Math.min(recents.length + 1, 15),
      }]);
      instanceId = picked;
    }

    if (!instanceId) {
      const { filter } = await inquirer.prompt([
        { type: 'input', name: 'filter', message: 'Filter (empty for all):' },
      ]);

      const filtered = filter
        ? instances.filter(i => i.name.toLowerCase().includes(filter.toLowerCase()))
        : instances;

      if (filtered.length === 0) {
        throw new Error('No matching instances');
      }

      const choices = filtered.map(i => ({
        name: `${i.name} (${i.id}) [${i.type}]`,
        value: i.id,
      }));

      ({ instanceId } = await inquirer.prompt([
        { type: 'list', name: 'instanceId', message: 'Instance:', choices, pageSize: Math.min(choices.length, 15) },
      ]));
    }

    saveHistory(HISTORY_FILE, PROFILE, idMap.get(instanceId), (i) => i.id);

    const { mode } = await inquirer.prompt([
      { type: 'list', name: 'mode', message: 'Connection:', choices: [
        { name: 'Shell (SSM Session Manager)', value: 'shell' },
        { name: 'SFTP (Port forward -> localhost:8080)', value: 'sftp' },
      ]},
    ]);

    if (mode === 'shell') {
      connectShell(instanceId);
    } else {
      console.log(`Port forwarding: localhost:8080 -> ${instanceId}:22`);
      console.log('Connect with your SFTP client to localhost:8080');
      console.log('Press Ctrl+C to exit\n');
      execSync(`aws ssm start-session --target ${instanceId} --document-name AWS-StartPortForwardingSession --parameters portNumber=22,localPortNumber=8080 --profile ${PROFILE}`, { stdio: 'inherit' });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
};

main();
