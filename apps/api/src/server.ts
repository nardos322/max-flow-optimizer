import { createApp } from './app.js';
import { assertRuntimeConfig, loadConfig } from './config.js';

const config = loadConfig();
assertRuntimeConfig(config);

const app = createApp({ config });

app.listen(config.port, () => {
  console.log(`api listening on port ${config.port}`);
});
