import { prisma } from '../lib/prisma.js';

export async function listUsersForSuperuser(search = '') {
  const q = String(search || '').trim();
  const where = q
    ? {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ role: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: { submissions: true, contestRegistrations: true },
      },
    },
  });

  return users.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    submissionsCount: u._count.submissions,
    contestsCount: u._count.contestRegistrations,
    createdAt: u.createdAt,
  }));
}

export async function setUserRoleBySuperuser(targetUserId, nextRole, actorUserId) {
  if (targetUserId === actorUserId) {
    const err = new Error('You cannot change your own role.');
    err.status = 400;
    throw err;
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  });

  if (!target) return null;

  if (target.role === 'SUPERUSER') {
    const err = new Error('Cannot modify another Superuser role.');
    err.status = 403;
    throw err;
  }

  return prisma.user.update({
    where: { id: targetUserId },
    data: { role: nextRole },
    select: { id: true, username: true, email: true, role: true },
  });
}
