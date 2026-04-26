import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

export function validateRequest(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers
    });

    if (!result.success) {
      next(result.error);
      return;
    }

    next();
  };
}
