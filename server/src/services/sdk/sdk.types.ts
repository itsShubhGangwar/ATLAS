export interface SdkOptions {
  clientName?: string;
  baseUrl?: string;
}

export interface SdkFile {
  filename: string;
  content: string;
  language: "typescript";
}

export interface GeneratedSdk {
  clientName: string;
  version: string;
  files: SdkFile[];
}
