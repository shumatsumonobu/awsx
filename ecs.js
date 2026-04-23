import { execSync } from 'child_process';
import inquirer from 'inquirer';
import { PROFILE, ssoSignin } from './common.js';

const getClusters = () => {
  const cmd = `aws ecs list-clusters --output json --profile ${PROFILE}`;
  const { clusterArns } = JSON.parse(execSync(cmd).toString());
  return clusterArns.map(arn => arn.split('/').pop());
};

const getContainers = (cluster) => {
  try {
    const listCmd = `aws ecs list-services --cluster ${cluster} --output json --profile ${PROFILE}`;
    const { serviceArns } = JSON.parse(execSync(listCmd).toString());
    if (!serviceArns || serviceArns.length === 0) return [];

    const serviceName = serviceArns[0].split('/').pop();
    const descCmd = `aws ecs describe-services --cluster ${cluster} --services ${serviceName} --output json --profile ${PROFILE}`;
    const { services } = JSON.parse(execSync(descCmd).toString());
    if (!services || services.length === 0) return [];

    const taskDef = services[0].taskDefinition;
    const taskDefCmd = `aws ecs describe-task-definition --task-definition "${taskDef}" --output json --profile ${PROFILE}`;
    const { taskDefinition } = JSON.parse(execSync(taskDefCmd).toString());
    return taskDefinition.containerDefinitions.map(c => c.name);
  } catch {
    return [];
  }
};

const getTaskIds = (cluster) => {
  try {
    const cmd = `aws ecs list-tasks --cluster ${cluster} --output json --profile ${PROFILE}`;
    const { taskArns } = JSON.parse(execSync(cmd).toString());
    if (!taskArns || taskArns.length === 0) return [];
    return taskArns.map(t => t.match(/\/([a-z0-9]+)$/)?.[1]).filter(Boolean);
  } catch {
    return [];
  }
};

const main = async () => {
  try {
    ssoSignin();

    const clusters = getClusters();
    if (clusters.length === 0) {
      throw new Error('No clusters found');
    }

    const { cluster } = await inquirer.prompt([
      { type: 'list', name: 'cluster', message: 'Cluster:', choices: clusters, pageSize: clusters.length },
    ]);

    const containers = getContainers(cluster);
    if (containers.length === 0) {
      throw new Error('No containers found');
    }

    const { container } = await inquirer.prompt([
      { type: 'list', name: 'container', message: 'Container:', choices: containers, pageSize: containers.length },
    ]);

    const taskIds = getTaskIds(cluster);
    if (taskIds.length === 0) {
      throw new Error('No running ECS tasks found');
    }

    const taskId = taskIds[0];
    const cmd = `aws ecs execute-command --cluster ${cluster} --task ${taskId} --container ${container} --command "/bin/bash" --interactive --profile ${PROFILE}`;
    console.log(`Connecting: ${cluster} / ${container}`);
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    console.error('Error:', error.message);
  }
};

main();
