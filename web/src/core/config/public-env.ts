import { parsePublicEnv } from './env';

export const publicEnv = parsePublicEnv(import.meta.env, import.meta.env.PROD);
