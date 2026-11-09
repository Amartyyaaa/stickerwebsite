/**
 * Daily housekeeping (see src/lib/maintenance.ts). The server runs it every night;
 * run it by hand any time:
 *
 *   npm run maintenance
 */
import './load-env';
import { runMaintenance } from '@/lib/maintenance';

runMaintenance()
  .then((message) => console.log(`Maintenance: ${message}.`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
