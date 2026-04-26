import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface UserContext {
      userId: string;
      role: Role;
    }

    interface Request {
      user?: UserContext;
    }
  }
}

export {};
