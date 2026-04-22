import { registerAs } from '@nestjs/config';

export default registerAs('throttler', () => ({
  ttl: parseInt(process.env.THROTTLE_TTL!, 10) || 60,
  limit: parseInt(process.env.THROTTLE_LIMIT!, 10) || 100,
}));
