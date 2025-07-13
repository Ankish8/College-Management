#!/bin/bash

# Database Backup Script for College Management System
# Supports multi-tenant backup strategies with encryption and validation

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/../config/backup.conf"
LOG_FILE="${SCRIPT_DIR}/../logs/backup.log"

# Default configuration (can be overridden by config file)
BACKUP_TYPE="${BACKUP_TYPE:-full}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-6}"
ENCRYPTION_ENABLED="${ENCRYPTION_ENABLED:-true}"
VERIFY_BACKUP="${VERIFY_BACKUP:-true}"
PARALLEL_JOBS="${PARALLEL_JOBS:-4}"
BACKUP_DIR="${BACKUP_DIR:-/backup}"
S3_BUCKET="${S3_BUCKET:-}"
NOTIFICATION_WEBHOOK="${NOTIFICATION_WEBHOOK:-}"

# Multi-tenant configuration
TENANT_ISOLATION="${TENANT_ISOLATION:-schema}"  # schema, database, cluster
TENANT_LIST="${TENANT_LIST:-}"  # Comma-separated list of tenants

# Load configuration file if it exists
if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
fi

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    send_notification "FAILED" "$1"
    exit 1
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "$NOTIFICATION_WEBHOOK" ]]; then
        curl -X POST "$NOTIFICATION_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"Backup $status: $message\"}" \
            2>/dev/null || true
    fi
}

# Validate environment
validate_environment() {
    log "Validating environment..."
    
    # Check required commands
    local required_commands=("pg_dump" "pg_dumpall" "gzip" "openssl")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error_exit "Required command '$cmd' not found"
        fi
    done
    
    # Check database connection
    if ! pg_isready -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}"; then
        error_exit "Cannot connect to PostgreSQL database"
    fi
    
    log "Environment validation successful"
}

# Generate encryption key
generate_encryption_key() {
    local key_file="$1"
    if [[ ! -f "$key_file" ]]; then
        openssl rand -base64 32 > "$key_file"
        chmod 600 "$key_file"
        log "Generated new encryption key: $key_file"
    fi
}

# Encrypt backup file
encrypt_file() {
    local input_file="$1"
    local output_file="$2"
    local key_file="$3"
    
    if [[ "$ENCRYPTION_ENABLED" == "true" ]]; then
        openssl enc -aes-256-cbc -salt -in "$input_file" -out "$output_file" -pass file:"$key_file"
        rm "$input_file"
        log "Encrypted backup: $output_file"
    else
        mv "$input_file" "$output_file"
    fi
}

# Backup single database
backup_database() {
    local db_name="$1"
    local tenant_name="${2:-}"
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    
    if [[ -n "$tenant_name" ]]; then
        local backup_filename="backup_${tenant_name}_${db_name}_${timestamp}.sql"
    else
        local backup_filename="backup_${db_name}_${timestamp}.sql"
    fi
    
    local backup_path="$BACKUP_DIR/$backup_filename"
    local compressed_path="${backup_path}.gz"
    local final_path="$compressed_path"
    
    log "Starting backup for database: $db_name (tenant: ${tenant_name:-'N/A'})"
    
    # Perform backup based on isolation level
    case "$TENANT_ISOLATION" in
        "schema")
            if [[ -n "$tenant_name" ]]; then
                pg_dump -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" \
                    --schema="tenant_${tenant_name}" \
                    --verbose --no-password \
                    "$db_name" > "$backup_path"
            else
                pg_dump -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" \
                    --verbose --no-password \
                    "$db_name" > "$backup_path"
            fi
            ;;
        "database")
            pg_dump -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" \
                --verbose --no-password \
                "$db_name" > "$backup_path"
            ;;
        "cluster")
            pg_dumpall -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" \
                --verbose --no-password > "$backup_path"
            ;;
    esac
    
    # Compress backup
    gzip -"$COMPRESSION_LEVEL" "$backup_path"
    log "Compressed backup: $compressed_path"
    
    # Encrypt if enabled
    if [[ "$ENCRYPTION_ENABLED" == "true" ]]; then
        local key_file="$BACKUP_DIR/.encryption_key"
        generate_encryption_key "$key_file"
        final_path="${compressed_path}.enc"
        encrypt_file "$compressed_path" "$final_path" "$key_file"
    fi
    
    # Verify backup
    if [[ "$VERIFY_BACKUP" == "true" ]]; then
        verify_backup "$final_path"
    fi
    
    # Upload to S3 if configured
    if [[ -n "$S3_BUCKET" ]]; then
        upload_to_s3 "$final_path"
    fi
    
    log "Backup completed: $final_path"
    echo "$final_path"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    log "Verifying backup: $backup_file"
    
    # Check file exists and is not empty
    if [[ ! -f "$backup_file" ]] || [[ ! -s "$backup_file" ]]; then
        error_exit "Backup file is missing or empty: $backup_file"
    fi
    
    # Verify compression (if not encrypted)
    if [[ "$backup_file" == *.gz ]] && [[ "$backup_file" != *.enc ]]; then
        if ! gzip -t "$backup_file"; then
            error_exit "Backup file is corrupted: $backup_file"
        fi
    fi
    
    # Verify encryption (if enabled)
    if [[ "$backup_file" == *.enc ]]; then
        local key_file="$BACKUP_DIR/.encryption_key"
        local temp_file="/tmp/verify_$(basename "$backup_file").tmp"
        
        if ! openssl enc -aes-256-cbc -d -in "$backup_file" -out "$temp_file" -pass file:"$key_file" 2>/dev/null; then
            rm -f "$temp_file"
            error_exit "Cannot decrypt backup file: $backup_file"
        fi
        
        if [[ "$temp_file" == *.gz ]]; then
            if ! gzip -t "$temp_file"; then
                rm -f "$temp_file"
                error_exit "Decrypted backup file is corrupted: $backup_file"
            fi
        fi
        
        rm -f "$temp_file"
    fi
    
    log "Backup verification successful: $backup_file"
}

# Upload backup to S3
upload_to_s3() {
    local backup_file="$1"
    local s3_key="backups/$(basename "$backup_file")"
    
    log "Uploading backup to S3: s3://$S3_BUCKET/$s3_key"
    
    if command -v aws &> /dev/null; then
        aws s3 cp "$backup_file" "s3://$S3_BUCKET/$s3_key" \
            --storage-class STANDARD_IA \
            --server-side-encryption AES256
        log "Upload completed: s3://$S3_BUCKET/$s3_key"
    else
        log "WARNING: AWS CLI not found, skipping S3 upload"
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Local cleanup
    find "$BACKUP_DIR" -name "backup_*.sql.gz*" -type f -mtime +"$RETENTION_DAYS" -delete
    
    # S3 cleanup (if configured)
    if [[ -n "$S3_BUCKET" ]] && command -v aws &> /dev/null; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" '+%Y-%m-%d')
        aws s3 ls "s3://$S3_BUCKET/backups/" --recursive | \
        awk -v cutoff="$cutoff_date" '$1 < cutoff {print $4}' | \
        while read -r key; do
            aws s3 rm "s3://$S3_BUCKET/$key"
            log "Deleted old S3 backup: s3://$S3_BUCKET/$key"
        done
    fi
    
    log "Cleanup completed"
}

# Get tenant list
get_tenant_list() {
    case "$TENANT_ISOLATION" in
        "schema")
            if [[ -n "$TENANT_LIST" ]]; then
                echo "$TENANT_LIST" | tr ',' '\n'
            else
                # Auto-discover tenant schemas
                psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" \
                    -d "${PGDATABASE:-postgres}" \
                    -t -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';" | \
                    sed 's/^ *//' | sed 's/ *$//' | sed 's/tenant_//'
            fi
            ;;
        "database")
            if [[ -n "$TENANT_LIST" ]]; then
                echo "$TENANT_LIST" | tr ',' '\n'
            else
                # Auto-discover tenant databases
                psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" \
                    -d "${PGDATABASE:-postgres}" \
                    -t -c "SELECT datname FROM pg_database WHERE datname LIKE 'tenant_%';" | \
                    sed 's/^ *//' | sed 's/ *$//' | sed 's/tenant_//'
            fi
            ;;
        "cluster")
            echo "shared"
            ;;
    esac
}

# Main backup function
main() {
    local start_time=$(date +%s)
    
    log "=== Starting backup process ==="
    log "Backup type: $BACKUP_TYPE"
    log "Tenant isolation: $TENANT_ISOLATION"
    log "Retention days: $RETENTION_DAYS"
    log "Encryption enabled: $ENCRYPTION_ENABLED"
    
    # Validate environment
    validate_environment
    
    # Get tenant list
    local tenants=($(get_tenant_list))
    log "Found ${#tenants[@]} tenants: ${tenants[*]}"
    
    # Perform backups
    local backup_files=()
    
    case "$BACKUP_TYPE" in
        "full")
            if [[ "$TENANT_ISOLATION" == "cluster" ]]; then
                # Backup entire cluster
                backup_files+=($(backup_database "ALL" "shared"))
            else
                # Backup each tenant
                for tenant in "${tenants[@]}"; do
                    if [[ "$TENANT_ISOLATION" == "schema" ]]; then
                        backup_files+=($(backup_database "${PGDATABASE:-college_management}" "$tenant"))
                    else
                        backup_files+=($(backup_database "tenant_$tenant" "$tenant"))
                    fi
                done
            fi
            ;;
        "incremental")
            log "Incremental backups not yet implemented"
            error_exit "Incremental backup type not supported"
            ;;
        *)
            error_exit "Unknown backup type: $BACKUP_TYPE"
            ;;
    esac
    
    # Clean old backups
    cleanup_old_backups
    
    # Calculate and log statistics
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local total_size=0
    
    for file in "${backup_files[@]}"; do
        if [[ -f "$file" ]]; then
            local file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
            total_size=$((total_size + file_size))
        fi
    done
    
    log "=== Backup process completed ==="
    log "Duration: ${duration}s"
    log "Files created: ${#backup_files[@]}"
    log "Total size: $(numfmt --to=iec $total_size)"
    log "Backup files: ${backup_files[*]}"
    
    send_notification "SUCCESS" "Backup completed in ${duration}s, ${#backup_files[@]} files created"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Check if running in container
    if [[ -f /.dockerenv ]]; then
        # Wait for database to be ready
        until pg_isready -h "${PGHOST:-postgres}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}"; do
            log "Waiting for database to be ready..."
            sleep 5
        done
    fi
    
    # Run main function
    main "$@"
fi