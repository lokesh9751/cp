import { z } from 'zod';
import {
  listUsersForSuperuser,
  setUserRoleBySuperuser,
} from '../services/superuser.service.js';

const roleBodySchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

export async function listUsers(req, res, next) {
  try {
    const users = await listUsersForSuperuser(req.query.search || '');
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(req, res, next) {
  try {
    const parsed = roleBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Role must be USER or ADMIN' },
      });
    }

    const updated = await setUserRoleBySuperuser(
      req.params.id,
      parsed.data.role,
      req.user.id
    );

    if (!updated) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    res.json({ user: updated });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: { code: 'ROLE_UPDATE_ERROR', message: err.message },
      });
    }
    next(err);
  }
}
