import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const PROFILE = process.env.AWS_PROFILE || 'default';
export const REGION = process.env.AWS_REGION || 'ap-northeast-1';
export const LOG_GROUP_FILTER = process.env.LOG_GROUP_FILTER || '';
export const LOG_GROUP_EXCLUDE = process.env.LOG_GROUP_EXCLUDE || '';

export const ssoSignin = () => {
  try {
    execSync(`aws sts get-caller-identity --profile ${PROFILE}`, { stdio: 'ignore' });
  } catch {
    console.log('\nSSO sign-in required');
    console.log('Browser will open. Please complete authentication.\n');
    execSync(`aws sso login --profile ${PROFILE}`, { stdio: 'inherit' });
  }
};

const HISTORY_DIR = join(homedir(), '.awsx');
const HISTORY_LIMIT = 10;

export const loadHistory = (filename) => {
  const path = join(HISTORY_DIR, filename);
  if (!existsSync(path)) return {};
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { return {}; }
};

export const saveHistory = (filename, key, item, getId = (x) => x) => {
  const all = loadHistory(filename);
  const list = (all[key] || []).filter(x => getId(x) !== getId(item));
  list.unshift(item);
  all[key] = list.slice(0, HISTORY_LIMIT);
  mkdirSync(HISTORY_DIR, { recursive: true });
  writeFileSync(join(HISTORY_DIR, filename), JSON.stringify(all, null, 2));
};
