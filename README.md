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

## Quick Start

```bash
git clone https://github.com/shumatsumonobu/awsx.git
cd awsx
npm install
cp .env.example .env  # Edit profile name
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
   | `sso_start_url` | AWS SSO portal URL |
   | `sso_region` | Region where AWS SSO is configured |
   | `sso_account_id` | AWS account ID to access |
   | `region` | Default region for AWS CLI commands |
   | `output` | Output format (json recommended) |

2. Edit `.env` file
   ```
   AWS_PROFILE=your-profile
   AWS_REGION=ap-northeast-1
   ```

## Usage

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

> Note: Port forwarding creates an SSH tunnel. The actual connection uses SSH authentication (ec2-user + .pem), not SSM (ssm-user).

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
- `ssm:StartSession`

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
| Port forward error | Add `AWS-StartPortForwardingSession` permission to IAM |

## License

MIT
