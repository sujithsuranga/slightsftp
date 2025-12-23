import { DatabaseManager } from './database';
import { ServerManager } from './server-manager';
import { WebServer } from './web-server';
import logger from './logger';

// Initialize database and server manager
const db = new DatabaseManager();  // Use default config.db
const serverManager = new ServerManager(db);

// Web server port (can be configured)
const WEB_PORT = process.env.WEB_PORT ? parseInt(process.env.WEB_PORT) : 3000;

console.log('🚀 Starting SLightSFTP Server with Web GUI...\n');

// Initialize database asynchronously
(async () => {
  try {
    await db.init();
    logger.info('📊 Database initialized');
    
    // Ensure admin user exists
    const adminUser = db.getUser('admin');
    if (!adminUser) {
      const crypto = require('crypto');
      const hashedPassword = crypto.createHash('sha256').update('admin123').digest('hex');
      db.createUser({
        username: 'admin',
        password: hashedPassword,
        passwordEnabled: true,
        publicKey: '',
        guiEnabled: true
      });
      logger.info('👤 Created default admin user (username: admin, password: admin123)');
    } else {
      logger.info('👤 Admin user already exists');
    }
    
    logger.info('🔑 Default users available for testing');
    
    // Get all listeners and start them
    const listeners = db.getAllListeners();
    logger.info(`📡 Found ${listeners.length} listener(s) configured`);
  
    if (listeners.length === 0) {
      logger.warn('⚠️  No listeners configured in database');
      logger.info('💡 The test database should auto-create listeners on first run');
    }
  
    // Start all enabled listeners
    await serverManager.startAllEnabledListeners();
    
    // Start web GUI server
    const webServer = new WebServer(db, serverManager, WEB_PORT);
    await webServer.start();
    
    logger.info('🎯 Server is ready!');
    logger.info(`🌐 Access the Web GUI at: http://localhost:${WEB_PORT}`);
    logger.info('⏹️  Press Ctrl+C to stop the server\n');
    
    // Graceful shutdown
    const shutdown = async () => {
      logger.info('\n🛑 Shutting down servers...');
      
      try {
        await webServer.stop();
        logger.info('✅ Web server stopped');
      } catch (err: any) {
        logger.error('❌ Error stopping web server:', err.message);
      }
      
      await serverManager.stopAllListeners();
      logger.info('✅ All FTP/SFTP servers stopped');
      
      logger.info('👋 Goodbye!\n');
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
  } catch (error: any) {
    logger.error('❌ Failed to initialize:', error.message);
    process.exit(1);
  }
})();
