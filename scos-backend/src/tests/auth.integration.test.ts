import request from 'supertest';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/ApiError';

jest.mock('../modules/auth/auth.service', () => ({
  registerPatient: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn()
}));

import { createApp } from '../app';
import * as authService from '../modules/auth/auth.service';

describe('Auth routes', () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a patient and returns created response', async () => {
    const mockedRegisterPatient = jest.mocked(authService.registerPatient);
    mockedRegisterPatient.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'patient@example.com',
        role: 'PATIENT'
      },
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      }
    });

    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'patient@example.com',
      password: 'StrongPass123',
      role: 'PATIENT',
      fullName: 'Patient One',
      phone: '+10000000000'
    });

    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Registered successfully');
    expect(res.body.data.user.email).toBe('patient@example.com');
    expect(mockedRegisterPatient).toHaveBeenCalledWith({
      email: 'patient@example.com',
      password: 'StrongPass123',
      role: 'PATIENT',
      fullName: 'Patient One',
      phone: '+10000000000'
    });
  });

  it('logs in and returns access + refresh tokens', async () => {
    const mockedLogin = jest.mocked(authService.login);
    mockedLogin.mockResolvedValue({
      user: {
        id: 'user-2',
        email: 'doctor@example.com',
        role: 'DOCTOR'
      },
      tokens: {
        accessToken: 'access-token-2',
        refreshToken: 'refresh-token-2'
      }
    });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'doctor@example.com',
      password: 'StrongPass123'
    });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Login successful');
    expect(res.body.data.tokens.accessToken).toBe('access-token-2');
  });

  it('returns unauthorized when auth service rejects credentials', async () => {
    const mockedLogin = jest.mocked(authService.login);
    mockedLogin.mockRejectedValue(
      new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials')
    );

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'patient@example.com',
      password: 'WrongPass123'
    });

    expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('refreshes tokens', async () => {
    const mockedRefresh = jest.mocked(authService.refresh);
    mockedRefresh.mockResolvedValue({
      tokens: {
        accessToken: 'next-access-token',
        refreshToken: 'next-refresh-token'
      }
    });

    const res = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: 'x'.repeat(25)
    });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Tokens refreshed');
    expect(res.body.data.tokens.refreshToken).toBe('next-refresh-token');
  });

  it('logs out and returns success payload', async () => {
    const mockedLogout = jest.mocked(authService.logout);
    mockedLogout.mockResolvedValue(undefined);

    const res = await request(app).post('/api/v1/auth/logout').send({
      refreshToken: 'x'.repeat(25)
    });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Logout successful');
    expect(mockedLogout).toHaveBeenCalledWith({
      refreshToken: 'x'.repeat(25)
    });
  });

  it('issues password reset instructions', async () => {
    const mockedRequestPasswordReset = jest.mocked(authService.requestPasswordReset);
    mockedRequestPasswordReset.mockResolvedValue({
      issued: true,
      resetToken: 'reset-token-dev'
    });

    const res = await request(app).post('/api/v1/auth/password/forgot').send({
      email: 'patient@example.com'
    });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Password reset instructions issued');
    expect(res.body.data.issued).toBe(true);
    expect(mockedRequestPasswordReset).toHaveBeenCalledWith({
      email: 'patient@example.com'
    });
  });

  it('resets password with valid token payload', async () => {
    const mockedResetPassword = jest.mocked(authService.resetPassword);
    mockedResetPassword.mockResolvedValue(undefined);

    const res = await request(app).post('/api/v1/auth/password/reset').send({
      token: 'x'.repeat(25),
      newPassword: 'NewStrongPass123'
    });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Password updated successfully');
    expect(mockedResetPassword).toHaveBeenCalledWith({
      token: 'x'.repeat(25),
      newPassword: 'NewStrongPass123'
    });
  });
});
