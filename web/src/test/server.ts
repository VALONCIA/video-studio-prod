import { setupServer } from 'msw/node';
import { apiHandlers } from './fixtures';

export const server = setupServer(...apiHandlers());
