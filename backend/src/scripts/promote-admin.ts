import prisma from '../config/prisma.js';

async function promoteUser(email: string) {
  const user = await prisma.user.update({
    where: { email },
    data: { role: 'admin' },
  });
  console.log(`✅ Promoted ${user.email} (ID: ${user.id}) to admin`);
}

// Run with: npx tsx scripts/promote-admin.ts
const email = 'lakhan.sharma@gmail.com'; // Change this
promoteUser(email).catch(console.error);



//npx tsx scripts/promote-admin.ts