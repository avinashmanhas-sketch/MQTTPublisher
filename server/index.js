import { createApp } from './createApp.js';

const PORT = 3001;
const app = createApp();

app.listen(PORT, () => {
  console.log(`MQTT Publisher API running on http://localhost:${PORT}`);
});
