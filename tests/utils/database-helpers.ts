import { execSync } from 'child_process';
import path from 'path';

export class DatabaseHelper {
  private projectRoot: string;

  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
  }

  async resetDatabase() {
    console.log('🔄 Resetting database...');
    try {
      execSync('npm run db:reset', {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: this.projectRoot,
        timeout: 60000
      });
      console.log('✅ Database reset completed');
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      throw error;
    }
  }

  async seedDatabase() {
    console.log('🌱 Seeding database...');
    try {
      execSync('npm run db:seed', {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: this.projectRoot,
        timeout: 60000
      });
      console.log('✅ Database seeding completed');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  async backupDatabase() {
    console.log('💾 Creating database backup...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.projectRoot, `test-results/db-backup-${timestamp}.db`);
    
    try {
      execSync(`cp ${path.join(this.projectRoot, 'prisma/dev.db')} ${backupPath}`, {
        stdio: 'ignore',
        timeout: 10000
      });
      console.log(`✅ Database backed up to ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('❌ Database backup failed:', error);
      throw error;
    }
  }

  async restoreDatabase(backupPath: string) {
    console.log(`📤 Restoring database from ${backupPath}...`);
    try {
      execSync(`cp ${backupPath} ${path.join(this.projectRoot, 'prisma/dev.db')}`, {
        stdio: 'ignore',
        timeout: 10000
      });
      console.log('✅ Database restore completed');
    } catch (error) {
      console.error('❌ Database restore failed:', error);
      throw error;
    }
  }

  async verifyDatabaseState() {
    console.log('🔍 Verifying database state...');
    try {
      // Run a simple query to verify database connectivity
      const result = execSync('npx prisma db pull --print', {
        cwd: this.projectRoot,
        encoding: 'utf8',
        timeout: 10000
      });
      console.log('✅ Database is accessible');
      return true;
    } catch (error) {
      console.error('❌ Database verification failed:', error);
      return false;
    }
  }

  async cleanupTestData() {
    console.log('🧹 Cleaning up test data...');
    // This would typically run cleanup SQL commands
    // For now, we'll just reset the database
    await this.resetDatabase();
  }
}