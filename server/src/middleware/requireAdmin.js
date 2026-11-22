import { prisma } from '../lib/prisma.js';

async function loadUserRole(req, res) {
  if (!req.user?.id) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { role: true },
  });

  if (!dbUser) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User not found' },
    });
    return null;
  }

  req.user.role = dbUser.role;
  return dbUser.role;
}

export async function requireAdmin(req, res, next) {
  try {
    const role = await loadUserRole(req, res);
    if (!role) return;
    if (role !== 'ADMIN' && role !== 'SUPERUSER') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Admin access required' },
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireSuperuser(req, res, next) {
  try {
    const role = await loadUserRole(req, res);
    if (!role) return;
    if (role !== 'SUPERUSER') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Superuser access required' },
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}
