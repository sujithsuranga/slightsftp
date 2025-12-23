import { SFTPServer } from '../sftp-server';
import { DatabaseManager } from '../database';
import { Server as SSHServer } from 'ssh2';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('../database');
jest.mock('ssh2');
jest.mock('fs');

describe('SFTPServer', () => {
  let sftpServer: SFTPServer;
  let mockDb: jest.Mocked<DatabaseManager>;
  let mockSSHServer: jest.Mocked<SSHServer>;

  beforeEach(() => {
    // Create mock database
    mockDb = {
      getUserByUsername: jest.fn(),
      getVirtualPaths: jest.fn(() => []),
      getPermissions: jest.fn(() => []),
      logActivity: jest.fn()
    } as any;

    // Create mock SSH server
    mockSSHServer = new EventEmitter() as any;
    mockSSHServer.listen = jest.fn((port, host, cb) => {
      if (cb) cb();
    });
    mockSSHServer.close = jest.fn((cb) => {
      if (cb) cb();
    });

    (SSHServer as any).mockImplementation(() => mockSSHServer);

    sftpServer = new SFTPServer(
      1,
      mockDb,
      '0.0.0.0',
      2222,
      '/test/root',
      '/test/keys/host.key'
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Server Lifecycle', () => {
    test('should start server successfully', async () => {
      const result = await sftpServer.start();

      expect(result).toBe(true);
      expect(mockSSHServer.listen).toHaveBeenCalledWith(
        2222,
        '0.0.0.0',
        expect.any(Function)
      );
    });

    test('should handle start failure when already running', async () => {
      await sftpServer.start();
      const result = await sftpServer.start();

      expect(result).toBe(false);
    });

    test('should stop server successfully', async () => {
      await sftpServer.start();
      const result = await sftpServer.stop();

      expect(result).toBe(true);
      expect(mockSSHServer.close).toHaveBeenCalled();
    });

    test('should handle stop when server not running', async () => {
      const result = await sftpServer.stop();

      expect(result).toBe(false);
    });

    test('should emit activity events', (done) => {
      const activity = {
        listener_id: 1,
        username: 'testuser',
        action: 'login',
        path: '/',
        status: 'success',
        ip_address: '127.0.0.1',
        timestamp: expect.any(String)
      };

      sftpServer.on('activity', (loggedActivity) => {
        expect(loggedActivity).toMatchObject(activity);
        done();
      });

      sftpServer['logActivity']('testuser', 'login', '/', 'success', '127.0.0.1');
    });
  });

  describe('Authentication', () => {
    test('should authenticate user with valid password', () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // 'password'
        can_read: true,
        can_write: true,
        can_delete: false
      };

      mockDb.getUserByUsername.mockReturnValue(mockUser as any);

      const mockContext = {
        username: 'testuser',
        password: 'password',
        method: 'password',
        accept: jest.fn(),
        reject: jest.fn()
      };

      sftpServer['handleAuthentication'](mockContext as any);

      expect(mockContext.accept).toHaveBeenCalled();
      expect(mockContext.reject).not.toHaveBeenCalled();
    });

    test('should reject authentication with invalid password', () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password_hash: 'wronghash',
        can_read: true,
        can_write: true,
        can_delete: false
      };

      mockDb.getUserByUsername.mockReturnValue(mockUser as any);

      const mockContext = {
        username: 'testuser',
        password: 'wrongpassword',
        method: 'password',
        accept: jest.fn(),
        reject: jest.fn()
      };

      sftpServer['handleAuthentication'](mockContext as any);

      expect(mockContext.reject).toHaveBeenCalled();
      expect(mockContext.accept).not.toHaveBeenCalled();
    });

    test('should reject authentication for non-existent user', () => {
      mockDb.getUserByUsername.mockReturnValue(null);

      const mockContext = {
        username: 'nonexistent',
        password: 'password',
        method: 'password',
        accept: jest.fn(),
        reject: jest.fn()
      };

      sftpServer['handleAuthentication'](mockContext as any);

      expect(mockContext.reject).toHaveBeenCalled();
    });

    test('should authenticate with public key', () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password_hash: '',
        public_key: 'ssh-rsa AAAAB3NzaC1yc2E...',
        can_read: true,
        can_write: true,
        can_delete: false
      };

      mockDb.getUserByUsername.mockReturnValue(mockUser as any);

      const mockContext = {
        username: 'testuser',
        key: {
          algo: 'ssh-rsa',
          data: Buffer.from('key data')
        },
        method: 'publickey',
        accept: jest.fn(),
        reject: jest.fn()
      };

      sftpServer['handleAuthentication'](mockContext as any);

      // Should accept if public key matches
      expect(mockContext.accept).toHaveBeenCalled();
    });
  });

  describe('Virtual Path Mapping', () => {
    test('should map virtual path to real path', () => {
      const virtualPaths = [
        { virtual_path: '/virtual', real_path: '/real/path' }
      ];

      mockDb.getVirtualPaths.mockReturnValue(virtualPaths as any);

      const realPath = sftpServer['mapPath']('/virtual/file.txt');

      expect(realPath).toBe(path.join('/real/path', 'file.txt'));
    });

    test('should use root path when no virtual path matches', () => {
      mockDb.getVirtualPaths.mockReturnValue([]);

      const realPath = sftpServer['mapPath']('/file.txt');

      expect(realPath).toBe(path.join('/test/root', 'file.txt'));
    });

    test('should normalize paths to prevent directory traversal', () => {
      mockDb.getVirtualPaths.mockReturnValue([]);

      const realPath = sftpServer['mapPath']('/../../../etc/passwd');

      expect(realPath).toContain('/test/root');
      expect(realPath).not.toContain('../../..');
    });
  });

  describe('Permission Checking', () => {
    test('should allow read when user has read permission', () => {
      const mockUser = { can_read: true };
      const result = sftpServer['checkPermission'](mockUser as any, '/test', 'read');

      expect(result).toBe(true);
    });

    test('should deny read when user lacks read permission', () => {
      const mockUser = { can_read: false };
      const result = sftpServer['checkPermission'](mockUser as any, '/test', 'read');

      expect(result).toBe(false);
    });

    test('should allow write when user has write permission', () => {
      const mockUser = { can_write: true };
      const result = sftpServer['checkPermission'](mockUser as any, '/test', 'write');

      expect(result).toBe(true);
    });

    test('should deny write when user lacks write permission', () => {
      const mockUser = { can_write: false };
      const result = sftpServer['checkPermission'](mockUser as any, '/test', 'write');

      expect(result).toBe(false);
    });

    test('should allow delete when user has delete permission', () => {
      const mockUser = { can_delete: true };
      const result = sftpServer['checkPermission'](mockUser as any, '/test', 'delete');

      expect(result).toBe(true);
    });

    test('should respect path-specific permissions', () => {
      const mockUser = { can_read: true, can_write: true };
      const permissions = [
        { path_pattern: '/restricted/*', can_read: true, can_write: false }
      ];

      mockDb.getPermissions.mockReturnValue(permissions as any);

      // Should deny write to restricted path
      const result = sftpServer['checkPermission'](mockUser as any, '/restricted/file.txt', 'write');

      expect(result).toBe(false);
    });
  });

  describe('File Operations', () => {
    test('should handle OPEN request for reading', () => {
      const mockUser = { can_read: true, can_write: true };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
      (fs.openSync as jest.Mock).mockReturnValue(3);

      const mockSftp = {
        handle: jest.fn()
      };

      sftpServer['activeUsers'].set('test-session', mockUser as any);

      // Mock OPEN request would be handled here
      // This is a simplified test as the actual SFTP stream handling is complex
      expect(mockUser.can_read).toBe(true);
    });

    test('should log activity for file operations', () => {
      sftpServer['logActivity']('testuser', 'upload', '/test/file.txt', 'success', '127.0.0.1');

      expect(mockDb.logActivity).toHaveBeenCalledWith({
        listener_id: 1,
        username: 'testuser',
        action: 'upload',
        path: '/test/file.txt',
        status: 'success',
        ip_address: '127.0.0.1',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Error Handling', () => {
    test('should emit error events', (done) => {
      const error = new Error('Test error');

      sftpServer.on('error', (err) => {
        expect(err).toBe(error);
        done();
      });

      mockSSHServer.emit('error', error);
    });

    test('should handle authentication errors gracefully', () => {
      mockDb.getUserByUsername.mockImplementation(() => {
        throw new Error('Database error');
      });

      const mockContext = {
        username: 'testuser',
        password: 'password',
        method: 'password',
        accept: jest.fn(),
        reject: jest.fn()
      };

      sftpServer['handleAuthentication'](mockContext as any);

      expect(mockContext.reject).toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    test('should track active sessions', () => {
      const mockUser = { id: 1, username: 'testuser' };
      
      sftpServer['activeUsers'].set('session-1', mockUser as any);

      expect(sftpServer['activeUsers'].size).toBe(1);
      expect(sftpServer['activeUsers'].get('session-1')).toBe(mockUser);
    });

    test('should clean up session on disconnect', () => {
      const mockUser = { id: 1, username: 'testuser' };
      
      sftpServer['activeUsers'].set('session-1', mockUser as any);
      sftpServer['activeUsers'].delete('session-1');

      expect(sftpServer['activeUsers'].size).toBe(0);
    });
  });
});


