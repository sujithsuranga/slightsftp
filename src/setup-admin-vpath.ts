import { DatabaseManager } from './database';
import * as path from 'path';

async function setupAdminVirtualPath() {
  const dbPath = path.join(process.cwd(), 'config.db');
  const db = new DatabaseManager(dbPath);
  await db.init();

  const admin = db.getUser('admin');
  if (!admin) {
    console.error('Admin user not found!');
    db.close();
    return;
  }

  // Check if admin already has virtual paths
  const existingVPaths = db.getVirtualPaths(admin.id!);
  
  if (existingVPaths.length === 0) {
    const ftpRoot = path.join(process.cwd(), 'ftp-root');
    
    db.addVirtualPath({
      userId: admin.id!,
      virtualPath: '/',
      localPath: ftpRoot,
      canRead: true,
      canWrite: true,
      canAppend: true,
      canDelete: true,
      canList: true,
      canCreateDir: true,
      canRename: true,
      applyToSubdirs: true
    });

    console.log(`✓ Added virtual path "/" -> "${ftpRoot}" with full permissions for admin`);
  } else {
    console.log('Admin already has virtual paths configured');
  }

  db.close();
}

setupAdminVirtualPath().catch(console.error);
