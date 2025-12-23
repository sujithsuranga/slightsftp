import { DatabaseManager } from './database';

async function fixAdminGuiAccess() {
  const db = new DatabaseManager();
  await db.init();
  
  const admin = db.getUser('admin');
  if (admin) {
    console.log('Current admin user:', admin);
    
    // Reset password to admin123 (pass plaintext, updateUser will hash it)
    db.updateUser('admin', {
      password: 'admin123',
      passwordEnabled: true,
      publicKey: admin.publicKey,
      guiEnabled: true
    });
    
    const updatedAdmin = db.getUser('admin');
    console.log('Updated admin user:', updatedAdmin);
    console.log('✓ Admin password reset to: admin123');
    console.log('✓ Admin GUI access enabled!');
  } else {
    console.log('Admin user not found');
  }
}

fixAdminGuiAccess().catch(console.error);
