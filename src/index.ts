import createApp from './app.js';
import { PORT } from './config/constants.js';

const app = createApp();

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`✨ SnapDrag API Server running on port ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}/api/v1`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`======================================================\n`);
});
