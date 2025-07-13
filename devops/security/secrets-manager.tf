# AWS Secrets Manager Configuration for College Management System
# Secure management of application secrets with rotation

# ==============================================
# Database Secrets
# ==============================================
resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${local.name_prefix}-database-url"
  description             = "PostgreSQL database connection string"
  recovery_window_in_days = var.environment == "production" ? 30 : 0
  
  replica {
    region = var.backup_region
  }

  tags = merge(local.common_tags, {
    Component = "database"
    Type      = "connection-string"
  })
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = jsonencode({
    url = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}:5432/${aws_db_instance.main.db_name}?sslmode=require"
    host = aws_db_instance.main.address
    port = aws_db_instance.main.port
    database = aws_db_instance.main.db_name
    username = var.db_username
    password = var.db_password
  })
}

resource "aws_secretsmanager_secret" "database_readonly_url" {
  count                   = var.environment == "production" ? 1 : 0
  name                    = "${local.name_prefix}-database-readonly-url"
  description             = "PostgreSQL read-only database connection string"
  recovery_window_in_days = 30

  tags = merge(local.common_tags, {
    Component = "database"
    Type      = "readonly-connection"
  })
}

resource "aws_secretsmanager_secret_version" "database_readonly_url" {
  count     = var.environment == "production" ? 1 : 0
  secret_id = aws_secretsmanager_secret.database_readonly_url[0].id
  secret_string = jsonencode({
    url = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.read_replica[0].endpoint}:5432/${aws_db_instance.read_replica[0].db_name}?sslmode=require"
    host = aws_db_instance.read_replica[0].address
    port = aws_db_instance.read_replica[0].port
    database = aws_db_instance.read_replica[0].db_name
    username = var.db_username
    password = var.db_password
  })
}

# ==============================================
# Application Secrets
# ==============================================
resource "aws_secretsmanager_secret" "nextauth_secret" {
  name                    = "${local.name_prefix}-nextauth-secret"
  description             = "NextAuth.js JWT secret key"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = merge(local.common_tags, {
    Component = "authentication"
    Type      = "jwt-secret"
  })
}

resource "aws_secretsmanager_secret_version" "nextauth_secret" {
  secret_id     = aws_secretsmanager_secret.nextauth_secret.id
  secret_string = random_password.nextauth_secret.result
}

resource "random_password" "nextauth_secret" {
  length  = 64
  special = true
}

# ==============================================
# Redis Secrets
# ==============================================
resource "aws_secretsmanager_secret" "redis_url" {
  name                    = "${local.name_prefix}-redis-url"
  description             = "Redis connection string for session storage"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = merge(local.common_tags, {
    Component = "cache"
    Type      = "connection-string"
  })
}

resource "aws_secretsmanager_secret_version" "redis_url" {
  secret_id = aws_secretsmanager_secret.redis_url.id
  secret_string = jsonencode({
    url = "redis://${aws_elasticache_replication_group.main.configuration_endpoint_address}:6379"
    host = aws_elasticache_replication_group.main.configuration_endpoint_address
    port = 6379
  })
}

# ==============================================
# API Keys and External Services
# ==============================================
resource "aws_secretsmanager_secret" "api_keys" {
  name                    = "${local.name_prefix}-api-keys"
  description             = "External API keys and service credentials"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = merge(local.common_tags, {
    Component = "external-services"
    Type      = "api-keys"
  })
}

resource "aws_secretsmanager_secret_version" "api_keys" {
  secret_id = aws_secretsmanager_secret.api_keys.id
  secret_string = jsonencode({
    openai_api_key = var.openai_api_key
    sendgrid_api_key = var.sendgrid_api_key
    stripe_secret_key = var.stripe_secret_key
    aws_access_key_id = aws_iam_access_key.app_user.id
    aws_secret_access_key = aws_iam_access_key.app_user.secret
  })
}

# ==============================================
# OAuth Provider Secrets
# ==============================================
resource "aws_secretsmanager_secret" "oauth_providers" {
  count                   = length(var.oauth_providers) > 0 ? 1 : 0
  name                    = "${local.name_prefix}-oauth-providers"
  description             = "OAuth provider client secrets"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = merge(local.common_tags, {
    Component = "authentication"
    Type      = "oauth-secrets"
  })
}

resource "aws_secretsmanager_secret_version" "oauth_providers" {
  count     = length(var.oauth_providers) > 0 ? 1 : 0
  secret_id = aws_secretsmanager_secret.oauth_providers[0].id
  secret_string = jsonencode(var.oauth_providers)
}

# ==============================================
# Encryption Keys
# ==============================================
resource "aws_kms_key" "app_encryption" {
  description             = "Application encryption key for ${local.name_prefix}"
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
        Sid    = "Allow ECS tasks to use the key"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.ecs_task.arn
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Component = "encryption"
    Type      = "application-key"
  })
}

resource "aws_kms_alias" "app_encryption" {
  name          = "alias/${local.name_prefix}-app-encryption"
  target_key_id = aws_kms_key.app_encryption.key_id
}

# ==============================================
# File Encryption Key
# ==============================================
resource "aws_secretsmanager_secret" "file_encryption_key" {
  name                    = "${local.name_prefix}-file-encryption-key"
  description             = "Symmetric encryption key for file storage"
  recovery_window_in_days = var.environment == "production" ? 30 : 0
  kms_key_id             = aws_kms_key.app_encryption.arn

  tags = merge(local.common_tags, {
    Component = "storage"
    Type      = "encryption-key"
  })
}

resource "aws_secretsmanager_secret_version" "file_encryption_key" {
  secret_id     = aws_secretsmanager_secret.file_encryption_key.id
  secret_string = random_password.file_encryption_key.result
}

resource "random_password" "file_encryption_key" {
  length  = 32
  special = false
}

# ==============================================
# Webhook Secrets
# ==============================================
resource "aws_secretsmanager_secret" "webhook_secrets" {
  name                    = "${local.name_prefix}-webhook-secrets"
  description             = "Webhook signing secrets and tokens"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = merge(local.common_tags, {
    Component = "webhooks"
    Type      = "signing-secrets"
  })
}

resource "aws_secretsmanager_secret_version" "webhook_secrets" {
  secret_id = aws_secretsmanager_secret.webhook_secrets.id
  secret_string = jsonencode({
    github_webhook_secret = random_password.github_webhook_secret.result
    slack_webhook_url = var.slack_webhook_url
    discord_webhook_url = var.discord_webhook_url
  })
}

resource "random_password" "github_webhook_secret" {
  length  = 32
  special = true
}

# ==============================================
# Multi-Tenant Encryption Keys
# ==============================================
resource "aws_secretsmanager_secret" "tenant_encryption_keys" {
  for_each                = var.tenant_encryption_enabled ? toset(var.tenant_list) : []
  name                    = "${local.name_prefix}-tenant-${each.key}-encryption-key"
  description             = "Tenant-specific encryption key for ${each.key}"
  recovery_window_in_days = var.environment == "production" ? 30 : 0
  kms_key_id             = aws_kms_key.app_encryption.arn

  tags = merge(local.common_tags, {
    Component = "multi-tenant"
    Type      = "tenant-encryption"
    Tenant    = each.key
  })
}

resource "aws_secretsmanager_secret_version" "tenant_encryption_keys" {
  for_each  = var.tenant_encryption_enabled ? toset(var.tenant_list) : []
  secret_id = aws_secretsmanager_secret.tenant_encryption_keys[each.key].id
  secret_string = jsonencode({
    key = random_password.tenant_encryption_keys[each.key].result
    tenant = each.key
    created_at = timestamp()
  })
}

resource "random_password" "tenant_encryption_keys" {
  for_each = var.tenant_encryption_enabled ? toset(var.tenant_list) : []
  length   = 32
  special  = false
}

# ==============================================
# IAM Role for Secret Access
# ==============================================
resource "aws_iam_role" "secrets_manager" {
  name = "${local.name_prefix}-secrets-manager-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_policy" "secrets_manager" {
  name        = "${local.name_prefix}-secrets-manager-policy"
  description = "Policy for accessing application secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.database_url.arn,
          aws_secretsmanager_secret.nextauth_secret.arn,
          aws_secretsmanager_secret.redis_url.arn,
          aws_secretsmanager_secret.api_keys.arn,
          aws_secretsmanager_secret.file_encryption_key.arn,
          aws_secretsmanager_secret.webhook_secrets.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          for secret in aws_secretsmanager_secret.tenant_encryption_keys :
          secret.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.app_encryption.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "secrets_manager" {
  role       = aws_iam_role.secrets_manager.name
  policy_arn = aws_iam_policy.secrets_manager.arn
}

# ==============================================
# Secret Rotation Lambda Function
# ==============================================
resource "aws_lambda_function" "secret_rotation" {
  count = var.enable_secret_rotation ? 1 : 0

  filename         = "secret_rotation.zip"
  function_name    = "${local.name_prefix}-secret-rotation"
  role            = aws_iam_role.lambda_secret_rotation[0].arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.secret_rotation[0].output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 60

  environment {
    variables = {
      SECRETS_PREFIX = local.name_prefix
    }
  }

  tags = local.common_tags
}

data "archive_file" "secret_rotation" {
  count = var.enable_secret_rotation ? 1 : 0

  type        = "zip"
  output_path = "secret_rotation.zip"
  source {
    content = templatefile("${path.module}/lambda/secret-rotation.js", {
      region = var.aws_region
    })
    filename = "index.js"
  }
}

resource "aws_iam_role" "lambda_secret_rotation" {
  count = var.enable_secret_rotation ? 1 : 0

  name = "${local.name_prefix}-lambda-secret-rotation"

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

resource "aws_iam_role_policy_attachment" "lambda_secret_rotation_basic" {
  count = var.enable_secret_rotation ? 1 : 0

  role       = aws_iam_role.lambda_secret_rotation[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_secret_rotation" {
  count = var.enable_secret_rotation ? 1 : 0

  name = "${local.name_prefix}-lambda-secret-rotation-policy"
  role = aws_iam_role.lambda_secret_rotation[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:*"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:*"
        ]
        Resource = aws_kms_key.app_encryption.arn
      }
    ]
  })
}

# ==============================================
# Outputs
# ==============================================
output "secrets_manager_role_arn" {
  description = "ARN of the Secrets Manager IAM role"
  value       = aws_iam_role.secrets_manager.arn
}

output "database_secret_arn" {
  description = "ARN of the database connection secret"
  value       = aws_secretsmanager_secret.database_url.arn
}

output "nextauth_secret_arn" {
  description = "ARN of the NextAuth secret"
  value       = aws_secretsmanager_secret.nextauth_secret.arn
}

output "redis_secret_arn" {
  description = "ARN of the Redis connection secret"
  value       = aws_secretsmanager_secret.redis_url.arn
}

output "kms_key_arn" {
  description = "ARN of the application encryption key"
  value       = aws_kms_key.app_encryption.arn
}

output "tenant_encryption_secret_arns" {
  description = "ARNs of tenant-specific encryption secrets"
  value = {
    for tenant, secret in aws_secretsmanager_secret.tenant_encryption_keys :
    tenant => secret.arn
  }
}