import { createServer as createViteServer } from 'vite';
import { createApp } from './app';
import { env } from './lib/env';

async function start() {
    const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
    });

    const app = createApp({ vite });
    app.listen(env.port, () => {
        console.log(`DocReady dev server listening on ${env.port}`);
    });
}

start().catch((error) => {
    console.error(error);
    process.exit(1);
});
