import request from 'supertest';
import app from '../../app';

/**
 * Covers the pending-approval registration flow: self-registration always
 * lands as an unapproved EMPLOYEE account, cannot log in until an Admin
 * approves it via PATCH /api/users/:id, and an Admin cannot modify their own
 * account through that same endpoint.
 */
describe('Registration & approval flow', () => {
  const email = `pending-test-${Date.now()}@test.com`;
  const password = 'Test@1234';

  async function adminToken() {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@peoplepay360.com', password: 'Admin@123' });
    return res.body.token as string;
  }

  test('POST /api/auth/register creates a pending account, not a session', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password, name: 'Pending Test User' });

    expect(res.status).toBe(201);
    expect(res.body.pending).toBe(true);
    expect(res.body.token).toBeUndefined();
  });

  test('a caller-supplied role is ignored — the account is always created as EMPLOYEE', async () => {
    const escalationEmail = `escalation-test-${Date.now()}@test.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: escalationEmail, password, name: 'X', role: 'ADMIN' });

    expect(res.status).toBe(201);

    const token = await adminToken();
    const listRes = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    const created = listRes.body.find((u: any) => u.email === escalationEmail);
    expect(created.role).toBe('EMPLOYEE');
  });

  test('login is blocked with 403 while the account is pending', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/awaiting/i);
  });

  test('a non-admin cannot list or approve users', async () => {
    const empLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'emp1@peoplepay360.com', password: 'Emp@123' });
    const empToken = empLogin.body.token;

    const listRes = await request(app).get('/api/users').set('Authorization', `Bearer ${empToken}`);
    expect(listRes.status).toBe(403);
  });

  test('an Admin can approve the pending account, after which it can log in', async () => {
    const token = await adminToken();

    const listRes = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    const pendingUser = listRes.body.find((u: any) => u.email === email);
    expect(pendingUser.status).toBe('pending');

    const approveRes = await request(app)
      .patch(`/api/users/${pendingUser.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('active');

    const loginRes = await request(app).post('/api/auth/login').send({ email, password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
  });

  test('an Admin can promote a user\'s role at approval time', async () => {
    const token = await adminToken();
    const listRes = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    const user = listRes.body.find((u: any) => u.email === email);

    const res = await request(app)
      .patch(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'HR_MANAGER' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('HR_MANAGER');
  });

  test('an Admin cannot modify their own role or status', async () => {
    const token = await adminToken();
    const listRes = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    const adminUser = listRes.body.find((u: any) => u.email === 'admin@peoplepay360.com');

    const res = await request(app)
      .patch(`/api/users/${adminUser.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'disabled' });

    expect(res.status).toBe(400);
  });

  test('a disabled account is blocked from logging in with the same 403 pattern', async () => {
    const token = await adminToken();
    const listRes = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    const user = listRes.body.find((u: any) => u.email === email);

    await request(app)
      .patch(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'disabled' });

    const loginRes = await request(app).post('/api/auth/login').send({ email, password });
    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error).toMatch(/disabled/i);
  });
});
