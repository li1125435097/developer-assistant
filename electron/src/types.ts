export interface WindowConfig {
  title: string;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
}

export interface AppConfig {
  url: string;
  window: WindowConfig;
}
