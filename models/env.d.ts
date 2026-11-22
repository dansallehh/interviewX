/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __COMMIT_SHA__: string;

declare module 'sql.js' {
  interface SqlJsDatabase {
    run(sql: string): void;
    exec(sql: string): Array<{ columns: string[]; values: (string | number | null)[][] }>;
    close(): void;
  }
  interface SqlJsStatic {
    Database: new () => SqlJsDatabase;
  }
  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string;
  }): Promise<SqlJsStatic>;
}
