import { configureBaleWebhook } from './bale';

try {
  await configureBaleWebhook();
} catch (error) {
  console.error(JSON.stringify({ event: 'bale_webhook_setup_failed', type: error instanceof Error ? error.name : 'Error' }));
  process.exitCode = 1;
}
