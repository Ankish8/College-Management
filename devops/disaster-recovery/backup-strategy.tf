# Disaster Recovery and Backup Strategy for College Management System
# Comprehensive backup and recovery solution for business continuity

# ==============================================
# AWS Backup Service Configuration
# ==============================================
resource "aws_backup_vault" "main" {
  name        = "${local.name_prefix}-backup-vault"
  kms_key_arn = aws_kms_key.backup_encryption.arn

  tags = merge(local.common_tags, {
    Component = "backup"
  })
}

resource "aws_kms_key" "backup_encryption" {
  description             = "KMS key for backup encryption"
  deletion_window_in_days = var.environment == "production" ? 30 : 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow AWS Backup to use the key"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:ReEncrypt*",
          "kms:CreateGrant",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_kms_alias" "backup_encryption" {
  name          = "alias/${local.name_prefix}-backup-encryption"
  target_key_id = aws_kms_key.backup_encryption.key_id
}

# ==============================================
# Backup Plans
# ==============================================

# Production backup plan with multiple retention periods
resource "aws_backup_plan" "production" {
  count = var.environment == "production" ? 1 : 0

  name = "${local.name_prefix}-production-backup-plan"

  # Daily backups with 30-day retention
  rule {
    rule_name         = "daily_backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 5 ? * * *)"  # 5 AM UTC daily

    start_window      = 480  # 8 hours
    completion_window = 10080  # 7 days

    lifecycle {
      cold_storage_after = 30
      delete_after       = 120
    }

    recovery_point_tags = merge(local.common_tags, {
      BackupType = "daily"
    })

    copy_action {
      destination_vault_arn = aws_backup_vault.cross_region[0].arn

      lifecycle {
        cold_storage_after = 30
        delete_after       = 365
      }
    }
  }

  # Weekly backups with 12-month retention
  rule {
    rule_name         = "weekly_backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 5 ? * SUN *)"  # 5 AM UTC every Sunday

    start_window      = 480
    completion_window = 10080

    lifecycle {
      cold_storage_after = 30
      delete_after       = 365
    }

    recovery_point_tags = merge(local.common_tags, {
      BackupType = "weekly"
    })
  }

  # Monthly backups with 7-year retention
  rule {
    rule_name         = "monthly_backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 5 1 * ? *)"  # 5 AM UTC on 1st of each month

    start_window      = 480
    completion_window = 10080

    lifecycle {
      cold_storage_after = 90
      delete_after       = 2555  # 7 years
    }

    recovery_point_tags = merge(local.common_tags, {
      BackupType = "monthly"
    })
  }

  tags = local.common_tags
}

# Development/Staging backup plan with simpler retention
resource "aws_backup_plan" "non_production" {
  count = var.environment != "production" ? 1 : 0

  name = "${local.name_prefix}-${var.environment}-backup-plan"

  rule {
    rule_name         = "daily_backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 6 ? * * *)"  # 6 AM UTC daily

    start_window      = 480
    completion_window = 10080

    lifecycle {
      delete_after = 14  # 2 weeks retention for non-prod
    }

    recovery_point_tags = merge(local.common_tags, {
      BackupType = "daily"
    })
  }

  tags = local.common_tags
}

# ==============================================
# Cross-Region Backup Vault
# ==============================================
resource "aws_backup_vault" "cross_region" {
  count = var.cross_region_backup && var.environment == "production" ? 1 : 0

  provider    = aws.backup_region
  name        = "${local.name_prefix}-backup-vault-dr"
  kms_key_arn = aws_kms_key.backup_encryption_dr[0].arn

  tags = merge(local.common_tags, {
    Component = "disaster-recovery"
    Region    = var.backup_region
  })
}

resource "aws_kms_key" "backup_encryption_dr" {
  count = var.cross_region_backup && var.environment == "production" ? 1 : 0

  provider                = aws.backup_region
  description             = "KMS key for DR backup encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = local.common_tags
}

# ==============================================
# Backup Selection
# ==============================================
resource "aws_backup_selection" "database" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "${local.name_prefix}-database-backup"
  plan_id      = var.environment == "production" ? aws_backup_plan.production[0].id : aws_backup_plan.non_production[0].id

  resources = [
    aws_db_instance.main.arn
  ]

  condition {
    string_equals {
      key   = "aws:ResourceTag/BackupEnabled"
      value = "true"
    }
  }

  tags = merge(local.common_tags, {
    Resource = "database"
  })
}

resource "aws_backup_selection" "efs" {
  count = var.enable_efs_backup ? 1 : 0

  iam_role_arn = aws_iam_role.backup.arn
  name         = "${local.name_prefix}-efs-backup"
  plan_id      = var.environment == "production" ? aws_backup_plan.production[0].id : aws_backup_plan.non_production[0].id

  resources = [
    aws_efs_file_system.uploads[0].arn
  ]

  tags = merge(local.common_tags, {
    Resource = "file-system"
  })
}

# ==============================================
# IAM Role for AWS Backup
# ==============================================
resource "aws_iam_role" "backup" {
  name = "${local.name_prefix}-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "backup_service" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "backup_restore" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

# ==============================================
# EFS File System for Persistent Storage
# ==============================================
resource "aws_efs_file_system" "uploads" {
  count = var.enable_efs ? 1 : 0

  creation_token   = "${local.name_prefix}-uploads"
  performance_mode = "generalPurpose"
  throughput_mode  = "provisioned"
  
  provisioned_throughput_in_mibps = var.efs_provisioned_throughput

  encrypted  = true
  kms_key_id = aws_kms_key.app_encryption.arn

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  lifecycle_policy {
    transition_to_primary_storage_class = "AFTER_1_ACCESS"
  }

  tags = merge(local.common_tags, {
    Name          = "${local.name_prefix}-uploads"
    BackupEnabled = "true"
  })
}

resource "aws_efs_mount_target" "uploads" {
  count = var.enable_efs ? length(module.vpc.private_subnets) : 0

  file_system_id  = aws_efs_file_system.uploads[0].id
  subnet_id       = module.vpc.private_subnets[count.index]
  security_groups = [aws_security_group.efs[0].id]
}

resource "aws_security_group" "efs" {
  count = var.enable_efs ? 1 : 0

  name_prefix = "${local.name_prefix}-efs-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "NFS from ECS tasks"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-efs-sg"
  })
}

# ==============================================
# Database Snapshot Automation
# ==============================================
resource "aws_db_snapshot" "initial" {
  count = var.create_initial_snapshot ? 1 : 0

  db_instance_identifier = aws_db_instance.main.id
  db_snapshot_identifier = "${local.name_prefix}-initial-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  tags = merge(local.common_tags, {
    SnapshotType = "initial"
  })

  lifecycle {
    ignore_changes = [db_snapshot_identifier]
  }
}

# Lambda function for automated database snapshots
resource "aws_lambda_function" "db_snapshot" {
  count = var.enable_custom_snapshots ? 1 : 0

  filename         = "db_snapshot.zip"
  function_name    = "${local.name_prefix}-db-snapshot"
  role            = aws_iam_role.lambda_snapshot[0].arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.db_snapshot[0].output_base64sha256
  runtime         = "python3.9"
  timeout         = 300

  environment {
    variables = {
      DB_INSTANCE_ID = aws_db_instance.main.id
      RETENTION_DAYS = var.snapshot_retention_days
    }
  }

  tags = local.common_tags
}

data "archive_file" "db_snapshot" {
  count = var.enable_custom_snapshots ? 1 : 0

  type        = "zip"
  output_path = "db_snapshot.zip"
  source {
    content = templatefile("${path.module}/lambda/db-snapshot.py", {
      region = var.aws_region
    })
    filename = "index.py"
  }
}

resource "aws_iam_role" "lambda_snapshot" {
  count = var.enable_custom_snapshots ? 1 : 0

  name = "${local.name_prefix}-lambda-snapshot"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_snapshot" {
  count = var.enable_custom_snapshots ? 1 : 0

  name = "${local.name_prefix}-lambda-snapshot-policy"
  role = aws_iam_role.lambda_snapshot[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds:CreateDBSnapshot",
          "rds:DeleteDBSnapshot",
          "rds:DescribeDBSnapshots",
          "rds:DescribeDBInstances"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# CloudWatch Event to trigger snapshot Lambda
resource "aws_cloudwatch_event_rule" "snapshot_schedule" {
  count = var.enable_custom_snapshots ? 1 : 0

  name                = "${local.name_prefix}-snapshot-schedule"
  description         = "Trigger database snapshot Lambda"
  schedule_expression = var.snapshot_schedule

  tags = local.common_tags
}

resource "aws_cloudwatch_event_target" "snapshot_lambda" {
  count = var.enable_custom_snapshots ? 1 : 0

  rule      = aws_cloudwatch_event_rule.snapshot_schedule[0].name
  target_id = "SnapshotLambdaTarget"
  arn       = aws_lambda_function.db_snapshot[0].arn
}

resource "aws_lambda_permission" "allow_cloudwatch" {
  count = var.enable_custom_snapshots ? 1 : 0

  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.db_snapshot[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.snapshot_schedule[0].arn
}

# ==============================================
# Disaster Recovery Testing
# ==============================================
resource "aws_cloudwatch_event_rule" "dr_test" {
  count = var.enable_dr_testing ? 1 : 0

  name                = "${local.name_prefix}-dr-test"
  description         = "Monthly disaster recovery test"
  schedule_expression = "cron(0 10 1 * ? *)"  # 10 AM UTC on 1st of each month

  tags = local.common_tags
}

resource "aws_lambda_function" "dr_test" {
  count = var.enable_dr_testing ? 1 : 0

  filename         = "dr_test.zip"
  function_name    = "${local.name_prefix}-dr-test"
  role            = aws_iam_role.lambda_dr_test[0].arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.dr_test[0].output_base64sha256
  runtime         = "python3.9"
  timeout         = 900

  environment {
    variables = {
      BACKUP_VAULT_NAME = aws_backup_vault.main.name
      TEST_ENVIRONMENT  = "${var.environment}-dr-test"
    }
  }

  tags = local.common_tags
}

data "archive_file" "dr_test" {
  count = var.enable_dr_testing ? 1 : 0

  type        = "zip"
  output_path = "dr_test.zip"
  source {
    content = templatefile("${path.module}/lambda/dr-test.py", {
      region = var.aws_region
    })
    filename = "index.py"
  }
}

resource "aws_iam_role" "lambda_dr_test" {
  count = var.enable_dr_testing ? 1 : 0

  name = "${local.name_prefix}-lambda-dr-test"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# ==============================================
# Outputs
# ==============================================
output "backup_vault_arn" {
  description = "ARN of the backup vault"
  value       = aws_backup_vault.main.arn
}

output "backup_plan_id" {
  description = "ID of the backup plan"
  value       = var.environment == "production" ? aws_backup_plan.production[0].id : aws_backup_plan.non_production[0].id
}

output "efs_file_system_id" {
  description = "ID of the EFS file system"
  value       = var.enable_efs ? aws_efs_file_system.uploads[0].id : null
}

output "cross_region_backup_vault_arn" {
  description = "ARN of the cross-region backup vault"
  value       = var.cross_region_backup && var.environment == "production" ? aws_backup_vault.cross_region[0].arn : null
}