import { DatabaseManager } from './database';
import * as crypto from 'crypto';

async function testLogin() {
  const db = new DatabaseManager();
  await db.init();
  
  const admin = db.getUser('admin');
  console.log('\nAdmin user from database:');
  console.log(admin);
  
  const testPassword = 'admin123';
  const hashedPassword = crypto.createHash('sha256').update(testPassword).digest('hex');
  
  console.log('\nPassword comparison:');
  console.log('Test password:', testPassword);
  console.log('Hashed test password:', hashedPassword);
  console.log('Stored password hash:', admin?.password);
  console.log('Passwords match:', hashedPassword === admin?.password);
  console.log('GUI enabled:', admin?.guiEnabled);
  
  // Test verifyPassword method
  const verified = db.verifyPassword('admin', 'admin123');
  console.log('\nverifyPassword result:', verified);
}

testLogin().catch(console.error);
