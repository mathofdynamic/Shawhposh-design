import { sqlite } from '../../db/connection';
import { expireReservations } from './service';

try {
  const result = expireReservations();
  console.log(JSON.stringify({ event: 'reservation_expiration_complete', ...result, at: new Date().toISOString() }));
} catch (error) {
  console.error(JSON.stringify({ event: 'reservation_expiration_failed', type: error instanceof Error ? error.name : 'Error' }));
  process.exitCode = 1;
} finally {
  sqlite.close();
}
