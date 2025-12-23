import { FTPServer } from '../ftp-server';
import { DatabaseManager } from '../database';
import FtpSrv from 'ftp-srv';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('../database');
jest.mock('ftp-srv');
jest.mock('fs');

describe('FTPServer', () => {
  let ftpServer: FTPServer;
  let mockDb: jest.Mocked<DatabaseManager>;
  let mockFtpSrv: jest.Mocked<FtpSrv>;

  beforeEach(() => {
    // Create mock database
    mockDb = {
      getUserByUsername: jest.fn(),
      getVirtualPaths: jest.fn(() => []),
      getPermissions: jest.fn(() => []),
      logActivity: jest.fn()
    } as any;

    // Create mock FTP server
    mockFtpSrv = new EventEmitter() as any;
    mockFtpSrv.listen = jest.fn().mockResolvedValue(undefined);
    mockFtpSrv.close = jest.fn().mockResolvedValue(undefined);

    (FtpSrv as any).mockImplementation(() => mockFtpSrv);

    ftpServer = new FTPServer(
      1,
      mockDb,
      '0.0.0.0',
      2121,
      '/test/root'
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Server Lifecycle', () => {
    test('should start server successfully', async () => {
      const result = await ftpServer.start();

      expect(result).toBe(true);
      expect(mockFtpSrv.listen).toHaveBeenCalled();
    });

    test('should handle start failure when already running', async () => {
      await ftpServer.start();
      const result = await ftpServer.start();

      expect(result).toBe(false);
    });

    test('should stop server successfully', async () => {
      await ftpServer.start();
      const result = await ftpServer.stop();

      expect(result).toBe(true);
      expect(mockFtpSrv.close).toHaveBeenCalled();
    });

    test('should handle stop when server not running', async () => {
      const result = await ftpServer.stop();

      expect(result).toBe(false);
    });

    test('should emit activity events', (done) => {
      const activity = {
        listener_id: 1,
        username: 'testuser',
        action: 'upload',
        path: '/file.txt',
        status: 'success',
        ip_address: '127.0.0.1',
        timestamp: expect.any(String)
      };

      ftpServer.on('activity', (loggedActivity) => {
        expect(loggedActivity).toMatchObject(activity);
        done();
      });

      ftpServer['logActivity']('testuser', 'upload', '/file.txt', 'success', '127.0.0.1');
    });
  });

  describe('Authentication', () => {
    test('should authenticate valid user', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // 'password'
        can_read: true,
        can_write: true,
        can_delete: false
      };

      mockDb.getUserByUsername.mockReturnValue(mockUser as any);

      const mockConnection = {
        username: 'testuser',
        password: 'password'
      };

      const result = await ftpServer['authenticate'](mockConnection as any);

      expect(result).toEqual({ user: mockUser });
    });

    test('should reject invalid password', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password_hash: 'wronghash',
        can_read: true,
        can_write: true,
        can_delete: false
      };

      mockDb.getUserByUsername.mockReturnValue(mockUser as any);

      const mockConnection = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      await expect(ftpServer['authenticate'](mockConnection as any))
        .rejects.toThrow('Invalid credentials');
    });

    test('should reject non-existent user', async () => {
      mockDb.getUserByUsername.mockReturnValue(null);

      const mockConnection = {
        username: 'nonexistent',
        password: 'password'
      };

      await expect(ftpServer['authenticate'](mockConnection as any))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('Virtual Path Mapping', () => {
    test('should map virtual path to real path', () => {
      const virtualPaths = [
        { virtual_path: '/virtual', real_path: '/real/path' }
      ];

      mockDb.getVirtualPaths.mockReturnValue(virtualPaths as any);

      const realPath = ftpServer['mapPath']('/virtual/file.txt');

      expect(realPath).toContain('/real/path');
    });

    test('should use root path when no virtual path matches', () => {
      mockDb.getVirtualPaths.mockReturnValue([]);

      const realPath = ftpServer['mapPath']('/file.txt');

      expect(realPath).toContain('/test/root');
    });

    test('should prevent directory traversal attacks', () => {
      mockDb.getVirtualPaths.mockReturnValue([]);

      const realPath = ftpServer['mapPath']('/../../../etc/passwd');

      expect(realPath).toContain('/test/root');
      expect(path.relative('/test/root', realPath)).not.toContain('..');
    });
  });

  describe('Permission Checking', () => {
    test('should allow read when user has read permission', () => {
      const mockUser = { can_read: true, can_write: false, can_delete: false };
      const result = ftpServer['checkPermission'](mockUser as any, '/test', 'read');

      expect(result).toBe(true);
    });

    test('should deny read when user lacks permission', () => {
      const mockUser = { can_read: false, can_write: false, can_delete: false };
      const result = ftpServer['checkPermission'](mockUser as any, '/test', 'read');

      expect(result).toBe(false);
    });

    test('should allow write when user has write permission', () => {
      const mockUser = { can_read: false, can_write: true, can_delete: false };
      const result = ftpServer['checkPermission'](mockUser as any, '/test', 'write');

      expect(result).toBe(true);
    });

    test('should allow delete when user has delete permission', () => {
      const mockUser = { can_read: false, can_write: false, can_delete: true };
      const result = ftpServer['checkPermission'](mockUser as any, '/test', 'delete');

      expect(result).toBe(true);
    });

    test('should respect path-specific permissions', () => {
      const mockUser = { can_read: true, can_write: true, can_delete: false };
      const permissions = [
        { 
          path_pattern: '/restricted/*', 
          can_read: true, 
          can_write: false, 
          can_delete: false 
        }
      ];

      mockDb.getPermissions.mockReturnValue(permissions as any);

      const result = ftpServer['checkPermission'](mockUser as any, '/restricted/file.txt', 'write');

      expect(result).toBe(false);
    });
  });

  describe('CustomFileSystem', () => {
    let customFs: any;
    let mockConnection: any;

    beforeEach(async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        can_read: true,
        can_write: true,
        can_delete: true
      };

      mockDb.getUserByUsername.mockReturnValue(mockUser as any);

      mockConnection = {
        username: 'testuser',
        password: 'password',
        ip: '127.0.0.1'
      };

      await ftpServer.start();
      
      // Access the CustomFileSystem through the server
      const FileSystemClass = (FtpSrv as any).mock.calls[0][0].file_system;
      customFs = new FileSystemClass(mockConnection, { root: '/test/root', cwd: '/' });
    });

    test('should get file stats', async () => {
      const mockStats = {
        isFile: () => true,
        isDirectory: () => false,
        size: 1024,
        mtime: new Date(),
        mode: 0o644
      };

      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);

      const stats = await customFs.get('/file.txt');

      expect(stats).toBeDefined();
      expect(fs.promises.stat).toHaveBeenCalled();
    });

    test('should list directory contents', async () => {
      const mockFiles = [
        { name: 'file1.txt', isFile: () => true },
        { name: 'dir1', isDirectory: () => true }
      ];

      (fs.promises.readdir as jest.Mock).mockResolvedValue(mockFiles.map(f => f.name));
      (fs.promises.stat as jest.Mock).mockImplementation((filePath) => {
        const fileName = path.basename(filePath);
        const file = mockFiles.find(f => f.name === fileName);
        return Promise.resolve({
          isFile: file?.isFile || (() => false),
          isDirectory: file?.isDirectory || (() => false),
          size: 1024,
          mtime: new Date(),
          mode: 0o644
        });
      });

      const files = await customFs.list('/');

      expect(files).toHaveLength(2);
      expect(fs.promises.readdir).toHaveBeenCalled();
    });

    test('should create directory', async () => {
      (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);

      await customFs.mkdir('/newdir');

      expect(fs.promises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('newdir'),
        { recursive: true }
      );
    });

    test('should write file', async () => {
      const mockStream = {
        on: jest.fn(),
        pipe: jest.fn()
      };

      (fs.createWriteStream as jest.Mock).mockReturnValue(mockStream);

      const writeStream = await customFs.write('/file.txt', { start: 0 });

      expect(writeStream).toBeDefined();
      expect(fs.createWriteStream).toHaveBeenCalled();
    });

    test('should read file', async () => {
      const mockStream = {
        on: jest.fn(),
        pipe: jest.fn()
      };

      (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

      const readStream = await customFs.read('/file.txt', { start: 0 });

      expect(readStream).toBeDefined();
      expect(fs.createReadStream).toHaveBeenCalled();
    });

    test('should delete file', async () => {
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      await customFs.delete('/file.txt');

      expect(fs.promises.unlink).toHaveBeenCalled();
    });

    test('should rename file', async () => {
      (fs.promises.rename as jest.Mock).mockResolvedValue(undefined);

      await customFs.rename('/old.txt', '/new.txt');

      expect(fs.promises.rename).toHaveBeenCalled();
    });

    test('should change working directory', async () => {
      const mockStats = {
        isDirectory: () => true
      };

      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);

      const newCwd = await customFs.chdir('/subdir');

      expect(newCwd).toBeDefined();
    });

    test('should deny operations without proper permissions', async () => {
      // Update user to have no write permission
      const restrictedUser = {
        id: 1,
        username: 'testuser',
        can_read: true,
        can_write: false,
        can_delete: false
      };

      mockDb.getUserByUsername.mockReturnValue(restrictedUser as any);

      await expect(customFs.write('/file.txt', { start: 0 }))
        .rejects.toThrow('Permission denied');
    });
  });

  describe('Connection Handling', () => {
    test('should log login activity', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        can_read: true,
        can_write: true,
        can_delete: false
      };

      mockDb.getUserByUsername.mockReturnValue(mockUser as any);

      const mockConnection = {
        username: 'testuser',
        password: 'password',
        ip: '127.0.0.1',
        on: jest.fn()
      };

      await ftpServer.start();
      mockFtpSrv.emit('login', mockConnection);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockDb.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login',
          username: 'testuser',
          ip_address: '127.0.0.1',
          status: 'success'
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should emit error events', (done) => {
      const error = new Error('Test error');

      ftpServer.on('error', (err) => {
        expect(err).toBe(error);
        done();
      });

      mockFtpSrv.emit('error', error);
    });

    test('should handle authentication errors', async () => {
      mockDb.getUserByUsername.mockImplementation(() => {
        throw new Error('Database error');
      });

      const mockConnection = {
        username: 'testuser',
        password: 'password'
      };

      await expect(ftpServer['authenticate'](mockConnection as any))
        .rejects.toThrow();
    });

    test('should handle file system errors gracefully', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        can_read: true,
        can_write: true,
        can_delete: true
      };

      mockDb.getUserByUsername.mockReturnValue(mockUser as any);

      const mockConnection = {
        username: 'testuser',
        password: 'password',
        ip: '127.0.0.1'
      };

      await ftpServer.start();
      
      const FileSystemClass = (FtpSrv as any).mock.calls[0][0].file_system;
      const customFs = new FileSystemClass(mockConnection, { root: '/test/root', cwd: '/' });

      (fs.promises.stat as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(customFs.get('/nonexistent.txt'))
        .rejects.toThrow();
    });
  });

  describe('Activity Logging', () => {
    test('should log all file operations', () => {
      ftpServer['logActivity']('testuser', 'upload', '/file.txt', 'success', '127.0.0.1');
      ftpServer['logActivity']('testuser', 'download', '/file.txt', 'success', '127.0.0.1');
      ftpServer['logActivity']('testuser', 'delete', '/file.txt', 'success', '127.0.0.1');

      expect(mockDb.logActivity).toHaveBeenCalledTimes(3);
    });

    test('should log failed operations', () => {
      ftpServer['logActivity']('testuser', 'upload', '/file.txt', 'error', '127.0.0.1');

      expect(mockDb.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error'
        })
      );
    });
  });
});


