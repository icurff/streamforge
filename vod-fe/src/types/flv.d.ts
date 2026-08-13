declare module 'flv.js' {
  export interface MediaDataSource {
    type: 'flv' | 'mp4';
    url: string;
    isLive?: boolean;
    cors?: boolean;
    withCredentials?: boolean;
    hasAudio?: boolean;
    hasVideo?: boolean;
    duration?: number;
    filesize?: number;
    segments?: Array<{
      duration: number;
      filesize?: number;
      url: string;
    }>;
  }

  export interface Config {
    enableWorker?: boolean;
    enableStashBuffer?: boolean;
    stashInitialSize?: number;
    isLive?: boolean;
    lazyLoad?: boolean;
    lazyLoadMaxDuration?: number;
    lazyLoadRecoverDuration?: number;
    deferLoadAfterSourceOpen?: boolean;
    autoCleanupSourceBuffer?: boolean;
    autoCleanupMaxBackwardDuration?: number;
    autoCleanupMinBackwardDuration?: number;
    fixAudioTimestampGap?: boolean;
    accurateSeek?: boolean;
    seekType?: string;
    seekParamStart?: string;
    seekParamEnd?: string;
    rangeLoadZeroStart?: boolean;
    customSeekHandler?: any;
    reuseRedirectedURL?: boolean;
    referrerPolicy?: string;
    headers?: Record<string, string>;
  }

  export interface Player {
    attachMediaElement(element: HTMLMediaElement): void;
    detachMediaElement(): void;
    load(): void;
    unload(): void;
    play(): Promise<void>;
    pause(): void;
    destroy(): void;
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
  }

  export enum Events {
    ERROR = 'error',
    LOADING_COMPLETE = 'loading_complete',
    RECOVERED_EARLY_EOF = 'recovered_early_eof',
    MEDIA_INFO = 'media_info',
    STATISTICS_INFO = 'statistics_info',
  }

  export enum ErrorTypes {
    NETWORK_ERROR = 'NetworkError',
    MEDIA_ERROR = 'MediaError',
    OTHER_ERROR = 'OtherError',
  }

  export function isSupported(): boolean;
  export function createPlayer(dataSource: MediaDataSource, config?: Config): Player;

  const flvjs: {
    isSupported: typeof isSupported;
    createPlayer: typeof createPlayer;
    Events: typeof Events;
    ErrorTypes: typeof ErrorTypes;
  };

  export default flvjs;
}

