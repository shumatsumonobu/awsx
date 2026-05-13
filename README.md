# awsx

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-14%2B-green.svg)](https://nodejs.org/)

> AWS at your fingertips - EC2, ECS, CloudWatch Logs in seconds

Interactive AWS tools. No commands to memorize - just select and connect.

## Features

- **EC2 Connection** - Select instance, instant shell access
- **ECS Connection** - Select cluster/container, auto execute-command
- **CloudWatch Logs** - Filter and search logs with keywords
- **AWS SSO Support** - Secure browser authentication
- **SFTP Support** - Port forwarding for file transfer
- **Quick Connect** - Recently-used instances and log groups offered first (per profile, last 10)

## Quick Start

```bash
git clone https://github.com/shumatsumonobu/awsx.git
cd awsx
npm install
cp .env.example .env  # Edit AWS_PROFILE / AWS_REGION
node ec2.js
```

## Requirements

- Node.js 14+
- AWS CLI v2
- AWS SSO configured

## Setup

1. Add AWS SSO config to `~/.aws/config`
   ```
   [profile your-profile]
   sso_start_url = https://xxxxx.awsapps.com/start#
   sso_region = ap-northeast-1
   sso_account_id = 123456789012
   region = ap-northeast-1
   output = json
   ```
   
   | Field | Description |
   |-------|-------------|
   | `sso_start_url` | Your AWS SSO portal URL |
   | `sso_region` | Region where SSO is configured |
   | `sso_account_id` | AWS account ID to access |

2. Edit `.env` (see [`.env.example`](.env.example) for the full template)

   **Required**
   - `AWS_PROFILE` — profile name from `~/.aws/config`
   - `AWS_REGION` — default region

   **Optional (CloudWatch)**
   - `LOG_GROUP_FILTER` — comma-separated patterns to pre-filter log groups
   - `LOG_GROUP_EXCLUDE` — comma-separated patterns to exclude

## Usage

> On subsequent runs, recently-used targets appear first as `Quick connect` (EC2) or `Quick pick` (CloudWatch). Select `── show all ──` to fall back to the full list.
>
> History: `~/.awsx/{ec2,cloudwatch}-history.json` (per profile, last 10 entries)

### EC2 Connection
```bash
node ec2.js
```

```
? Filter (empty for all): prod-app
? Instance: prod-app-server (i-0abc123def456) [t3.medium]
? Connection: Shell (SSM Session Manager)

Connecting: i-0abc123def456

sh-4.2$
```

#### SFTP Connection
```
? Connection: SFTP (Port forward -> localhost:8080)

Port forwarding: localhost:8080 -> i-0abc123def456:22
Connect with your SFTP client to localhost:8080
Press Ctrl+C to exit
```

SFTP client settings:
| Setting | Value |
|---------|-------|
| Host | `localhost` |
| Port | `8080` |
| User | `ec2-user` |
| Auth | Private key (.pem) |

> Port forwarding creates an SSH tunnel. The actual connection uses SSH authentication (ec2-user + .pem), not SSM (ssm-user).

### ECS Connection
```bash
node ecs.js
```

```
? Cluster: prod-api-cluster
? Container: api-app

Connecting: prod-api-cluster / api-app

root@abc123def456:/app#
```

### CloudWatch Logs
```bash
node cloudwatch.js
```

```
? Filter log groups (empty for all): prod-api
? Log group: /aws/prod-api-loggroup
? From (empty for 1 hour ago): 
? To (empty for now): 
? Search keyword (empty for all): ERROR
? Limit: 50

Fetching /aws/prod-api-loggroup...

3 logs:

ERROR - 2026-04-23 10:15:32 - Connection timeout
ERROR - 2026-04-23 10:23:45 - Invalid request
ERROR - 2026-04-23 10:45:12 - Database error
```

## IAM Permissions

### EC2 Connection
- `ec2:DescribeInstances`
- `ssm:StartSession` on target EC2 instance ARNs (e.g. `arn:aws:ec2:*:*:instance/*` or per-instance)
- `ssm:StartSession` on `AWS-StartInteractiveCommand` (optional — enables auto UTF-8 locale; falls back to default session if not granted)

### EC2 SFTP (Port Forwarding)
- `ssm:StartSession` on `AWS-StartPortForwardingSession`
- `ssm:StartSession` on `AWS-StartPortForwardingSessionToRemoteHost`

### ECS Connection
- `ecs:ListClusters`
- `ecs:ListServices`
- `ecs:DescribeServices`
- `ecs:DescribeTaskDefinition`
- `ecs:ListTasks`
- `ecs:ExecuteCommand`

### CloudWatch Logs
- `logs:DescribeLogGroups`
- `logs:FilterLogEvents`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| SSO login error | Run `aws sso login --profile <your-profile>` manually |
| Instance not found | Check if instance is running in AWS Console |
| Permission error | Verify IAM role permissions |
| `AccessDeniedException` on `ssm:StartSession` for an instance | Your IAM role needs `ssm:StartSession` on the target EC2 instance ARN — ask admin to grant access to the instances you need |
| Port forward error | Add `AWS-StartPortForwardingSession` permission to IAM |
| Garbled Japanese in EC2 shell | Allow `AWS-StartInteractiveCommand` for auto UTF-8 locale; otherwise fallback copies the export command to clipboard for manual paste |

## License

MIT
