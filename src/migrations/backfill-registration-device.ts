import * as fs from 'fs';
import mongoose from 'mongoose';
import { parseUserAgent } from '../common/utils/device';

// Backfill User.registrationDevice from a Telegram admin-chat export (result.json),
// using "Новый пользователь зарегистрировался" notifications that contain User-Agent.
//
// Usage (dry-run by default):
//   node --env-file=.env dist/migrations/backfill-registration-device.js /path/to/result.json
//   node --env-file=.env dist/migrations/backfill-registration-device.js /path/to/result.json --apply

function messageText(message: any): string {
  const text = message?.text;
  if (Array.isArray(text)) {
    return text.map((part) => (typeof part === 'string' ? part : part?.text || '')).join('');
  }
  return typeof text === 'string' ? text : '';
}

async function backfill() {
  const [exportPath, flag] = process.argv.slice(2);
  const apply = flag === '--apply';

  if (!exportPath) {
    console.error('Usage: backfill-registration-device <result.json> [--apply]');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(exportPath, 'utf8'));

  // email (lowercase) -> User-Agent; later registrations win (re-registered accounts)
  const userAgentByEmail = new Map<string, string>();
  for (const message of data.messages || []) {
    const text = messageText(message);
    if (!text.includes('Новый пользователь зарегистрировался')) continue;
    const email = text.match(/email:\s*(\S+)/)?.[1];
    const userAgent = text.match(/User-Agent:\s*(.+)/)?.[1];
    if (email && userAgent) userAgentByEmail.set(email.toLowerCase(), userAgent.trim());
  }
  console.log(`Registrations with User-Agent in export: ${userAgentByEmail.size}`);

  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.collection('users');

  const allUsers = await users
    .find({}, { projection: { email: 1, name: 1, registrationDevice: 1 } })
    .toArray();
  console.log(`Users in database: ${allUsers.length}`);

  let matched = 0;
  let alreadySet = 0;
  let updated = 0;
  const stats = new Map<string, number>();

  for (const user of allUsers) {
    const userAgent = userAgentByEmail.get(String(user.email).toLowerCase());
    if (!userAgent) continue;
    matched++;

    if (user.registrationDevice) {
      alreadySet++;
      continue;
    }

    const device = parseUserAgent(userAgent);
    if (!device) continue;
    stats.set(device.os, (stats.get(device.os) || 0) + 1);
    console.log(`  ${user.name} <${user.email}>: ${device.os} / ${device.browser} / ${device.deviceType}`);

    if (apply) {
      await users.updateOne(
        { _id: user._id, registrationDevice: { $in: [null, undefined] } },
        { $set: { registrationDevice: device } },
      );
    }
    updated++;
  }

  console.log(`Matched users: ${matched}, already had device: ${alreadySet}`);
  console.log(`${apply ? 'Updated' : 'Would update'}: ${updated}`, Object.fromEntries(stats));
  console.log(`Users without device info in export: ${allUsers.length - matched}`);
  if (!apply) console.log('Dry run — pass --apply to write changes');

  await mongoose.disconnect();
}

backfill().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
