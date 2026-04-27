import { execSync } from 'child_process';
import inquirer from 'inquirer';
import { PROFILE, REGION, LOG_GROUP_FILTER, LOG_GROUP_EXCLUDE, ssoSignin, loadHistory, saveHistory } from './common.js';

const HISTORY_FILE = 'cloudwatch-history.json';

const getLogGroups = () => {
  const cmd = `aws logs describe-log-groups --output json --profile ${PROFILE} --region ${REGION}`;
  const { logGroups } = JSON.parse(execSync(cmd).toString());
  return logGroups.map(g => g.logGroupName).sort();
};

const parseDate = (str) => {
  const [date, time] = str.split(' ');
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time ? time.split(':').map(Number) : [0, 0];
  return new Date(y, m - 1, d, h, min).getTime();
};

const formatDate = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fetchLogs = (logGroup, startTime, endTime, filterPattern, limit) => {
  let cmd = `aws logs filter-log-events --log-group-name "${logGroup}" --start-time ${startTime} --end-time ${endTime} --limit ${limit} --region ${REGION} --profile ${PROFILE} --output json`;
  if (filterPattern) cmd += ` --filter-pattern "${filterPattern}"`;

  const data = JSON.parse(execSync(cmd, { maxBuffer: 50 * 1024 * 1024 }).toString());

  if (data.events.length === 0) {
    console.log('No logs found');
    return;
  }

  console.log(`${data.events.length} logs:\n`);
  for (const event of data.events) {
    console.log(event.message);
  }
};

const main = async () => {
  try {
    ssoSignin();

    const allLogGroups = getLogGroups();
    if (allLogGroups.length === 0) {
      throw new Error('No log groups found');
    }

    const historyKey = `${PROFILE}:${REGION}`;
    const recents = (loadHistory(HISTORY_FILE)[historyKey] || [])
      .filter(g => allLogGroups.includes(g));

    let logGroup;
    if (recents.length > 0) {
      const { picked } = await inquirer.prompt([{
        type: 'list',
        name: 'picked',
        message: 'Quick pick (recent):',
        choices: [
          ...recents.map(g => ({ name: g, value: g })),
          { name: '── show all log groups ──', value: null },
        ],
        pageSize: Math.min(recents.length + 1, 15),
      }]);
      logGroup = picked;
    }

    if (!logGroup) {
      const { filter } = await inquirer.prompt([
        { type: 'input', name: 'filter', message: 'Log group filter (empty=all):', default: LOG_GROUP_FILTER },
      ]);

      const includePatterns = filter ? filter.split(',').map(p => p.trim().toLowerCase()) : [];
      const excludePatterns = LOG_GROUP_EXCLUDE ? LOG_GROUP_EXCLUDE.split(',').map(p => p.trim().toLowerCase()) : [];

      let filtered = includePatterns.length > 0
        ? allLogGroups.filter(g => includePatterns.some(p => g.toLowerCase().includes(p)))
        : allLogGroups;

      if (excludePatterns.length > 0) {
        filtered = filtered.filter(g => !excludePatterns.some(p => g.toLowerCase().includes(p)));
      }

      if (filtered.length === 0) {
        throw new Error('No matching log groups');
      }

      ({ logGroup } = await inquirer.prompt([
        { type: 'list', name: 'logGroup', message: 'Log group:', choices: filtered, pageSize: Math.min(filtered.length, 15) },
      ]));
    }

    saveHistory(HISTORY_FILE, historyKey, logGroup);

    const { from, to, filterPattern, limit } = await inquirer.prompt([
      { type: 'input', name: 'from', message: 'From (YYYY-MM-DD [HH:MM], empty=1h ago):' },
      { type: 'input', name: 'to', message: 'To (YYYY-MM-DD [HH:MM], empty=now):' },
      { type: 'input', name: 'filterPattern', message: 'Keyword (empty=all):' },
      { type: 'number', name: 'limit', message: 'Limit (default=50):', default: 50 },
    ]);

    const startTime = from ? parseDate(from) : Date.now() - 60 * 60 * 1000;
    const endTime = to ? parseDate(to) : Date.now();

    console.log(`\nFetching ${logGroup} (${formatDate(new Date(startTime))} ~ ${formatDate(new Date(endTime))})...\n`);
    fetchLogs(logGroup, startTime, endTime, filterPattern, limit);
  } catch (error) {
    console.error('Error:', error.message);
  }
};

main();
