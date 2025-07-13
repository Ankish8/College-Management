# Cost Optimization Configuration for College Management System
# Comprehensive cost management and optimization strategies

# ==============================================
# Cost Anomaly Detection
# ==============================================
resource "aws_ce_anomaly_detector" "service_monitor" {
  name         = "${local.name_prefix}-service-anomaly-detector"
  monitor_type = "DIMENSIONAL"

  specification = jsonencode({
    Dimension = "SERVICE"
    MatchOptions = ["EQUALS"]
    Values = [
      "Amazon Elastic Compute Cloud - Compute",
      "Amazon Relational Database Service",
      "Amazon ElastiCache",
      "Amazon Simple Storage Service"
    ]
  })

  tags = local.common_tags
}

resource "aws_ce_anomaly_subscription" "cost_alerts" {
  name      = "${local.name_prefix}-cost-anomaly-alerts"
  frequency = "DAILY"
  
  monitor_arn_list = [
    aws_ce_anomaly_detector.service_monitor.arn
  ]
  
  subscriber {
    type    = "EMAIL"
    address = var.cost_alert_email
  }

  threshold_expression {
    and {
      dimension {
        key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
        values        = ["100"]  # Alert on $100+ anomalies
        match_options = ["GREATER_THAN_OR_EQUAL"]
      }
    }
  }

  tags = local.common_tags
}

# ==============================================
# Budget Management
# ==============================================
resource "aws_budgets_budget" "monthly_cost" {
  name     = "${local.name_prefix}-monthly-budget"
  budget_type = "COST"
  limit_amount = var.monthly_budget_limit
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  time_period_start = "2024-01-01_00:00"

  cost_filters {
    tag {
      key = "Project"
      values = [var.project_name]
    }
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.budget_alert_emails
  }

  tags = local.common_tags
}

resource "aws_budgets_budget" "resource_budget" {
  name     = "${local.name_prefix}-resource-budget"
  budget_type = "USAGE"
  limit_amount = "1000"
  limit_unit   = "GB"
  time_unit    = "MONTHLY"

  cost_filters {
    service = ["Amazon Elastic Compute Cloud - Compute"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_emails
  }

  tags = local.common_tags
}

# ==============================================
# Reserved Instance Recommendations
# ==============================================
resource "aws_lambda_function" "ri_optimizer" {
  count = var.enable_ri_optimization ? 1 : 0

  filename         = "ri_optimizer.zip"
  function_name    = "${local.name_prefix}-ri-optimizer"
  role            = aws_iam_role.lambda_ri_optimizer[0].arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.ri_optimizer[0].output_base64sha256
  runtime         = "python3.9"
  timeout         = 300

  environment {
    variables = {
      PROJECT_NAME = var.project_name
      ENVIRONMENT  = var.environment
      SNS_TOPIC_ARN = aws_sns_topic.cost_optimization[0].arn
    }
  }

  tags = local.common_tags
}

data "archive_file" "ri_optimizer" {
  count = var.enable_ri_optimization ? 1 : 0

  type        = "zip"
  output_path = "ri_optimizer.zip"
  source {
    content = templatefile("${path.module}/lambda/ri-optimizer.py", {
      region = var.aws_region
    })
    filename = "index.py"
  }
}

resource "aws_iam_role" "lambda_ri_optimizer" {
  count = var.enable_ri_optimization ? 1 : 0

  name = "${local.name_prefix}-lambda-ri-optimizer"

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

resource "aws_iam_role_policy" "lambda_ri_optimizer" {
  count = var.enable_ri_optimization ? 1 : 0

  name = "${local.name_prefix}-lambda-ri-optimizer-policy"
  role = aws_iam_role.lambda_ri_optimizer[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ce:GetReservationCoverage",
          "ce:GetReservationPurchaseRecommendation",
          "ce:GetReservationUtilization",
          "ce:GetCostAndUsage",
          "ec2:DescribeInstances",
          "rds:DescribeDBInstances",
          "elasticache:DescribeCacheClusters"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.cost_optimization[0].arn
      }
    ]
  })
}

# ==============================================
# Spot Instance Management
# ==============================================
resource "aws_launch_template" "spot_template" {
  count = var.use_spot_instances ? 1 : 0

  name_prefix   = "${local.name_prefix}-spot-"
  image_id      = data.aws_ami.ecs_optimized.id
  instance_type = "t3.medium"

  vpc_security_group_ids = [aws_security_group.ecs.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.ecs_instance[0].name
  }

  user_data = base64encode(templatefile("${path.module}/templates/ecs-user-data.sh", {
    cluster_name = aws_ecs_cluster.main.name
  }))

  tag_specifications {
    resource_type = "instance"
    tags = merge(local.common_tags, {
      Name = "${local.name_prefix}-spot-instance"
      InstanceType = "spot"
    })
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "spot_asg" {
  count = var.use_spot_instances ? 1 : 0

  name                = "${local.name_prefix}-spot-asg"
  vpc_zone_identifier = module.vpc.private_subnets
  min_size            = var.spot_min_size
  max_size            = var.spot_max_size
  desired_capacity    = var.spot_desired_capacity

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 1
      on_demand_percentage_above_base_capacity = 0
      spot_allocation_strategy                 = "diversified"
      spot_instance_pools                      = 3
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.spot_template[0].id
        version           = "$Latest"
      }

      override {
        instance_type = "t3.medium"
      }

      override {
        instance_type = "t3.large"
      }

      override {
        instance_type = "m5.large"
      }
    }
  }

  tag {
    key                 = "Name"
    value               = "${local.name_prefix}-spot-asg"
    propagate_at_launch = true
  }

  dynamic "tag" {
    for_each = local.common_tags
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }
}

data "aws_ami" "ecs_optimized" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-ecs-hvm-*-x86_64-ebs"]
  }
}

resource "aws_iam_instance_profile" "ecs_instance" {
  count = var.use_spot_instances ? 1 : 0

  name = "${local.name_prefix}-ecs-instance-profile"
  role = aws_iam_role.ecs_instance[0].name
}

resource "aws_iam_role" "ecs_instance" {
  count = var.use_spot_instances ? 1 : 0

  name = "${local.name_prefix}-ecs-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_instance" {
  count = var.use_spot_instances ? 1 : 0

  role       = aws_iam_role.ecs_instance[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

# ==============================================
# S3 Intelligent Tiering
# ==============================================
resource "aws_s3_bucket_intelligent_tiering_configuration" "app_storage" {
  bucket = aws_s3_bucket.app_storage.bucket
  name   = "intelligent-tiering"

  filter {
    prefix = "uploads/"
  }

  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }

  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }
}

# ==============================================
# RDS Storage Auto Scaling
# ==============================================
resource "aws_db_parameter_group" "optimized" {
  family = "postgres15"
  name   = "${local.name_prefix}-optimized-params"

  # Performance optimizations
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "1048576"
  }

  parameter {
    name  = "random_page_cost"
    value = "1.1"
  }

  parameter {
    name  = "wal_buffers"
    value = "16384"
  }

  tags = local.common_tags
}

# ==============================================
# Lambda Provisioned Concurrency Scheduling
# ==============================================
resource "aws_lambda_provisioned_concurrency_config" "scheduled" {
  count = var.enable_lambda_scheduling ? 1 : 0

  function_name                     = aws_lambda_function.background_worker[0].function_name
  provisioned_concurrent_executions = var.lambda_provisioned_concurrency
  qualifier                         = aws_lambda_function.background_worker[0].version
}

resource "aws_cloudwatch_event_rule" "lambda_scale_up" {
  count = var.enable_lambda_scheduling ? 1 : 0

  name                = "${local.name_prefix}-lambda-scale-up"
  description         = "Scale up Lambda during business hours"
  schedule_expression = "cron(0 8 * * MON-FRI *)"  # 8 AM UTC weekdays

  tags = local.common_tags
}

resource "aws_cloudwatch_event_rule" "lambda_scale_down" {
  count = var.enable_lambda_scheduling ? 1 : 0

  name                = "${local.name_prefix}-lambda-scale-down"
  description         = "Scale down Lambda after business hours"
  schedule_expression = "cron(0 18 * * MON-FRI *)"  # 6 PM UTC weekdays

  tags = local.common_tags
}

# ==============================================
# Cost Optimization Dashboard
# ==============================================
resource "aws_cloudwatch_dashboard" "cost_optimization" {
  dashboard_name = "${local.name_prefix}-cost-optimization"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Billing", "EstimatedCharges", "Currency", "USD"],
          ]
          period = 86400
          stat   = "Maximum"
          region = "us-east-1"
          title  = "Daily Estimated Charges"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/EC2", "CPUUtilization"],
            ["AWS/RDS", "CPUUtilization"],
            ["AWS/ElastiCache", "CPUUtilization"]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Resource Utilization"
        }
      }
    ]
  })
}

# ==============================================
# SNS Topic for Cost Notifications
# ==============================================
resource "aws_sns_topic" "cost_optimization" {
  count = var.enable_ri_optimization ? 1 : 0

  name = "${local.name_prefix}-cost-optimization"

  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "cost_email" {
  count = var.enable_ri_optimization ? length(var.cost_alert_emails) : 0

  topic_arn = aws_sns_topic.cost_optimization[0].arn
  protocol  = "email"
  endpoint  = var.cost_alert_emails[count.index]
}

# ==============================================
# Scheduled Scaling for Non-Production
# ==============================================
resource "aws_cloudwatch_event_rule" "scale_down_schedule" {
  count = var.environment != "production" && var.enable_scheduled_scaling ? 1 : 0

  name                = "${local.name_prefix}-scale-down"
  description         = "Scale down resources after hours"
  schedule_expression = "cron(0 19 * * MON-FRI *)"  # 7 PM UTC weekdays

  tags = local.common_tags
}

resource "aws_cloudwatch_event_rule" "scale_up_schedule" {
  count = var.environment != "production" && var.enable_scheduled_scaling ? 1 : 0

  name                = "${local.name_prefix}-scale-up"
  description         = "Scale up resources for business hours"
  schedule_expression = "cron(0 8 * * MON-FRI *)"  # 8 AM UTC weekdays

  tags = local.common_tags
}

# ==============================================
# Outputs
# ==============================================
output "monthly_budget_name" {
  description = "Name of the monthly budget"
  value       = aws_budgets_budget.monthly_cost.name
}

output "cost_anomaly_detector_arn" {
  description = "ARN of the cost anomaly detector"
  value       = aws_ce_anomaly_detector.service_monitor.arn
}

output "spot_autoscaling_group_arn" {
  description = "ARN of the Spot instance autoscaling group"
  value       = var.use_spot_instances ? aws_autoscaling_group.spot_asg[0].arn : null
}

output "cost_optimization_dashboard_url" {
  description = "URL of the cost optimization dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.cost_optimization.dashboard_name}"
}