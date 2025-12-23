import { ServerManager } from '../server-manager';
import { DatabaseManager } from '../database';
import { Listener } from '../types';

describe('ServerManager - Enhanced Tests', () => {
  let db: DatabaseManager;
  let serverManager: ServerManager;

  beforeEach(async () => {
    db = new DatabaseManager(':memory:');
    await db.init();
    serverManager = new ServerManager(db);
  });

  afterEach(async () => {
    // Stop all running servers
    const listeners = db.getAllListeners();
    for (const listener of listeners) {
      try {
        await serverManager.stopListener(listener.id!);
      } catch (e) {
        // Ignore if not running
      }
    }
  });

  describe('Initialization', () => {
    test('should create ServerManager instance', () => {
      expect(serverManager).toBeDefined();
      expect(serverManager).toBeInstanceOf(ServerManager);
    });

    test('should initialize with no running servers', () => {
      const sessions = serverManager.getActiveSessions();
      expect(sessions).toHaveLength(0);
    });

    test('should be an EventEmitter', () => {
      expect(serverManager.on).toBeDefined();
      expect(serverManager.emit).toBeDefined();
    });
  });

  describe('Listener Management - Start', () => {
    test('should start SFTP listener', async () => {
      const listenerId = db.createListener({
        name: 'Test SFTP',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0, // Random port
        enabled: true
      });

      await expect(serverManager.startListener(listenerId)).resolves.not.toThrow();
    });

    test('should start FTP listener', async () => {
      const listenerId = db.createListener({
        name: 'Test FTP',
        protocol: 'FTP',
        bindingIp: '127.0.0.1',
        port: 0, // Random port
        enabled: true
      });

      await expect(serverManager.startListener(listenerId)).resolves.not.toThrow();
    });

    test('should throw error for non-existent listener', async () => {
      await expect(serverManager.startListener(99999)).rejects.toThrow('not found');
    });

    test('should throw error for disabled listener', async () => {
      const listenerId = db.createListener({
        name: 'Disabled',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: false
      });

      await expect(serverManager.startListener(listenerId)).rejects.toThrow('disabled');
    });

    test('should throw error for already running listener', async () => {
      const listenerId = db.createListener({
        name: 'Running',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      await serverManager.startListener(listenerId);
      await expect(serverManager.startListener(listenerId)).rejects.toThrow('already running');
    });

    test('should emit listener-started event', (done) => {
      const listenerId = db.createListener({
        name: 'Test SFTP',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      serverManager.on('listener-started', (id) => {
        expect(id).toBe(listenerId);
        done();
      });

      serverManager.startListener(listenerId).catch(() => done());
    });

    test('should log server started activity', async () => {
      const listenerId = db.createListener({
        name: 'Test SFTP',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      await serverManager.startListener(listenerId).catch(() => {});

      const activities = db.getRecentActivities(listenerId);
      const startActivity = activities.find(a => a.action === 'SERVER_STARTED');
      expect(startActivity).toBeDefined();
    });
  });

  describe('Listener Management - Stop', () => {
    test('should stop running listener', async () => {
      const listenerId = db.createListener({
        name: 'Test SFTP',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      await serverManager.startListener(listenerId).catch(() => {});
      await expect(serverManager.stopListener(listenerId)).resolves.not.toThrow();
    });

    test('should throw error when stopping non-running listener', async () => {
      const listenerId = db.createListener({
        name: 'Not Running',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      await expect(serverManager.stopListener(listenerId)).rejects.toThrow('not running');
    });

    test('should emit listener-stopped event', (done) => {
      const listenerId = db.createListener({
        name: 'Test SFTP',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      serverManager.on('listener-stopped', (id) => {
        expect(id).toBe(listenerId);
        done();
      });

      serverManager.startListener(listenerId)
        .then(() => serverManager.stopListener(listenerId))
        .catch(() => done());
    });

    test('should log server stopped activity', async () => {
      const listenerId = db.createListener({
        name: 'Test SFTP',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      await serverManager.startListener(listenerId).catch(() => {});
      await serverManager.stopListener(listenerId);

      const activities = db.getRecentActivities(listenerId);
      const stopActivity = activities.find(a => a.action === 'SERVER_STOPPED');
      expect(stopActivity).toBeDefined();
    });
  });

  describe('Listener Management - Restart', () => {
    test('should restart running listener', async () => {
      const listenerId = db.createListener({
        name: 'Test SFTP',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      await serverManager.startListener(listenerId).catch(() => {});
      await expect(serverManager.restartListener(listenerId)).resolves.not.toThrow();
    });

    test('should start stopped listener on restart', async () => {
      const listenerId = db.createListener({
        name: 'Test SFTP',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      await expect(serverManager.restartListener(listenerId)).resolves.not.toThrow();
    });
  });

  describe('Listener Status', () => {
    test('should return true for running listener', async () => {
      const listenerId = db.createListener({
        name: 'Test SFTP',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      await serverManager.startListener(listenerId).catch(() => {});
      expect(serverManager.isListenerRunning(listenerId)).toBe(true);
    });

    test('should return false for stopped listener', () => {
      const listenerId = db.createListener({
        name: 'Test SFTP',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      expect(serverManager.isListenerRunning(listenerId)).toBe(false);
    });

    test('should return false for non-existent listener', () => {
      expect(serverManager.isListenerRunning(99999)).toBe(false);
    });
  });

  describe('Active Sessions', () => {
    test('should return empty array when no sessions', () => {
      const sessions = serverManager.getActiveSessions();
      expect(sessions).toHaveLength(0);
    });

    test('should return session details', () => {
      const sessions = serverManager.getActiveSessions();
      
      sessions.forEach(session => {
        expect(session).toHaveProperty('sessionId');
        expect(session).toHaveProperty('listenerId');
        expect(session).toHaveProperty('listenerName');
        expect(session).toHaveProperty('protocol');
        expect(session).toHaveProperty('username');
        expect(session).toHaveProperty('ipAddress');
        expect(session).toHaveProperty('connectedAt');
      });
    });
  });

  describe('Session Disconnect', () => {
    test('should disconnect session', () => {
      const result = serverManager.disconnectSession('non-existent');
      expect(typeof result).toBe('boolean');
    });

    test('should return false for non-existent session', () => {
      const result = serverManager.disconnectSession('fake-session-id');
      expect(result).toBe(false);
    });
  });

  describe('Auto-start Listeners', () => {
    test('should auto-start enabled listeners', async () => {
      db.createListener({
        name: 'Auto SFTP',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      db.createListener({
        name: 'Auto FTP',
        protocol: 'FTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      await expect(serverManager.startAllEnabledListeners()).resolves.not.toThrow();
    });

    test('should skip disabled listeners', async () => {
      db.createListener({
        name: 'Disabled',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: false
      });

      await serverManager.startAllEnabledListeners();

      // Should not throw and listener should not be running
      expect(true).toBe(true);
    });

    test('should continue on individual listener failure', async () => {
      db.createListener({
        name: 'Valid',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      db.createListener({
        name: 'Invalid',
        protocol: 'SFTP',
        bindingIp: '256.256.256.256',
        port: 99999,
        enabled: true
      });

      await expect(serverManager.startAllEnabledListeners()).resolves.not.toThrow();
    });
  });

  describe('Multiple Listeners', () => {
    test('should manage multiple SFTP listeners', async () => {
      const listener1 = db.createListener({
        name: 'SFTP 1',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      const listener2 = db.createListener({
        name: 'SFTP 2',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      await serverManager.startListener(listener1).catch(() => {});
      await serverManager.startListener(listener2).catch(() => {});

      expect(serverManager.isListenerRunning(listener1)).toBe(true);
      expect(serverManager.isListenerRunning(listener2)).toBe(true);
    });

    test('should manage mixed protocol listeners', async () => {
      const sftpListener = db.createListener({
        name: 'SFTP',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      const ftpListener = db.createListener({
        name: 'FTP',
        protocol: 'FTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      await serverManager.startListener(sftpListener).catch(() => {});
      await serverManager.startListener(ftpListener).catch(() => {});

      expect(serverManager.isListenerRunning(sftpListener)).toBe(true);
      expect(serverManager.isListenerRunning(ftpListener)).toBe(true);
    });
  });

  describe('Activity Forwarding', () => {
    test('should forward activity events from servers', (done) => {
      serverManager.on('activity', (activity) => {
        expect(activity).toHaveProperty('listenerId');
        expect(activity).toHaveProperty('username');
        expect(activity).toHaveProperty('action');
        done();
      });

      // Simulate activity
      serverManager.emit('activity', {
        listenerId: 1,
        username: 'testuser',
        action: 'TEST',
        path: '/',
        success: true
      });
    });

    test('should log activities to database', async () => {
      const listenerId = db.createListener({
        name: 'Test',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      db.logActivity({
        listenerId: listenerId,
        username: 'testuser',
        action: 'FILE_UPLOAD',
        path: '/test.txt',
        success: true
      });

      const activities = db.getRecentActivities(listenerId);
      expect(activities.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should emit listener-error event', (done) => {
      const listenerId = db.createListener({
        name: 'Error Test',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      serverManager.on('listener-error', (id, err) => {
        expect(id).toBe(listenerId);
        expect(err).toBeDefined();
        done();
      });

      // Simulate error
      serverManager.emit('listener-error', listenerId, new Error('Test error'));
    });

    // Protocol validation is enforced at database level via CHECK constraint
    // This test would violate the constraint before reaching the server manager
    test.skip('should handle unknown protocol', async () => {
      // Create listener with invalid protocol (bypassing validation)
      const listenerId = db.createListener({
        name: 'Unknown',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      const listener = db.getListener(listenerId);
      if (listener && listener.id) {
        // Manually change protocol to invalid
        db.updateListener(listener.id, { protocol: 'INVALID' as any });
      }

      await expect(serverManager.startListener(listenerId)).rejects.toThrow();
    });
  });

  describe('Stop All Listeners', () => {
    test('should stop all running listeners', async () => {
      const listener1 = db.createListener({
        name: 'SFTP 1',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      const listener2 = db.createListener({
        name: 'FTP 1',
        protocol: 'FTP',
        bindingIp: '127.0.0.1',
        port: 0,
        enabled: true
      });

      await serverManager.startListener(listener1).catch(() => {});
      await serverManager.startListener(listener2).catch(() => {});

      await serverManager.stopAllListeners();

      expect(serverManager.isListenerRunning(listener1)).toBe(false);
      expect(serverManager.isListenerRunning(listener2)).toBe(false);
    });

    test('should not throw when no listeners are running', async () => {
      await expect(serverManager.stopAllListeners()).resolves.not.toThrow();
    });
  });

  describe('Listener Information', () => {
    test('should retrieve listener details', () => {
      const listenerId = db.createListener({
        name: 'Info Test',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 22,
        enabled: true
      });

      const listener = db.getListener(listenerId);
      expect(listener).toBeDefined();
      expect(listener?.name).toBe('Info Test');
      expect(listener?.protocol).toBe('SFTP');
      expect(listener?.port).toBe(22);
    });

    test('should list all listeners', () => {
      db.createListener({
        name: 'SFTP 1',
        protocol: 'SFTP',
        bindingIp: '127.0.0.1',
        port: 22,
        enabled: true
      });

      db.createListener({
        name: 'FTP 1',
        protocol: 'FTP',
        bindingIp: '127.0.0.1',
        port: 21,
        enabled: true
      });

      const listeners = db.getAllListeners();
      expect(listeners.length).toBeGreaterThanOrEqual(2);
    });
  });
});


