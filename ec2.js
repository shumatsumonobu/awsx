import { execSync } from 'child_process';
import inquirer from 'inquirer';
import { PROFILE, ssoSignin } from './common.js';

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

const main = async () => {
  try {
    ssoSignin();

    const instances = getInstances();
    if (instances.length === 0) {
      throw new Error('No running EC2 instances found');
    }

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

    const { instanceId } = await inquirer.prompt([
      { type: 'list', name: 'instanceId', message: 'Instance:', choices, pageSize: Math.min(choices.length, 15) },
    ]);

    const { mode } = await inquirer.prompt([
      { type: 'list', name: 'mode', message: 'Connection:', choices: [
        { name: 'Shell (SSM Session Manager)', value: 'shell' },
        { name: 'SFTP (Port forward -> localhost:8080)', value: 'sftp' },
      ]},
    ]);

    if (mode === 'shell') {
      console.log(`Connecting: ${instanceId}`);
      execSync(`aws ssm start-session --target ${instanceId} --profile ${PROFILE}`, { stdio: 'inherit' });
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
