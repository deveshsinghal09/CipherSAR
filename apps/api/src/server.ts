import { createApp } from "./app";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

app.listen(port, () => {
  process.stdout.write(`CipherSAR API listening on http://localhost:${port}\n`);
});

