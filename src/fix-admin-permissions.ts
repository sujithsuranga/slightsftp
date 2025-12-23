import { DatabaseManager } from './database';
import * as path from 'path';

async function fixAdminPermissions() {
  const dbPath = path.join(process.cwd(), 'config.db');
  const db = new DatabaseManager(dbPath);
  await db.init();

  console.log('=== Fixing Admin User Virtual Path ===\n');

  // Get admin user
  const admin = db.getUser('admin');
  if (!admin) {
    console.error('Admin user not found!');
    db.close();
    return;
  }

  console.log(`Found admin user (ID: ${admin.id})`);

  // Check if admin already has virtual paths
  const existingVPaths = db.getVirtualPaths(admin.id!);
  console.log(`Admin currently has ${existingVPaths.length} virtual paths`);

  if (existingVPaths.length === 0) {
    // Add default virtual path for admin with full permissions
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

    console.log(`\n✓ Added virtual path "/" -> "${ftpRoot}" with full permissions`);
  } else {
    console.log('\nExisting virtual paths:');
    existingVPaths.forEach((vp: any, i: number) => {
      console.log(`\n${i + 1}. Virtual Path: ${vp.virtualPath}`);
      console.log(`   Local Path: ${vp.localPath}`);
      console.log(`   Permissions: Read=${vp.canRead}, Write=${vp.canWrite}, List=${vp.canList}`);
      console.log(`   Create=${vp.canCreateDir}, Delete=${vp.canDelete}, Rename=${vp.canRename}`);
      
      // Update to grant full permissions
      if (!vp.canRead || !vp.canList) {
        console.log(`\n   ⚠️  Updating to grant full permissions...`);
        db.updateVirtualPath({
          id: vp.id,
          userId: admin.id!,
          virtualPath: vp.virtualPath,
          localPath: vp.localPath,
          canRead: true,
          canWrite: true,
          canAppend: true,
          canDelete: true,
          canList: true,
          canCreateDir: true,
          canRename: true,
          applyToSubdirs: true
        });
        console.log(`   ✓ Updated successfully!`);
      }
    });
  }

  db.close();
  console.log('\n✓ Done!\n');
}

fixAdminPermissions().catch(console.error);
