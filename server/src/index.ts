import 'dotenv/config';
import { createApplication } from './app';
import { readConfig } from './config';

// Export synchronously for serverless adapters. The GraphQL route handles initialization.
export const config = readConfig();
export const application = createApplication(config);
export default application.app;
