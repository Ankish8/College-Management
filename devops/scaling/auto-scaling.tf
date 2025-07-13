# Auto Scaling Configuration for College Management System
# Comprehensive scaling strategy for high availability and performance

# ==============================================
# ECS Service Auto Scaling
# ==============================================
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = var.app_max_capacity
  min_capacity       = var.app_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = local.common_tags
}

# CPU-based scaling policy
resource "aws_appautoscaling_policy" "ecs_cpu_scaling" {
  name               = "${local.name_prefix}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.cpu_target_value
    scale_out_cooldown = var.scale_out_cooldown
    scale_in_cooldown  = var.scale_in_cooldown
  }

  depends_on = [aws_appautoscaling_target.ecs_target]
}

# Memory-based scaling policy
resource "aws_appautoscaling_policy" "ecs_memory_scaling" {
  name               = "${local.name_prefix}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.memory_target_value
    scale_out_cooldown = var.scale_out_cooldown
    scale_in_cooldown  = var.scale_in_cooldown
  }

  depends_on = [aws_appautoscaling_target.ecs_target]
}

# Request count-based scaling policy
resource "aws_appautoscaling_policy" "ecs_request_count_scaling" {
  name               = "${local.name_prefix}-request-count-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.app.arn_suffix}"
    }
    target_value       = var.request_count_target_value
    scale_out_cooldown = var.scale_out_cooldown
    scale_in_cooldown  = var.scale_in_cooldown
  }

  depends_on = [aws_appautoscaling_target.ecs_target]
}

# Custom metric scaling for business logic
resource "aws_appautoscaling_policy" "ecs_custom_metric_scaling" {
  count = var.enable_custom_metrics_scaling ? 1 : 0

  name               = "${local.name_prefix}-custom-metric-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    customized_metric_specification {
      metric_name = "ActiveUsers"
      namespace   = "CMS/Application"
      statistic   = "Average"
      
      dimensions = {
        Environment = var.environment
      }
    }
    target_value       = var.custom_metric_target_value
    scale_out_cooldown = var.scale_out_cooldown
    scale_in_cooldown  = var.scale_in_cooldown
  }

  depends_on = [aws_appautoscaling_target.ecs_target]
}

# ==============================================
# Database Auto Scaling (Aurora/RDS)
# ==============================================
resource "aws_appautoscaling_target" "rds_target" {
  count = var.enable_rds_scaling ? 1 : 0

  max_capacity       = var.rds_max_capacity
  min_capacity       = var.rds_min_capacity
  resource_id        = "cluster:${aws_rds_cluster.main[0].cluster_identifier}"
  scalable_dimension = "rds:cluster:ReadReplicaCount"
  service_namespace  = "rds"

  tags = local.common_tags
}

resource "aws_appautoscaling_policy" "rds_cpu_scaling" {
  count = var.enable_rds_scaling ? 1 : 0

  name               = "${local.name_prefix}-rds-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.rds_target[0].resource_id
  scalable_dimension = aws_appautoscaling_target.rds_target[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.rds_target[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "RDSReaderAverageCPUUtilization"
    }
    target_value       = var.rds_cpu_target_value
    scale_out_cooldown = var.rds_scale_out_cooldown
    scale_in_cooldown  = var.rds_scale_in_cooldown
  }

  depends_on = [aws_appautoscaling_target.rds_target]
}

# ==============================================
# Lambda Auto Scaling for Background Tasks
# ==============================================
resource "aws_lambda_function" "background_worker" {
  count = var.enable_lambda_workers ? 1 : 0

  filename         = "background_worker.zip"
  function_name    = "${local.name_prefix}-background-worker"
  role            = aws_iam_role.lambda_worker[0].arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.background_worker[0].output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 300
  memory_size     = 512

  reserved_concurrent_executions = var.lambda_max_concurrency

  environment {
    variables = {
      DATABASE_URL = aws_secretsmanager_secret.database_url.arn
      REDIS_URL    = aws_secretsmanager_secret.redis_url.arn
      ENVIRONMENT  = var.environment
    }
  }

  dead_letter_config {
    target_arn = aws_sqs_queue.dlq[0].arn
  }

  tags = local.common_tags
}

data "archive_file" "background_worker" {
  count = var.enable_lambda_workers ? 1 : 0

  type        = "zip"
  output_path = "background_worker.zip"
  source {
    content = templatefile("${path.module}/lambda/background-worker.js", {
      region = var.aws_region
    })
    filename = "index.js"
  }
}

resource "aws_iam_role" "lambda_worker" {
  count = var.enable_lambda_workers ? 1 : 0

  name = "${local.name_prefix}-lambda-worker"

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

resource "aws_iam_role_policy_attachment" "lambda_worker_basic" {
  count = var.enable_lambda_workers ? 1 : 0

  role       = aws_iam_role.lambda_worker[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ==============================================
# SQS for Asynchronous Processing
# ==============================================
resource "aws_sqs_queue" "main" {
  count = var.enable_async_processing ? 1 : 0

  name                       = "${local.name_prefix}-main-queue"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 1209600  # 14 days
  receive_wait_time_seconds  = 20       # Long polling
  visibility_timeout_seconds = 300

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[0].arn
    maxReceiveCount     = 3
  })

  tags = local.common_tags
}

resource "aws_sqs_queue" "dlq" {
  count = var.enable_async_processing ? 1 : 0

  name                      = "${local.name_prefix}-dlq"
  message_retention_seconds = 1209600  # 14 days

  tags = merge(local.common_tags, {
    Purpose = "dead-letter-queue"
  })
}

# SQS Auto Scaling based on queue depth
resource "aws_cloudwatch_metric_alarm" "sqs_high_messages" {
  count = var.enable_async_processing ? 1 : 0

  alarm_name          = "${local.name_prefix}-sqs-high-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ApproximateNumberOfVisibleMessages"
  namespace           = "AWS/SQS"
  period              = "60"
  statistic           = "Average"
  threshold           = var.sqs_scaling_threshold
  alarm_description   = "This metric monitors SQS queue depth"

  dimensions = {
    QueueName = aws_sqs_queue.main[0].name
  }

  alarm_actions = [aws_appautoscaling_policy.lambda_scaling[0].arn]

  tags = local.common_tags
}

resource "aws_appautoscaling_target" "lambda_target" {
  count = var.enable_lambda_workers && var.enable_async_processing ? 1 : 0

  max_capacity       = var.lambda_max_concurrency
  min_capacity       = var.lambda_min_concurrency
  resource_id        = "function:${aws_lambda_function.background_worker[0].function_name}:provisioned"
  scalable_dimension = "lambda:function:ProvisionedConcurrencyUtilization"
  service_namespace  = "lambda"
}

resource "aws_appautoscaling_policy" "lambda_scaling" {
  count = var.enable_lambda_workers && var.enable_async_processing ? 1 : 0

  name               = "${local.name_prefix}-lambda-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.lambda_target[0].resource_id
  scalable_dimension = aws_appautoscaling_target.lambda_target[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.lambda_target[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "LambdaProvisionedConcurrencyUtilization"
    }
    target_value = 70.0
  }
}

# ==============================================
# ElastiCache Scaling
# ==============================================
resource "aws_elasticache_replication_group" "scalable" {
  count = var.enable_redis_scaling ? 1 : 0

  replication_group_id       = "${local.name_prefix}-redis-scalable"
  description               = "Scalable Redis cluster for session storage"

  node_type                 = var.redis_node_type
  port                      = 6379
  parameter_group_name      = aws_elasticache_parameter_group.redis[0].name

  num_cache_clusters        = var.redis_min_cache_clusters
  automatic_failover_enabled = true
  multi_az_enabled         = true

  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = local.common_tags
}

resource "aws_elasticache_parameter_group" "redis" {
  count = var.enable_redis_scaling ? 1 : 0

  family = "redis7.x"
  name   = "${local.name_prefix}-redis-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  tags = local.common_tags
}

# ==============================================
# CloudFront for Global Content Delivery
# ==============================================
resource "aws_cloudfront_distribution" "main" {
  count = var.enable_cloudfront ? 1 : 0

  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB-${aws_lb.main.name}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled         = true
  is_ipv6_enabled = true
  comment         = "College Management System CDN"

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-${aws_lb.main.name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["Host", "Authorization", "CloudFront-Forwarded-Proto"]

      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # Cache behavior for static assets
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-${aws_lb.main.name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # Cache behavior for API endpoints
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-${aws_lb.main.name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["*"]

      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  price_class = var.cloudfront_price_class

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.ssl_certificate_arn == "" ? true : false
    acm_certificate_arn           = var.ssl_certificate_arn
    ssl_support_method            = var.ssl_certificate_arn != "" ? "sni-only" : null
  }

  tags = local.common_tags
}

# ==============================================
# Performance Monitoring
# ==============================================
resource "aws_cloudwatch_dashboard" "performance" {
  dashboard_name = "${local.name_prefix}-performance"

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
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.app.name, "ClusterName", aws_ecs_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ECS Service Metrics"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix],
            [".", "TargetResponseTime", ".", "."],
            [".", "HTTPCode_Target_2XX_Count", ".", "."],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Load Balancer Metrics"
        }
      }
    ]
  })
}

# ==============================================
# Outputs
# ==============================================
output "ecs_autoscaling_target_arn" {
  description = "ARN of the ECS autoscaling target"
  value       = aws_appautoscaling_target.ecs_target.arn
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = var.enable_cloudfront ? aws_cloudfront_distribution.main[0].id : null
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = var.enable_cloudfront ? aws_cloudfront_distribution.main[0].domain_name : null
}

output "sqs_queue_url" {
  description = "URL of the SQS queue"
  value       = var.enable_async_processing ? aws_sqs_queue.main[0].url : null
}

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = var.enable_lambda_workers ? aws_lambda_function.background_worker[0].function_name : null
}