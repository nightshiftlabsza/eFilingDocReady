import { createApp } from './app';
import { env } from './lib/env';

const app = createApp();

app.listen(env.port, () => {
    console.log(`DocReady server listening on ${env.port}`);
});
