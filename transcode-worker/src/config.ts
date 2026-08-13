import dotenv from 'dotenv';
dotenv.config();

export interface Config {
  serviceBus: {
    namespace?: string;
    connectionString?: string;
    queueName: string;
  };
  storage: {
    accountName?: string;
    connectionString?: string;
    containerName: string;
    publicBaseUrl?: string;
    mediaCdnUrl?: string;
  };
  database: {
    videosTable: string;
    region: string;
  };
  scratchDir: string;
}

export const config: Config = {
  serviceBus: {
    namespace: process.env.AZURE_SERVICEBUS_NAMESPACE || '',
    connectionString: process.env.AZURE_SERVICEBUS_CONNECTION_STRING || '',
    queueName: process.env.AZURE_SERVICEBUS_QUEUE || 'transcode-queue',
  },
  storage: {
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || '',
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
    containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'vod-container',
    publicBaseUrl: process.env.AZURE_STORAGE_PUBLIC_URL || '',
    mediaCdnUrl: process.env.AZURE_MEDIA_CDN_URL || 'https://media.icurff.site',
  },
  database: {
    videosTable: process.env.DYNAMODB_VIDEOS_TABLE || 'streamforge-videos-dev',
    region: process.env.AWS_REGION || 'ap-southeast-1',
  },
  scratchDir: process.env.WORKER_SCRATCH_DIR || '/tmp/streamforge-worker',
};
