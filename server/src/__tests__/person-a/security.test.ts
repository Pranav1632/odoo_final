import request from 'supertest';
import app from '../../app';

describe('Security & RBAC Integration Tests', () => {
  describe('Unauthenticated access', () => {
    test('GET /api/employees with no token returns 401', async () => {
      const res = await request(app).get('/api/employees');
      expect(res.status).toBe(401);
    });

    test('POST /api/auth/login with missing password returns 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@peoplepay360.com' });
      expect(res.status).toBe(400);
    });

    test('GET /api/contracts with invalid token returns 401', async () => {
      const res = await request(app)
        .get('/api/contracts')
        .set('Authorization', 'Bearer not.a.real.jwt');
      expect(res.status).toBe(401);
    });
  });
});
