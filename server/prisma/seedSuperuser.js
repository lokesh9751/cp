import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'lokeshharbola350@gmail.com';
  const passwordHash = await bcrypt.hash('superuser01', 10);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const updated = await prisma.user.update({
      where: { email },
      data: { passwordHash, role: 'SUPERUSER' },
      select: { id: true, username: true, email: true, role: true },
    });
    console.log('Updated existing user to SUPERUSER:', updated);
  } else {
    const created = await prisma.user.create({
      data: {
        username: 'lokesh_superuser',
        email,
        passwordHash,
        role: 'SUPERUSER',
      },
      select: { id: true, username: true, email: true, role: true },
    });
    console.log('Created SUPERUSER account:', created);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
