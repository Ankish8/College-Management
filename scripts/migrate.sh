#!/bin/bash

# Database Migration Script for College Management System
# Handles multi-tenant migrations with rollback capabilities

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/../logs/migration.log"

# Migration configuration
MIGRATION_MODE="${MIGRATION_MODE:-deploy}"  # deploy, rollback, preview
TARGET_MIGRATION="${TARGET_MIGRATION:-}"    # Specific migration to target
DRY_RUN="${DRY_RUN:-false}"                # Preview mode
TENANT_ISOLATION="${TENANT_ISOLATION:-schema}"  # schema, database, cluster
TENANT_LIST="${TENANT_LIST:-}"             # Comma-separated list of tenants
BACKUP_BEFORE_MIGRATION="${BACKUP_BEFORE_MIGRATION:-true}"
PARALLEL_MIGRATIONS="${PARALLEL_MIGRATIONS:-false}"
MAX_PARALLEL_JOBS="${MAX_PARALLEL_JOBS:-4}"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Wait for database to be ready
wait_for_database() {
    local max_attempts=30
    local attempt=1
    
    log "Waiting for database connection..."
    
    while [[ $attempt -le $max_attempts ]]; do
        if pg_isready -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" &>/dev/null; then
            log "Database connection established"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts failed, waiting..."
        sleep 5
        ((attempt++))
    done
    
    error_exit "Database connection failed after $max_attempts attempts"
}

# Check if migration is needed
check_migration_status() {
    local database="$1"
    local tenant_schema="${2:-}"
    
    log "Checking migration status for database: $database${tenant_schema:+ (schema: $tenant_schema)}"
    
    # Set schema search path if using schema isolation
    local schema_path=""
    if [[ -n "$tenant_schema" ]]; then
        schema_path="-c search_path=$tenant_schema,public"
    fi
    
    # Check if Prisma migration table exists
    local table_exists
    table_exists=$(psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -d "$database" $schema_path -t -c "
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = '_prisma_migrations'
            ${tenant_schema:+AND table_schema = '$tenant_schema'}
        );
    " 2>/dev/null | tr -d ' ')
    
    if [[ "$table_exists" == "t" ]]; then
        # Get current migration status
        local pending_migrations
        pending_migrations=$(psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -d "$database" $schema_path -t -c "
            SELECT COUNT(*) FROM _prisma_migrations 
            WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL;
        " 2>/dev/null | tr -d ' ')
        
        if [[ "$pending_migrations" -gt 0 ]]; then
            log "Found $pending_migrations pending migrations"
            return 1
        else
            log "All migrations are up to date"
            return 0
        fi
    else
        log "Migration table not found, initial migration needed"
        return 1
    fi
}

# Create backup before migration
create_pre_migration_backup() {
    local database="$1"
    local tenant_name="${2:-}"
    
    if [[ "$BACKUP_BEFORE_MIGRATION" == "true" ]]; then
        log "Creating pre-migration backup..."
        
        local timestamp=$(date '+%Y%m%d_%H%M%S')
        local backup_file="/tmp/pre_migration_${database}${tenant_name:+_$tenant_name}_${timestamp}.sql"
        
        if [[ -n "$tenant_name" ]] && [[ "$TENANT_ISOLATION" == "schema" ]]; then
            pg_dump -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" \
                --schema="tenant_${tenant_name}" \
                --verbose --no-password \
                "$database" > "$backup_file"
        else
            pg_dump -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" \
                --verbose --no-password \
                "$database" > "$backup_file"
        fi
        
        gzip "$backup_file"
        log "Pre-migration backup created: ${backup_file}.gz"
    fi
}

# Setup tenant schema
setup_tenant_schema() {
    local database="$1"
    local tenant_name="$2"
    local schema_name="tenant_${tenant_name}"
    
    log "Setting up tenant schema: $schema_name"
    
    # Create schema if it doesn't exist
    psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -d "$database" -c "
        CREATE SCHEMA IF NOT EXISTS $schema_name;
    " || error_exit "Failed to create schema: $schema_name"
    
    # Grant permissions
    psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -d "$database" -c "
        GRANT USAGE ON SCHEMA $schema_name TO ${PGUSER:-postgres};
        GRANT CREATE ON SCHEMA $schema_name TO ${PGUSER:-postgres};
    " || log "Warning: Could not grant schema permissions"
}

# Run migration for a single tenant/database
run_migration() {
    local database="$1"
    local tenant_name="${2:-}"
    local operation="${3:-deploy}"
    
    log "Running migration for database: $database${tenant_name:+ (tenant: $tenant_name)}"
    
    # Create backup if needed
    create_pre_migration_backup "$database" "$tenant_name"
    
    # Setup environment variables for Prisma
    export DATABASE_URL="postgresql://${PGUSER:-postgres}:${PGPASSWORD:-}@${PGHOST:-localhost}:${PGPORT:-5432}/$database"
    
    # Add schema to URL if using schema isolation
    if [[ -n "$tenant_name" ]] && [[ "$TENANT_ISOLATION" == "schema" ]]; then
        setup_tenant_schema "$database" "$tenant_name"
        export DATABASE_URL="${DATABASE_URL}?schema=tenant_${tenant_name}"
    fi
    
    # Run appropriate migration command
    case "$operation" in
        "deploy")
            if [[ "$DRY_RUN" == "true" ]]; then
                log "DRY RUN: Would run migration deploy"
                npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma
            else
                log "Deploying migrations..."
                npx prisma migrate deploy
            fi
            ;;
        "rollback")
            if [[ -n "$TARGET_MIGRATION" ]]; then
                log "Rolling back to migration: $TARGET_MIGRATION"
                if [[ "$DRY_RUN" == "true" ]]; then
                    log "DRY RUN: Would rollback to $TARGET_MIGRATION"
                else
                    # Prisma doesn't have built-in rollback, need custom implementation
                    rollback_to_migration "$database" "$tenant_name" "$TARGET_MIGRATION"
                fi
            else
                error_exit "TARGET_MIGRATION must be specified for rollback"
            fi
            ;;
        "preview")
            log "Previewing migration changes..."
            npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma
            ;;
        *)
            error_exit "Unknown migration operation: $operation"
            ;;
    esac
    
    # Verify migration
    if [[ "$operation" == "deploy" ]] && [[ "$DRY_RUN" == "false" ]]; then
        verify_migration "$database" "$tenant_name"
    fi
    
    log "Migration completed for database: $database${tenant_name:+ (tenant: $tenant_name)}"
}

# Custom rollback implementation
rollback_to_migration() {
    local database="$1"
    local tenant_name="${2:-}"
    local target_migration="$3"
    
    log "Rolling back to migration: $target_migration"
    
    # This is a simplified rollback - in production, you'd want more sophisticated logic
    local schema_path=""
    if [[ -n "$tenant_name" ]]; then
        schema_path="-c search_path=tenant_${tenant_name},public"
    fi
    
    # Mark migrations after target as rolled back
    psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -d "$database" $schema_path -c "
        UPDATE _prisma_migrations 
        SET rolled_back_at = NOW() 
        WHERE migration_name > '$target_migration' 
        AND rolled_back_at IS NULL;
    " || error_exit "Failed to mark migrations as rolled back"
    
    log "Rollback completed to migration: $target_migration"
    log "WARNING: Schema changes were not actually reverted. Manual intervention may be required."
}

# Verify migration success
verify_migration() {
    local database="$1"
    local tenant_name="${2:-}"
    
    log "Verifying migration for database: $database${tenant_name:+ (tenant: $tenant_name)}"
    
    # Check migration status
    if ! check_migration_status "$database" "${tenant_name:+tenant_$tenant_name}"; then
        error_exit "Migration verification failed - pending migrations found"
    fi
    
    # Run basic connectivity test
    export DATABASE_URL="postgresql://${PGUSER:-postgres}:${PGPASSWORD:-}@${PGHOST:-localhost}:${PGPORT:-5432}/$database"
    if [[ -n "$tenant_name" ]] && [[ "$TENANT_ISOLATION" == "schema" ]]; then
        export DATABASE_URL="${DATABASE_URL}?schema=tenant_${tenant_name}"
    fi
    
    # Test database connectivity with Prisma
    if ! npx prisma db execute --stdin <<< "SELECT 1;" &>/dev/null; then
        error_exit "Migration verification failed - database connectivity test failed"
    fi
    
    log "Migration verification successful"
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
                    -d "${PGDATABASE:-college_management}" \
                    -t -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';" | \
                    sed 's/^ *//' | sed 's/ *$//' | sed 's/tenant_//' | grep -v '^$'
            fi
            ;;
        "database")
            if [[ -n "$TENANT_LIST" ]]; then
                echo "$TENANT_LIST" | tr ',' '\n'
            else
                # Auto-discover tenant databases
                psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" \
                    -d "postgres" \
                    -t -c "SELECT datname FROM pg_database WHERE datname LIKE 'tenant_%';" | \
                    sed 's/^ *//' | sed 's/ *$//' | sed 's/tenant_//' | grep -v '^$'
            fi
            ;;
        "cluster")
            echo "shared"
            ;;
    esac
}

# Run migrations in parallel
run_parallel_migrations() {
    local tenants=("$@")
    local pids=()
    local max_jobs=${MAX_PARALLEL_JOBS}
    local current_jobs=0
    
    log "Running migrations in parallel (max jobs: $max_jobs)"
    
    for tenant in "${tenants[@]}"; do
        # Wait if we've reached max parallel jobs
        while [[ $current_jobs -ge $max_jobs ]]; do
            wait_for_job_completion pids[@] current_jobs
        done
        
        # Start migration in background
        (
            if [[ "$TENANT_ISOLATION" == "schema" ]]; then
                run_migration "${PGDATABASE:-college_management}" "$tenant" "$MIGRATION_MODE"
            elif [[ "$TENANT_ISOLATION" == "database" ]]; then
                run_migration "tenant_$tenant" "$tenant" "$MIGRATION_MODE"
            else
                run_migration "${PGDATABASE:-college_management}" "$tenant" "$MIGRATION_MODE"
            fi
        ) &
        
        pids+=($!)
        ((current_jobs++))
        log "Started migration for tenant: $tenant (PID: ${pids[-1]})"
    done
    
    # Wait for all remaining jobs
    for pid in "${pids[@]}"; do
        if wait "$pid"; then
            log "Migration completed successfully (PID: $pid)"
        else
            log "Migration failed (PID: $pid)"
        fi
    done
}

# Wait for job completion
wait_for_job_completion() {
    local -n pids_ref=$1
    local -n current_jobs_ref=$2
    
    for i in "${!pids_ref[@]}"; do
        local pid=${pids_ref[$i]}
        if ! kill -0 "$pid" 2>/dev/null; then
            # Job completed
            unset pids_ref[$i]
            ((current_jobs_ref--))
            break
        fi
    done
    
    # Reindex array to remove gaps
    pids_ref=("${pids_ref[@]}")
}

# Generate migration
generate_migration() {
    local migration_name="${1:-auto_generated_$(date +%Y%m%d_%H%M%S)}"
    
    log "Generating new migration: $migration_name"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would generate migration named '$migration_name'"
        npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma
    else
        npx prisma migrate dev --name "$migration_name"
    fi
}

# Main migration function
main() {
    local start_time=$(date +%s)
    
    log "=== Starting migration process ==="
    log "Migration mode: $MIGRATION_MODE"
    log "Tenant isolation: $TENANT_ISOLATION"
    log "Dry run: $DRY_RUN"
    log "Parallel migrations: $PARALLEL_MIGRATIONS"
    
    # Wait for database
    wait_for_database
    
    # Handle different migration modes
    case "$MIGRATION_MODE" in
        "generate")
            generate_migration "$TARGET_MIGRATION"
            ;;
        "deploy"|"rollback"|"preview")
            # Get tenant list
            local tenants=($(get_tenant_list))
            log "Found ${#tenants[@]} tenants: ${tenants[*]}"
            
            if [[ ${#tenants[@]} -eq 0 ]]; then
                log "No tenants found, running migration on main database"
                tenants=("main")
            fi
            
            # Run migrations
            if [[ "$PARALLEL_MIGRATIONS" == "true" ]] && [[ ${#tenants[@]} -gt 1 ]]; then
                run_parallel_migrations "${tenants[@]}"
            else
                for tenant in "${tenants[@]}"; do
                    if [[ "$tenant" == "main" ]] || [[ "$TENANT_ISOLATION" == "cluster" ]]; then
                        run_migration "${PGDATABASE:-college_management}" "" "$MIGRATION_MODE"
                    elif [[ "$TENANT_ISOLATION" == "schema" ]]; then
                        run_migration "${PGDATABASE:-college_management}" "$tenant" "$MIGRATION_MODE"
                    else
                        run_migration "tenant_$tenant" "$tenant" "$MIGRATION_MODE"
                    fi
                done
            fi
            ;;
        *)
            error_exit "Unknown migration mode: $MIGRATION_MODE"
            ;;
    esac
    
    # Calculate statistics
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "=== Migration process completed ==="
    log "Duration: ${duration}s"
    log "Mode: $MIGRATION_MODE"
    log "Tenants processed: ${#tenants[@]}"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --mode)
                MIGRATION_MODE="$2"
                shift 2
                ;;
            --target)
                TARGET_MIGRATION="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --parallel)
                PARALLEL_MIGRATIONS="true"
                shift
                ;;
            --tenant-isolation)
                TENANT_ISOLATION="$2"
                shift 2
                ;;
            --tenants)
                TENANT_LIST="$2"
                shift 2
                ;;
            *)
                error_exit "Unknown argument: $1"
                ;;
        esac
    done
    
    # Run main function
    main "$@"
fi