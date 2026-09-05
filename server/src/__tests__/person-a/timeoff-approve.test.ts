import request from 'supertest';
import app from '../../app';

describe('Timeoff Approve Permissions & Validation', () => {
  test('PATCH /api/timeoff/requests/:id/approve without auth returns 401', async () => {
    const res = await request(app).patch('/api/timeoff/requests/test-id/approve');
    expect(res.status).toBe(401);
  });

  test('PATCH /api/timeoff/requests/:id/refuse without auth returns 401', async () => {
    const res = await request(app).patch('/api/timeoff/requests/test-id/refuse');
    expect(res.status).toBe(401);
  });
});
