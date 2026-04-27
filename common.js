import { execSync } from 'child_process';
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
