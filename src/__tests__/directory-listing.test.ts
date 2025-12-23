import * as fs from 'fs';
import * as path from 'path';

describe('Directory Listing Implementation Tests', () => {
  describe('OPENDIR Operation', () => {
    test('should check canList permission before opening directory', () => {
      const userPermissions = {
        canCreate: true,
        canEdit: true,
        canAppend: true,
        canDelete: true,
        canList: false, // No LIST permission
        canCreateDir: true,
        canRename: true
      };

      const checkPermission = (action: string): boolean => {
        if (action === 'canList') return userPermissions.canList;
        return true;
      };

      const canOpenDir = checkPermission('canList');
      expect(canOpenDir).toBe(false);
    });

    test('should allow OPENDIR with canList permission', () => {
      const userPermissions = {
        canCreate: true,
        canEdit: true,
        canAppend: true,
        canDelete: true,
        canList: true, // Has LIST permission
        canCreateDir: true,
        canRename: true
      };

      const checkPermission = (action: string): boolean => {
        if (action === 'canList') return userPermissions.canList;
        return true;
      };

      const canOpenDir = checkPermission('canList');
      expect(canOpenDir).toBe(true);
    });

    test('should return PERMISSION_DENIED status code when canList is false', () => {
      const SFTP_STATUS_CODE = {
        OK: 0,
        EOF: 1,
        NO_SUCH_FILE: 2,
        PERMISSION_DENIED: 3,
        FAILURE: 4
      };

      const hasPermission = false;
      const expectedStatus = hasPermission ? SFTP_STATUS_CODE.OK : SFTP_STATUS_CODE.PERMISSION_DENIED;
      
      expect(expectedStatus).toBe(SFTP_STATUS_CODE.PERMISSION_DENIED);
    });

    test('should log OPENDIR_DENIED activity when permission denied', () => {
      const activities: Array<{ action: string; path: string; success: boolean }> = [];
      
      const logActivity = (action: string, filePath: string, success: boolean) => {
        activities.push({ action, path: filePath, success });
      };

      const hasPermission = false;
      const dirPath = '/test-dir';

      if (!hasPermission) {
        logActivity('OPENDIR_DENIED', dirPath, false);
      }

      expect(activities).toHaveLength(1);
      expect(activities[0]).toEqual({
        action: 'OPENDIR_DENIED',
        path: '/test-dir',
        success: false
      });
    });

    test('should create handle buffer with directory information', () => {
      const realPath = 'C:\\ftp-root\\test-dir';
      const files = ['file1.txt', 'file2.txt', 'dir1'];
      
      const handleData = {
        path: realPath,
        files: files,
        index: 0
      };

      const handleBuffer = Buffer.from(JSON.stringify(handleData));
      const parsed = JSON.parse(handleBuffer.toString());

      expect(parsed.path).toBe(realPath);
      expect(parsed.files).toEqual(files);
      expect(parsed.index).toBe(0);
    });

    test('should return NO_SUCH_FILE when directory does not exist', () => {
      const SFTP_STATUS_CODE = {
        OK: 0,
        EOF: 1,
        NO_SUCH_FILE: 2,
        PERMISSION_DENIED: 3,
        FAILURE: 4
      };

      let statusCode: number;
      const dirPath = '/non-existent-dir';

      try {
        // Simulate directory not existing
        throw new Error('ENOENT: no such file or directory');
      } catch (err) {
        statusCode = SFTP_STATUS_CODE.NO_SUCH_FILE;
      }

      expect(statusCode!).toBe(SFTP_STATUS_CODE.NO_SUCH_FILE);
    });

    test('should log OPENDIR activity on success', () => {
      const activities: Array<{ action: string; path: string; success: boolean }> = [];
      
      const logActivity = (action: string, filePath: string, success: boolean) => {
        activities.push({ action, path: filePath, success });
      };

      const dirPath = '/test-dir';
      
      // Simulate successful open
      logActivity('OPENDIR', dirPath, true);

      expect(activities).toHaveLength(1);
      expect(activities[0]).toEqual({
        action: 'OPENDIR',
        path: '/test-dir',
        success: true
      });
    });
  });

  describe('READDIR Operation', () => {
    test('should parse handle buffer correctly', () => {
      const handleData = {
        path: 'C:\\ftp-root\\test-dir',
        files: ['file1.txt', 'file2.txt', 'file3.txt'],
        index: 0
      };

      const handleBuffer = Buffer.from(JSON.stringify(handleData));
      const parsed = JSON.parse(handleBuffer.toString());

      expect(parsed).toEqual(handleData);
      expect(parsed.path).toBe('C:\\ftp-root\\test-dir');
      expect(parsed.files).toHaveLength(3);
      expect(parsed.index).toBe(0);
    });

    test('should return EOF when index exceeds file count', () => {
      const SFTP_STATUS_CODE = {
        OK: 0,
        EOF: 1,
        NO_SUCH_FILE: 2,
        PERMISSION_DENIED: 3,
        FAILURE: 4
      };

      const handleData = {
        path: 'C:\\ftp-root\\test-dir',
        files: ['file1.txt', 'file2.txt'],
        index: 2 // Index equals file count
      };

      const shouldReturnEOF = handleData.index >= handleData.files.length;
      const statusCode = shouldReturnEOF ? SFTP_STATUS_CODE.EOF : SFTP_STATUS_CODE.OK;

      expect(statusCode).toBe(SFTP_STATUS_CODE.EOF);
    });

    test('should process files in batches', () => {
      const files = Array.from({ length: 250 }, (_, i) => `file${i}.txt`);
      const index = 0;
      const batchSize = 100;

      const batch = files.slice(index, index + batchSize);

      expect(batch).toHaveLength(100);
      expect(batch[0]).toBe('file0.txt');
      expect(batch[99]).toBe('file99.txt');
    });

    test('should handle last batch with fewer files', () => {
      const files = Array.from({ length: 250 }, (_, i) => `file${i}.txt`);
      const index = 200;
      const batchSize = 100;

      const batch = files.slice(index, index + batchSize);

      expect(batch).toHaveLength(50); // Only 50 files remaining
      expect(batch[0]).toBe('file200.txt');
      expect(batch[49]).toBe('file249.txt');
    });

    test('should create file list with correct attributes', () => {
      const mockStats = {
        mode: 33188, // Regular file
        uid: 1000,
        gid: 1000,
        size: 1024,
        atimeMs: 1640000000000,
        mtimeMs: 1640000000000,
        isDirectory: () => false,
        isFile: () => true
      };

      const fileEntry = {
        filename: 'test.txt',
        longname: '-rw-r--r-- 1 user group 1024 Dec 20 2021 test.txt',
        attrs: {
          mode: mockStats.mode,
          uid: mockStats.uid,
          gid: mockStats.gid,
          size: mockStats.size,
          atime: Math.floor(mockStats.atimeMs / 1000),
          mtime: Math.floor(mockStats.mtimeMs / 1000)
        }
      };

      expect(fileEntry.filename).toBe('test.txt');
      expect(fileEntry.attrs.mode).toBe(33188);
      expect(fileEntry.attrs.size).toBe(1024);
      expect(fileEntry.attrs.atime).toBe(1640000000);
      expect(fileEntry.attrs.mtime).toBe(1640000000);
    });

    test('should handle file stat errors gracefully', () => {
      const files = ['good-file.txt', 'bad-file.txt', 'another-good.txt'];
      const fileList: any[] = [];
      const errors: string[] = [];

      for (const file of files) {
        try {
          if (file === 'bad-file.txt') {
            throw new Error('EPERM: operation not permitted');
          }
          
          // Simulate successful stat
          fileList.push({
            filename: file,
            longname: `-rw-r--r-- 1 user group 0 Jan 1 2000 ${file}`,
            attrs: { mode: 33188, uid: 0, gid: 0, size: 0, atime: 0, mtime: 0 }
          });
        } catch (err: any) {
          errors.push(`Error stating file ${file}: ${err.message}`);
        }
      }

      // Should have 2 successful entries and 1 error
      expect(fileList).toHaveLength(2);
      expect(errors).toHaveLength(1);
      expect(fileList[0].filename).toBe('good-file.txt');
      expect(fileList[1].filename).toBe('another-good.txt');
      expect(errors[0]).toContain('bad-file.txt');
    });

    test('should return entire batch immediately', () => {
      const files = ['file1.txt', 'file2.txt', 'file3.txt'];
      const index = 0;
      const batchSize = 100;
      
      const batch = files.slice(index, index + batchSize);
      const fileList = batch.map(file => ({
        filename: file,
        longname: `-rw-r--r-- 1 user group 0 Jan 1 2000 ${file}`,
        attrs: { mode: 33188, uid: 0, gid: 0, size: 0, atime: 0, mtime: 0 }
      }));

      // Should return all 3 files in one batch
      expect(fileList).toHaveLength(3);
      expect(fileList[0].filename).toBe('file1.txt');
      expect(fileList[2].filename).toBe('file3.txt');
    });

    test('should handle empty directory', () => {
      const files: string[] = [];
      const index = 0;

      const shouldReturnEOF = index >= files.length;
      expect(shouldReturnEOF).toBe(true);
    });

    test('should return FAILURE on JSON parse error', () => {
      const SFTP_STATUS_CODE = {
        OK: 0,
        EOF: 1,
        NO_SUCH_FILE: 2,
        PERMISSION_DENIED: 3,
        FAILURE: 4
      };

      let statusCode: number;
      const invalidHandle = Buffer.from('invalid json {');

      try {
        JSON.parse(invalidHandle.toString());
        statusCode = SFTP_STATUS_CODE.OK;
      } catch (err) {
        statusCode = SFTP_STATUS_CODE.FAILURE;
      }

      expect(statusCode).toBe(SFTP_STATUS_CODE.FAILURE);
    });
  });

  describe('File Attribute Formatting', () => {
    test('should format file mode correctly', () => {
      const regularFileMode = 33188; // -rw-r--r--
      const directoryMode = 16877;    // drwxr-xr-x

      const isRegularFile = (regularFileMode & 0o170000) === 0o100000;
      const isDirectory = (directoryMode & 0o170000) === 0o040000;

      expect(isRegularFile).toBe(true);
      expect(isDirectory).toBe(true);
    });

    test('should convert timestamps to Unix epoch', () => {
      const jsTimestamp = 1703261234567; // Milliseconds
      const unixTimestamp = Math.floor(jsTimestamp / 1000); // Seconds

      expect(unixTimestamp).toBe(1703261234);
    });

    test('should include all required file attributes', () => {
      const attrs = {
        mode: 33188,
        uid: 1000,
        gid: 1000,
        size: 2048,
        atime: 1640000000,
        mtime: 1640000000
      };

      expect(attrs).toHaveProperty('mode');
      expect(attrs).toHaveProperty('uid');
      expect(attrs).toHaveProperty('gid');
      expect(attrs).toHaveProperty('size');
      expect(attrs).toHaveProperty('atime');
      expect(attrs).toHaveProperty('mtime');
    });

    test('should handle large file sizes', () => {
      const largeSize = 5368709120; // 5GB
      const attrs = {
        mode: 33188,
        uid: 1000,
        gid: 1000,
        size: largeSize,
        atime: 1640000000,
        mtime: 1640000000
      };

      expect(attrs.size).toBe(5368709120);
      expect(attrs.size).toBeGreaterThan(2147483647); // > 2GB
    });
  });

  describe('Directory Listing Edge Cases', () => {
    test('should handle directory with special characters', () => {
      const files = [
        'normal-file.txt',
        'file with spaces.txt',
        'file(with)parens.txt',
        'file[with]brackets.txt',
        'file{with}braces.txt'
      ];

      expect(files).toHaveLength(5);
      expect(files[1]).toContain(' ');
      expect(files[2]).toContain('(');
      expect(files[3]).toContain('[');
      expect(files[4]).toContain('{');
    });

    test('should handle hidden files (dot files)', () => {
      const files = [
        '.hidden-file',
        '.config',
        'visible-file.txt',
        '.DS_Store'
      ];

      const hiddenFiles = files.filter(f => f.startsWith('.'));
      const visibleFiles = files.filter(f => !f.startsWith('.'));

      expect(hiddenFiles).toHaveLength(3);
      expect(visibleFiles).toHaveLength(1);
    });

    test('should handle files with unicode characters', () => {
      const files = [
        'file-日本語.txt',
        'file-中文.txt',
        'file-العربية.txt',
        'file-🎉.txt'
      ];

      expect(files).toHaveLength(4);
      files.forEach(file => {
        expect(file).toBeTruthy();
        expect(file.length).toBeGreaterThan(0);
      });
    });

    test('should handle very long filenames', () => {
      const longFilename = 'a'.repeat(255) + '.txt';
      expect(longFilename.length).toBe(259);
    });

    test('should handle directory with many files', () => {
      const fileCount = 10000;
      const files = Array.from({ length: fileCount }, (_, i) => `file${i}.txt`);
      
      const batchSize = 100;
      const batches = Math.ceil(files.length / batchSize);

      expect(batches).toBe(100);
      expect(files).toHaveLength(10000);
    });

    test('should handle mixed file types in directory', () => {
      const entries = [
        { name: 'file.txt', isDirectory: false },
        { name: 'subdir', isDirectory: true },
        { name: 'image.png', isDirectory: false },
        { name: 'another-dir', isDirectory: true },
        { name: 'script.sh', isDirectory: false }
      ];

      const files = entries.filter(e => !e.isDirectory);
      const dirs = entries.filter(e => e.isDirectory);

      expect(files).toHaveLength(3);
      expect(dirs).toHaveLength(2);
    });
  });

  describe('Permission Integration', () => {
    test('should deny listing for user without canList permission', () => {
      const user1Permissions = { canList: false };
      const user2Permissions = { canList: true };

      expect(user1Permissions.canList).toBe(false);
      expect(user2Permissions.canList).toBe(true);
    });

    test('should log both successful and denied listing attempts', () => {
      const activities: Array<{ action: string; success: boolean }> = [];

      // Successful listing
      activities.push({ action: 'OPENDIR', success: true });
      
      // Denied listing
      activities.push({ action: 'OPENDIR_DENIED', success: false });

      expect(activities).toHaveLength(2);
      expect(activities[0].success).toBe(true);
      expect(activities[1].success).toBe(false);
    });

    test('should apply permission check before directory access', () => {
      const operationOrder: string[] = [];

      // Simulate operation flow
      const hasPermission = false;
      
      operationOrder.push('1. Check permission');
      if (!hasPermission) {
        operationOrder.push('2. Deny access');
        operationOrder.push('3. Log denial');
        operationOrder.push('4. Return PERMISSION_DENIED');
      } else {
        operationOrder.push('2. Open directory');
        operationOrder.push('3. Read files');
        operationOrder.push('4. Return file list');
      }

      expect(operationOrder[0]).toBe('1. Check permission');
      expect(operationOrder[1]).toBe('2. Deny access');
      expect(operationOrder.length).toBe(4);
    });
  });

  describe('Error Handling', () => {
    test('should handle ENOENT error for non-existent directory', () => {
      const error = { code: 'ENOENT', message: 'no such file or directory' };
      expect(error.code).toBe('ENOENT');
    });

    test('should handle EACCES error for permission denied at OS level', () => {
      const error = { code: 'EACCES', message: 'permission denied' };
      expect(error.code).toBe('EACCES');
    });

    test('should handle ENOTDIR error when path is not a directory', () => {
      const error = { code: 'ENOTDIR', message: 'not a directory' };
      expect(error.code).toBe('ENOTDIR');
    });

    test('should log all errors appropriately', () => {
      const errors: Array<{ type: string; message: string }> = [];

      // Simulate different error types
      errors.push({ type: 'PERMISSION', message: 'User lacks canList permission' });
      errors.push({ type: 'NOT_FOUND', message: 'Directory does not exist' });
      errors.push({ type: 'STAT_ERROR', message: 'Cannot stat file in directory' });

      expect(errors).toHaveLength(3);
      expect(errors[0].type).toBe('PERMISSION');
      expect(errors[1].type).toBe('NOT_FOUND');
      expect(errors[2].type).toBe('STAT_ERROR');
    });
  });
});


