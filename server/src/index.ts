import 'dotenv/config';
import { createApp } from './app';

const app = createApp();
const PORT = process.env.PORT ?? 4000;

app.listen(PORT, () => {
  console.log(`Express API listening on :${PORT}`);
});
