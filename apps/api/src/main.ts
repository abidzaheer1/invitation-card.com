import { createApp } from "./bootstrap";

async function bootstrap() {
  const app = await createApp();
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
  console.log(`API listening on port ${port}`);
}

bootstrap();
