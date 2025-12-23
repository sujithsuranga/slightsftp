import { DatabaseManager } from '../database';
import { User, Listener, Permission, VirtualPath, ServerActivity } from '../types';
import * as crypto from 'crypto';
import initSqlJs, { Database } from 'sql.js';

// Mock sql.js
jest.mock('sql.js');

describe('DatabaseManager', () => {
  let db: DatabaseManager;
  let mockDb: jest.Mocked<Database>;

  beforeEach(async () => {
    // Create mock database
    mockDb = {
      run: jest.fn(),
      exec: jest.fn(),
      prepare: jest.fn(),
      export: jest.fn(() => new Uint8Array()),
      close: jest.fn(),
      create_function: jest.fn(),
      each: jest.fn(),
      getRowsModified: jest.fn(),
      handleError: jest.fn()
    } as any;

    const mockStmt = {
      step: jest.fn(() => true),
      getAsObject: jest.fn(() => ({})),
      get: jest.fn(() => []),
      bind: jest.fn(),
      reset: jest.fn(),
      free: jest.fn(),
      freemem: jest.fn(),
      run: jest.fn()
    };

    mockDb.prepare.mockReturnValue(mockStmt as any);

    (initSqlJs as jest.Mock).mockResolvedValue({
      Database: jest.fn(() => mockDb)
    });

    db = new DatabaseManager(':memory:');
    await db.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User Management', () => {
    test('should create a new user', () => {
      const user: Omit<User, 'id'> = {
        username: 'testuser',
        password_hash: crypto.createHash('sha256').update('password').digest('hex'),
        public_key: null,
        can_read: true,
        can_write: true,
        can_delete: false,
        created_at: new Date().toISOString()
      };

      const result = db.createUser(user);
      
      expect(mockDb.run).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    test('should get user by username', () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password_hash: 'hash',
        public_key: null,
        can_read: 1,
        can_write: 1,
        can_delete: 0,
        created_at: new Date().toISOString()
      };

      const mockStmt = {
        step: jest.fn(() => true),
        getAsObject: jest.fn(() => mockUser),
        free: jest.fn(),
        bind: jest.fn()
      };

      mockDb.prepare.mockReturnValue(mockStmt as any);

      const user = db.getUserByUsername('testuser');
      
      expect(user).toBeDefined();
      expect(user?.username).toBe('testuser');
    });

    test('should return null for non-existent user', () => {
      const mockStmt = {
        step: jest.fn(() => false),
        getAsObject: jest.fn(),
        free: jest.fn(),
        bind: jest.fn()
      };

      mockDb.prepare.mockReturnValue(mockStmt as any);

      const user = db.getUserByUsername('nonexistent');
      
      expect(user).toBeNull();
    });

    test('should get all users', () => {
      const mockUsers = [
        { id: 1, username: 'user1', can_read: 1, can_write: 1, can_delete: 0 },
        { id: 2, username: 'user2', can_read: 1, can_write: 0, can_delete: 0 }
      ];

      const mockStmt = {
        step: jest.fn()
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(false),
        getAsObject: jest.fn()
          .mockReturnValueOnce(mockUsers[0])
          .mockReturnValueOnce(mockUsers[1]),
        free: jest.fn()
      };

      mockDb.prepare.mockReturnValue(mockStmt as any);

      const users = db.getAllUsers();
      
      expect(users).toHaveLength(2);
      expect(users[0].username).toBe('user1');
    });

    test('should update user', () => {
      db.updateUser(1, {
        username: 'updateduser',
        can_write: false
      });

      expect(mockDb.run).toHaveBeenCalled();
    });

    test('should delete user', () => {
      db.deleteUser(1);

      expect(mockDb.run).toHaveBeenCalledTimes(2); // Delete from user_listeners and users
    });
  });

  describe('Listener Management', () => {
    test('should create a new listener', () => {
      const listener: Omit<Listener, 'id'> = {
        name: 'Test Listener',
        protocol: 'sftp',
        host: '0.0.0.0',
        port: 22,
        root_path: '/test',
        is_active: true,
        created_at: new Date().toISOString()
      };

      const result = db.createListener(listener);
      
      expect(mockDb.run).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    test('should get all listeners', () => {
      const mockListeners = [
        { id: 1, name: 'SFTP', protocol: 'sftp', port: 22 },
        { id: 2, name: 'FTP', protocol: 'ftp', port: 21 }
      ];

      const mockStmt = {
        step: jest.fn()
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(false),
        getAsObject: jest.fn()
          .mockReturnValueOnce(mockListeners[0])
          .mockReturnValueOnce(mockListeners[1]),
        free: jest.fn()
      };

      mockDb.prepare.mockReturnValue(mockStmt as any);

      const listeners = db.getAllListeners();
      
      expect(listeners).toHaveLength(2);
      expect(listeners[0].protocol).toBe('sftp');
    });

    test('should update listener', () => {
      db.updateListener(1, {
        port: 3333,
        is_active: false
      });

      expect(mockDb.run).toHaveBeenCalled();
    });

    test('should delete listener', () => {
      db.deleteListener(1);

      expect(mockDb.run).toHaveBeenCalledTimes(4); // Multiple related tables
    });
  });

  describe('Permission Management', () => {
    test('should create permission', () => {
      const permission: Omit<Permission, 'id'> = {
        user_id: 1,
        listener_id: 1,
        path_pattern: '/test/*',
        can_read: true,
        can_write: true,
        can_delete: false,
        created_at: new Date().toISOString()
      };

      const result = db.createPermission(permission);
      
      expect(mockDb.run).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    test('should get permissions for user and listener', () => {
      const mockPerms = [
        { id: 1, path_pattern: '/test/*', can_read: 1, can_write: 1 }
      ];

      const mockStmt = {
        step: jest.fn()
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(false),
        getAsObject: jest.fn().mockReturnValueOnce(mockPerms[0]),
        free: jest.fn(),
        bind: jest.fn()
      };

      mockDb.prepare.mockReturnValue(mockStmt as any);

      const perms = db.getPermissions(1, 1);
      
      expect(perms).toHaveLength(1);
      expect(perms[0].path_pattern).toBe('/test/*');
    });

    test('should delete permission', () => {
      db.deletePermission(1);

      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('Virtual Path Management', () => {
    test('should create virtual path', () => {
      const virtualPath: Omit<VirtualPath, 'id'> = {
        listener_id: 1,
        virtual_path: '/virtual',
        real_path: '/real/path',
        created_at: new Date().toISOString()
      };

      const result = db.createVirtualPath(virtualPath);
      
      expect(mockDb.run).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    test('should get virtual paths for listener', () => {
      const mockPaths = [
        { id: 1, virtual_path: '/virtual', real_path: '/real' }
      ];

      const mockStmt = {
        step: jest.fn()
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(false),
        getAsObject: jest.fn().mockReturnValueOnce(mockPaths[0]),
        free: jest.fn(),
        bind: jest.fn()
      };

      mockDb.prepare.mockReturnValue(mockStmt as any);

      const paths = db.getVirtualPaths(1);
      
      expect(paths).toHaveLength(1);
      expect(paths[0].virtual_path).toBe('/virtual');
    });

    test('should delete virtual path', () => {
      db.deleteVirtualPath(1);

      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('Activity Logging', () => {
    test('should log server activity', () => {
      const activity: Omit<ServerActivity, 'id'> = {
        listener_id: 1,
        username: 'testuser',
        action: 'upload',
        path: '/test/file.txt',
        status: 'success',
        ip_address: '127.0.0.1',
        timestamp: new Date().toISOString()
      };

      db.logActivity(activity);

      expect(mockDb.run).toHaveBeenCalled();
    });

    test('should get recent activities', () => {
      const mockActivities = [
        { id: 1, action: 'upload', status: 'success' },
        { id: 2, action: 'download', status: 'success' }
      ];

      const mockStmt = {
        step: jest.fn()
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(false),
        getAsObject: jest.fn()
          .mockReturnValueOnce(mockActivities[0])
          .mockReturnValueOnce(mockActivities[1]),
        free: jest.fn(),
        bind: jest.fn()
      };

      mockDb.prepare.mockReturnValue(mockStmt as any);

      const activities = db.getRecentActivities(10);
      
      expect(activities).toHaveLength(2);
      expect(activities[0].action).toBe('upload');
    });
  });

  describe('User-Listener Association', () => {
    test('should assign user to listener', () => {
      db.assignUserToListener(1, 1);

      expect(mockDb.run).toHaveBeenCalled();
    });

    test('should get users for listener', () => {
      const mockUsers = [
        { id: 1, username: 'user1' }
      ];

      const mockStmt = {
        step: jest.fn()
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(false),
        getAsObject: jest.fn().mockReturnValueOnce(mockUsers[0]),
        free: jest.fn(),
        bind: jest.fn()
      };

      mockDb.prepare.mockReturnValue(mockStmt as any);

      const users = db.getUsersForListener(1);
      
      expect(users).toHaveLength(1);
      expect(users[0].username).toBe('user1');
    });
  });

  describe('Database Persistence', () => {
    test('should save database to file', () => {
      mockDb.export.mockReturnValue(new Uint8Array([1, 2, 3]));

      db['save'](); // Call private method

      expect(mockDb.export).toHaveBeenCalled();
    });
  });
});


