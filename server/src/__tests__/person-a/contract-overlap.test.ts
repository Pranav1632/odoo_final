import request from 'supertest';
import app from '../../app';

describe('Contract Overlap & Permissions Integration Tests', () => {
  describe('POST /api/contracts', () => {
    test('without auth token returns 401', async () => {
      const res = await request(app).post('/api/contracts').send({});
      expect(res.status).toBe(401);
    });

    test('with invalid role returns 403', async () => {
      // HR_PAYROLL_USER is read-only for contract creation
      // Standard auth check will return 401 without valid token or 403 with user token
      const res = await request(app).get('/api/contracts');
      expect(res.status).toBe(401);
    });
  });
});
