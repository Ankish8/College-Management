# Infrastructure Variables for College Management System

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "college-management-system"
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "terraform_state_bucket" {
  description = "S3 bucket for Terraform state"
  type        = string
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

variable "single_nat_gateway" {
  description = "Use a single NAT gateway for all private subnets"
  type        = bool
  default     = false
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Initial allocated storage for RDS (GB)"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for RDS auto-scaling (GB)"
  type        = number
  default     = 100
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "cms_admin"
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "db_replica_instance_class" {
  description = "RDS read replica instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "backup_retention_period" {
  description = "Database backup retention period in days"
  type        = number
  default     = 7
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_clusters" {
  description = "Number of cache clusters in the Redis replication group"
  type        = number
  default     = 1
}

# ECS Configuration
variable "app_cpu" {
  description = "CPU units for the application container"
  type        = number
  default     = 256
}

variable "app_memory" {
  description = "Memory for the application container"
  type        = number
  default     = 512
}

variable "app_desired_count" {
  description = "Desired number of application instances"
  type        = number
  default     = 2
}

variable "app_min_capacity" {
  description = "Minimum number of application instances for auto-scaling"
  type        = number
  default     = 1
}

variable "app_max_capacity" {
  description = "Maximum number of application instances for auto-scaling"
  type        = number
  default     = 10
}

# Monitoring Configuration
variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 14
}

# Multi-tenant Configuration
variable "tenant_isolation_level" {
  description = "Level of tenant isolation (schema, database, cluster)"
  type        = string
  default     = "schema"
  validation {
    condition     = contains(["schema", "database", "cluster"], var.tenant_isolation_level)
    error_message = "Tenant isolation level must be one of: schema, database, cluster."
  }
}

variable "default_tenant_domains" {
  description = "Default domains for tenant routing"
  type        = list(string)
  default     = []
}

# Security Configuration
variable "enable_waf" {
  description = "Enable AWS WAF for the load balancer"
  type        = bool
  default     = true
}

variable "enable_shield" {
  description = "Enable AWS Shield Advanced"
  type        = bool
  default     = false
}

variable "ssl_certificate_arn" {
  description = "ARN of the SSL certificate for HTTPS"
  type        = string
  default     = ""
}

# Backup Configuration
variable "backup_schedule" {
  description = "Backup schedule for database snapshots"
  type        = string
  default     = "cron(0 5 * * ? *)" # Daily at 5 AM UTC
}

variable "backup_retention_days" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 30
}

# Auto Scaling Configuration
variable "cpu_target_value" {
  description = "Target CPU utilization for auto-scaling"
  type        = number
  default     = 70
}

variable "memory_target_value" {
  description = "Target memory utilization for auto-scaling"
  type        = number
  default     = 80
}

variable "scale_out_cooldown" {
  description = "Cooldown period for scaling out (seconds)"
  type        = number
  default     = 300
}

variable "scale_in_cooldown" {
  description = "Cooldown period for scaling in (seconds)"
  type        = number
  default     = 300
}

# Domain and DNS Configuration
variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = ""
}

variable "create_route53_zone" {
  description = "Create Route53 hosted zone for the domain"
  type        = bool
  default     = false
}

variable "route53_zone_id" {
  description = "Existing Route53 zone ID (if not creating new)"
  type        = string
  default     = ""
}

# Feature Flags
variable "enable_https_redirect" {
  description = "Enable automatic HTTPS redirect"
  type        = bool
  default     = true
}

variable "enable_container_insights" {
  description = "Enable Container Insights for ECS"
  type        = bool
  default     = true
}

variable "enable_backup_encryption" {
  description = "Enable encryption for database backups"
  type        = bool
  default     = true
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for production resources"
  type        = bool
  default     = true
}

# Cost Optimization
variable "use_spot_instances" {
  description = "Use Spot instances for non-critical workloads"
  type        = bool
  default     = false
}

variable "enable_cost_allocation_tags" {
  description = "Enable detailed cost allocation tags"
  type        = bool
  default     = true
}

# Compliance and Governance
variable "compliance_requirements" {
  description = "List of compliance requirements (FERPA, GDPR, etc.)"
  type        = list(string)
  default     = ["FERPA"]
}

variable "data_classification" {
  description = "Data classification level (public, internal, confidential, restricted)"
  type        = string
  default     = "confidential"
  validation {
    condition     = contains(["public", "internal", "confidential", "restricted"], var.data_classification)
    error_message = "Data classification must be one of: public, internal, confidential, restricted."
  }
}

# Performance Configuration
variable "enable_performance_insights" {
  description = "Enable Performance Insights for RDS"
  type        = bool
  default     = true
}

variable "performance_insights_retention_period" {
  description = "Performance Insights retention period in days"
  type        = number
  default     = 7
}

# Disaster Recovery
variable "cross_region_backup" {
  description = "Enable cross-region backup for disaster recovery"
  type        = bool
  default     = false
}

variable "backup_region" {
  description = "AWS region for cross-region backups"
  type        = string
  default     = "us-west-2"
}

variable "rto_target_minutes" {
  description = "Recovery Time Objective in minutes"
  type        = number
  default     = 240 # 4 hours
}

variable "rpo_target_minutes" {
  description = "Recovery Point Objective in minutes"
  type        = number
  default     = 60 # 1 hour
}

# Notification Configuration
variable "alert_email_addresses" {
  description = "Email addresses for infrastructure alerts"
  type        = list(string)
  default     = []
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  default     = ""
  sensitive   = true
}

# Environment-specific defaults
locals {
  environment_defaults = {
    development = {
      db_instance_class          = "db.t3.micro"
      redis_node_type           = "cache.t3.micro"
      app_desired_count         = 1
      app_min_capacity          = 1
      app_max_capacity          = 3
      single_nat_gateway        = true
      backup_retention_period   = 3
      log_retention_days        = 7
      enable_deletion_protection = false
      cross_region_backup       = false
    }
    staging = {
      db_instance_class          = "db.t3.small"
      redis_node_type           = "cache.t3.small"
      app_desired_count         = 2
      app_min_capacity          = 1
      app_max_capacity          = 5
      single_nat_gateway        = true
      backup_retention_period   = 7
      log_retention_days        = 14
      enable_deletion_protection = false
      cross_region_backup       = false
    }
    production = {
      db_instance_class          = "db.t3.medium"
      redis_node_type           = "cache.t3.medium"
      app_desired_count         = 3
      app_min_capacity          = 2
      app_max_capacity          = 20
      single_nat_gateway        = false
      backup_retention_period   = 30
      log_retention_days        = 30
      enable_deletion_protection = true
      cross_region_backup       = true
    }
  }
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}