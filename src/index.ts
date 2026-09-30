import createApp from './app.js';
import { PORT } from './config/constants.js';

const app = createApp();

app.listen(PORT, async () => {
  console.log(`\n======================================================`);
  console.log(`✨ SnapDrag API Server running on port ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}/api/v1`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`======================================================\n`);

  // Ensure DB tables exist and seed data if empty
  await ensureDatabaseReady();
});

async function ensureDatabaseReady() {
  try {
    const { prisma } = await import('./config/prisma.js');
    const count = await prisma.category.count();
    if (count > 0) {
      console.log(`✅ Database tables exist and contains ${count} categories.`);
      return;
    }
  } catch (err: any) {
    console.log('⚠️ Database tables missing or uninitialized. Initializing schema and seed...');
  }

  try {
    const { execSync } = await import('child_process');
    console.log('🚀 Running npx prisma db push --accept-data-loss...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('🌱 Running npx tsx prisma/seed.ts...');
    execSync('npx tsx prisma/seed.ts', {
      stdio: 'inherit',
      env: { ...process.env, FORCE_SEED: 'true' },
    });
    console.log('🎉 Database initialized and seeded successfully with all boutiques!');
  } catch (setupErr) {
    console.error('❌ Automatic database setup error:', setupErr);
  }
}
