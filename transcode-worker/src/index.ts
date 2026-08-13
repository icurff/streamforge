import { ServiceBusClient, ServiceBusReceiver, ProcessErrorArgs, ServiceBusReceivedMessage } from '@azure/service-bus';
import { DefaultAzureCredential } from '@azure/identity';
import { config } from './config.js';
import { StorageService } from './services/storage.service.js';
import { DatabaseService } from './services/database.service.js';
import { FFmpegService } from './services/ffmpeg.service.js';
import { TranscodeProcessor } from './services/transcode.processor.js';

async function main() {
  console.log('----------------------------------------------------');
  console.log('StreamForge Event-Driven Transcode Worker (Node.js)');
  console.log('----------------------------------------------------');
  console.log(`Queue: ${config.serviceBus.queueName}`);
  console.log(`Storage Container: ${config.storage.containerName}`);
  console.log(`Scratch Directory: ${config.scratchDir}`);

  // Initialize services
  const storageService = new StorageService();
  await storageService.ensureContainer();

  const databaseService = new DatabaseService();
  await databaseService.connect();

  const ffmpegService = new FFmpegService();
  const processor = new TranscodeProcessor(storageService, databaseService, ffmpegService);

  // Initialize Azure Service Bus Client
  let sbClient: ServiceBusClient;
  if (config.serviceBus.connectionString) {
    sbClient = new ServiceBusClient(config.serviceBus.connectionString);
  } else if (config.serviceBus.namespace) {
    const fullyQualifiedNamespace = config.serviceBus.namespace.includes('.servicebus.windows.net')
      ? config.serviceBus.namespace
      : `${config.serviceBus.namespace}.servicebus.windows.net`;

    const credential = new DefaultAzureCredential();
    sbClient = new ServiceBusClient(fullyQualifiedNamespace, credential);
  } else {
    throw new Error('Neither AZURE_SERVICEBUS_CONNECTION_STRING nor AZURE_SERVICEBUS_NAMESPACE provided');
  }

  // Create Receiver with peekLock mode (default) so messages can be completed or abandoned
  const receiver: ServiceBusReceiver = sbClient.createReceiver(config.serviceBus.queueName, {
    receiveMode: 'peekLock',
  });

  console.log(`[Worker] Listening for messages on queue "${config.serviceBus.queueName}"...`);

  const messageHandler = async (message: ServiceBusReceivedMessage) => {
    console.log(`\n[ServiceBus] Received message ID: ${message.messageId} (DeliveryCount: ${message.deliveryCount})`);

    const task = processor.parseMessage(message.body);
    if (!task) {
      console.warn(`[ServiceBus] Message could not be parsed into a transcode task. Completing message.`);
      await receiver.completeMessage(message);
      return;
    }

    try {
      await processor.processTask(task);
      await receiver.completeMessage(message);
      console.log(`[ServiceBus] Message ${message.messageId} completed successfully.`);
    } catch (err: any) {
      console.error(`[ServiceBus] Error processing message ${message.messageId}:`, err);
      // Abandon message so it can be retried or moved to DLQ by Service Bus after maxDeliveryCount
      await receiver.abandonMessage(message);
    }
  };

  const errorHandler = async (args: ProcessErrorArgs) => {
    console.error(`[ServiceBus Error] Source: ${args.errorSource}, Entity: ${args.entityPath}`, args.error);
  };

  const subscribeOptions = {
    autoCompleteMessages: false, // We manually complete after transcode finishes
    maxConcurrentCalls: 1,       // 1 video transcode per worker pod for predictable resource usage
  };

  receiver.subscribe(
    {
      processMessage: messageHandler,
      processError: errorHandler,
    },
    subscribeOptions
  );

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log('\n[Worker] Shutting down transcode worker...');
    try {
      await receiver.close();
      await sbClient.close();
      await databaseService.close();
      console.log('[Worker] Graceful shutdown completed.');
      process.exit(0);
    } catch (err) {
      console.error('[Worker] Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('[Worker Fatal Error]', err);
  process.exit(1);
});
