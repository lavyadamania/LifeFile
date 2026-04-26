import request from 'supertest';
import { createApp } from '../app';

describe('API baseline', () => {
  const app = createApp();

  it('returns health response', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Service healthy');
    expect(typeof res.body.data.uptimeSeconds).toBe('number');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('validates auth login payload before handler execution', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'not-an-email',
      password: 'short'
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation error');
  });
});
