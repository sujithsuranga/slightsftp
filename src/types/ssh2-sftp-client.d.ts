declare module 'ssh2-sftp-client' {
  export default class Client {
    connect(config: any): Promise<void>;
    end(): Promise<void>;
    mkdir(path: string, recursive?: boolean): Promise<void>;
    put(localPath: string, remotePath: string): Promise<void>;
    list(path: string): Promise<any[]>;
    get(remotePath: string, localPath: string): Promise<void>;
    append(data: Buffer, remotePath: string): Promise<void>;
    rename(oldPath: string, newPath: string): Promise<void>;
    delete(path: string): Promise<void>;
    rmdir(path: string): Promise<void>;
  }
}
