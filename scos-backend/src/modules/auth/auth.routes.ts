import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateRequest } from '../../middleware/validateRequest';
import * as authController from './auth.controller';
import {
	forgotPasswordSchema,
	loginSchema,
	logoutSchema,
	refreshSchema,
	registerSchema,
	resetPasswordSchema
} from './auth.validator';

const authRouter = Router();

authRouter.post('/register', validateRequest(registerSchema), asyncHandler(authController.register));
authRouter.post('/login', validateRequest(loginSchema), asyncHandler(authController.login));
authRouter.post('/refresh', validateRequest(refreshSchema), asyncHandler(authController.refresh));
authRouter.post('/logout', validateRequest(logoutSchema), asyncHandler(authController.logout));
authRouter.post(
	'/password/forgot',
	validateRequest(forgotPasswordSchema),
	asyncHandler(authController.forgotPassword)
);
authRouter.post(
	'/password/reset',
	validateRequest(resetPasswordSchema),
	asyncHandler(authController.resetPassword)
);

export { authRouter };
