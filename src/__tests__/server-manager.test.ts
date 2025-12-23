import { ServerManager } from '../server-manager';
import { DatabaseManager } from '../database';
import { SFTPServer } from '../sftp-server';
import { FTPServer } from '../ftp-server';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('../database');
jest.mock('../sftp-server');
jest.mock('../ftp-server');

describe('ServerManager', () => {
  let serverManager: ServerManager;
  let mockDb: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    // Create mock database
    mockDb = {
      getAllListeners: jest.fn(),
      updateListener: jest.fn(),
      logActivity: jest.fn()
    } as any;

    // Mock SFTPServer and FTPServer
    (SFTPServer as any).mockImplementation(() => {
      const server = new EventEmitter();
      (server as any).start = jest.fn().mockResolvedValue(true);
      (server as any).stop = jest.fn().mockResolvedValue(true);
      return server;
    });

    (FTPServer as any).mockImplementation(() => {
      const server = new EventEmitter();
      (server as any).start = jest.fn().mockResolvedValue(true);
      (server as any).stop = jest.fn().mockResolvedValue(true);
      return server;
    });

    serverManager = new ServerManager(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with database', () => {
      expect(serverManager).toBeDefined();
      expect(serverManager['db']).toBe(mockDb);
    });

    test('should start with empty listeners map', () => {
      expect(serverManager['listeners'].size).toBe(0);
    });
  });

  describe('Listener Management', () => {
    test('should start all active listeners', async () => {
      const mockListeners = [
        {
          id: 1,
          name: 'SFTP Server',
          protocol: 'sftp',
          host: '0.0.0.0',
          port: 22,
          root_path: '/sftp',
          is_active: true,
          host_key_path: '/keys/host.key'
        },
        {
          id: 2,
          name: 'FTP Server',
          protocol: 'ftp',
          host: '0.0.0.0',
          port: 21,
          root_path: '/ftp',
          is_active: true
        }
      ];

      mockDb.getAllListeners.mockReturnValue(mockListeners as any);

      await serverManager.startAll();

      expect(serverManager['listeners'].size).toBe(2);
      expect(SFTPServer).toHaveBeenCalledTimes(1);
      expect(FTPServer).toHaveBeenCalledTimes(1);
    });

    test('should skip inactive listeners', async () => {
      const mockListeners = [
        {
          id: 1,
          name: 'Inactive Server',
          protocol: 'sftp',
          host: '0.0.0.0',
          port: 22,
          root_path: '/sftp',
          is_active: false,
          host_key_path: '/keys/host.key'
        }
      ];

      mockDb.getAllListeners.mockReturnValue(mockListeners as any);

      await serverManager.startAll();

      expect(serverManager['listeners'].size).toBe(0);
    });

    test('should start individual listener', async () => {
      const mockListener = {
        id: 1,
        name: 'SFTP Server',
        protocol: 'sftp',
        host: '0.0.0.0',
        port: 22,
        root_path: '/sftp',
        is_active: true,
        host_key_path: '/keys/host.key'
      };

      mockDb.getAllListeners.mockReturnValue([mockListener] as any);

      const result = await serverManager.startListener(1);

      expect(result).toBe(true);
      expect(serverManager['listeners'].has(1)).toBe(true);
    });

    test('should handle start failure for non-existent listener', async () => {
      mockDb.getAllListeners.mockReturnValue([]);

      const result = await serverManager.startListener(999);

      expect(result).toBe(false);
    });

    test('should stop individual listener', async () => {
      const mockListener = {
        id: 1,
        name: 'SFTP Server',
        protocol: 'sftp',
        host: '0.0.0.0',
        port: 22,
        root_path: '/sftp',
        is_active: true,
        host_key_path: '/keys/host.key'
      };

      mockDb.getAllListeners.mockReturnValue([mockListener] as any);

      await serverManager.startListener(1);
      const result = await serverManager.stopListener(1);

      expect(result).toBe(true);
      expect(serverManager['listeners'].has(1)).toBe(false);
    });

    test('should handle stop failure for non-running listener', async () => {
      const result = await serverManager.stopListener(999);

      expect(result).toBe(false);
    });

    test('should restart listener', async () => {
      const mockListener = {
        id: 1,
        name: 'SFTP Server',
        protocol: 'sftp',
        host: '0.0.0.0',
        port: 22,
        root_path: '/sftp',
        is_active: true,
        host_key_path: '/keys/host.key'
      };

      mockDb.getAllListeners.mockReturnValue([mockListener] as any);

      await serverManager.startListener(1);
      const result = await serverManager.restartListener(1);

      expect(result).toBe(true);
    });

    test('should stop all listeners', async () => {
      const mockListeners = [
        {
          id: 1,
          name: 'SFTP Server',
          protocol: 'sftp',
          host: '0.0.0.0',
          port: 22,
          root_path: '/sftp',
          is_active: true,
          host_key_path: '/keys/host.key'
        },
        {
          id: 2,
          name: 'FTP Server',
          protocol: 'ftp',
          host: '0.0.0.0',
          port: 21,
          root_path: '/ftp',
          is_active: true
        }
      ];

      mockDb.getAllListeners.mockReturnValue(mockListeners as any);

      await serverManager.startAll();
      await serverManager.stopAll();

      expect(serverManager['listeners'].size).toBe(0);
    });
  });

  describe('Protocol Support', () => {
    test('should create SFTP server for sftp protocol', async () => {
      const mockListener = {
        id: 1,
        name: 'SFTP Server',
        protocol: 'sftp',
        host: '0.0.0.0',
        port: 22,
        root_path: '/sftp',
        is_active: true,
        host_key_path: '/keys/host.key'
      };

      mockDb.getAllListeners.mockReturnValue([mockListener] as any);

      await serverManager.startListener(1);

      expect(SFTPServer).toHaveBeenCalledWith(
        1,
        mockDb,
        '0.0.0.0',
        2222,
        '/sftp',
        '/keys/host.key'
      );
    });

    test('should create FTP server for ftp protocol', async () => {
      const mockListener = {
        id: 2,
        name: 'FTP Server',
        protocol: 'ftp',
        host: '0.0.0.0',
        port: 21,
        root_path: '/ftp',
        is_active: true
      };

      mockDb.getAllListeners.mockReturnValue([mockListener] as any);

      await serverManager.startListener(2);

      expect(FTPServer).toHaveBeenCalledWith(
        2,
        mockDb,
        '0.0.0.0',
        2121,
        '/ftp'
      );
    });

    test('should handle unsupported protocol', async () => {
      const mockListener = {
        id: 3,
        name: 'Unknown Server',
        protocol: 'unknown',
        host: '0.0.0.0',
        port: 3333,
        root_path: '/unknown',
        is_active: true
      };

      mockDb.getAllListeners.mockReturnValue([mockListener] as any);

      const result = await serverManager.startListener(3);

      expect(result).toBe(false);
    });
  });

  describe('Event Forwarding', () => {
    test('should forward activity events from servers', (done) => {
      const mockActivity = {
        listener_id: 1,
        username: 'testuser',
        action: 'upload',
        path: '/file.txt',
        status: 'success',
        ip_address: '127.0.0.1',
        timestamp: new Date().toISOString()
      };

      serverManager.on('activity', (activity) => {
        expect(activity).toEqual(mockActivity);
        done();
      });

      // Simulate activity from a server
      const mockServer = new EventEmitter();
      (mockServer as any).start = jest.fn().mockResolvedValue(true);
      (mockServer as any).stop = jest.fn().mockResolvedValue(true);

      serverManager['listeners'].set(1, mockServer as any);
      mockServer.emit('activity', mockActivity);
    });

    test('should forward error events from servers', (done) => {
      const mockError = new Error('Server error');

      serverManager.on('error', (error) => {
        expect(error).toBe(mockError);
        done();
      });

      const mockServer = new EventEmitter();
      (mockServer as any).start = jest.fn().mockResolvedValue(true);
      (mockServer as any).stop = jest.fn().mockResolvedValue(true);

      serverManager['listeners'].set(1, mockServer as any);
      mockServer.emit('error', mockError);
    });
  });

  describe('Error Handling', () => {
    test('should handle server start failure', async () => {
      const mockListener = {
        id: 1,
        name: 'Failing Server',
        protocol: 'sftp',
        host: '0.0.0.0',
        port: 22,
        root_path: '/sftp',
        is_active: true,
        host_key_path: '/keys/host.key'
      };

      mockDb.getAllListeners.mockReturnValue([mockListener] as any);

      (SFTPServer as any).mockImplementation(() => {
        const server = new EventEmitter();
        (server as any).start = jest.fn().mockResolvedValue(false);
        (server as any).stop = jest.fn().mockResolvedValue(true);
        return server;
      });

      const result = await serverManager.startListener(1);

      expect(result).toBe(false);
      expect(serverManager['listeners'].has(1)).toBe(false);
    });

    test('should handle server stop failure gracefully', async () => {
      const mockListener = {
        id: 1,
        name: 'SFTP Server',
        protocol: 'sftp',
        host: '0.0.0.0',
        port: 22,
        root_path: '/sftp',
        is_active: true,
        host_key_path: '/keys/host.key'
      };

      mockDb.getAllListeners.mockReturnValue([mockListener] as any);

      (SFTPServer as any).mockImplementation(() => {
        const server = new EventEmitter();
        (server as any).start = jest.fn().mockResolvedValue(true);
        (server as any).stop = jest.fn().mockResolvedValue(false);
        return server;
      });

      await serverManager.startListener(1);
      const result = await serverManager.stopListener(1);

      // Should still remove from map even if stop fails
      expect(serverManager['listeners'].has(1)).toBe(false);
    });

    test('should handle exceptions during listener creation', async () => {
      const mockListener = {
        id: 1,
        name: 'Failing Server',
        protocol: 'sftp',
        host: '0.0.0.0',
        port: 22,
        root_path: '/sftp',
        is_active: true,
        host_key_path: '/keys/host.key'
      };

      mockDb.getAllListeners.mockReturnValue([mockListener] as any);

      (SFTPServer as any).mockImplementation(() => {
        throw new Error('Construction failed');
      });

      const result = await serverManager.startListener(1);

      expect(result).toBe(false);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle starting multiple listeners concurrently', async () => {
      const mockListeners = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        name: `Server ${i + 1}`,
        protocol: i % 2 === 0 ? 'sftp' : 'ftp',
        host: '0.0.0.0',
        port: 2000 + i,
        root_path: `/server${i}`,
        is_active: true,
        host_key_path: i % 2 === 0 ? '/keys/host.key' : undefined
      }));

      mockDb.getAllListeners.mockReturnValue(mockListeners as any);

      await serverManager.startAll();

      expect(serverManager['listeners'].size).toBe(5);
    });

    test('should handle stopping multiple listeners concurrently', async () => {
      const mockListeners = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        name: `Server ${i + 1}`,
        protocol: i % 2 === 0 ? 'sftp' : 'ftp',
        host: '0.0.0.0',
        port: 2000 + i,
        root_path: `/server${i}`,
        is_active: true,
        host_key_path: i % 2 === 0 ? '/keys/host.key' : undefined
      }));

      mockDb.getAllListeners.mockReturnValue(mockListeners as any);

      await serverManager.startAll();
      await serverManager.stopAll();

      expect(serverManager['listeners'].size).toBe(0);
    });
  });

  describe('State Management', () => {
    test('should track running listeners', async () => {
      const mockListeners = [
        {
          id: 1,
          name: 'Server 1',
          protocol: 'sftp',
          host: '0.0.0.0',
          port: 22,
          root_path: '/sftp',
          is_active: true,
          host_key_path: '/keys/host.key'
        },
        {
          id: 2,
          name: 'Server 2',
          protocol: 'ftp',
          host: '0.0.0.0',
          port: 21,
          root_path: '/ftp',
          is_active: true
        }
      ];

      mockDb.getAllListeners.mockReturnValue(mockListeners as any);

      await serverManager.startAll();

      expect(serverManager['listeners'].has(1)).toBe(true);
      expect(serverManager['listeners'].has(2)).toBe(true);

      await serverManager.stopListener(1);

      expect(serverManager['listeners'].has(1)).toBe(false);
      expect(serverManager['listeners'].has(2)).toBe(true);
    });

    test('should not start already running listener', async () => {
      const mockListener = {
        id: 1,
        name: 'SFTP Server',
        protocol: 'sftp',
        host: '0.0.0.0',
        port: 22,
        root_path: '/sftp',
        is_active: true,
        host_key_path: '/keys/host.key'
      };

      mockDb.getAllListeners.mockReturnValue([mockListener] as any);

      await serverManager.startListener(1);
      const secondStart = await serverManager.startListener(1);

      expect(secondStart).toBe(false);
      expect(SFTPServer).toHaveBeenCalledTimes(1);
    });
  });
});


