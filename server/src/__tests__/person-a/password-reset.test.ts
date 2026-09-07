import request from 'supertest';
import app from '../../app';

describe('Password Management Endpoints', () => {
  describe('POST /api/auth/change-password', () => {
    test('returns 401 when unauthorized', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .send({ oldPassword: 'password123', newPassword: 'newpassword123' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/users/:id/reset-password', () => {
    test('returns 401 when unauthorized', async () => {
      const res = await request(app)
        .post('/api/users/user-123/reset-password')
        .send({ newPassword: 'newpassword123' });
      expect(res.status).toBe(401);
    });
  });
});
