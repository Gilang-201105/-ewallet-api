require('./setup');
const request = require('supertest');
const app = require('../src/app');

describe('POST /register', () => {
  const payload = {
    first_name: 'Guntur',
    last_name: 'Saputro',
    phone_number: '0811255501',
    address: 'Jl. Kebon Sirih No. 1',
    pin: '123456'
  };

  it('creates a new user and returns a SUCCESS envelope', async () => {
    const res = await request(app).post('/register').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('SUCCESS');
    expect(res.body.result).toMatchObject({
      first_name: 'Guntur',
      last_name: 'Saputro',
      phone_number: '0811255501',
      address: 'Jl. Kebon Sirih No. 1'
    });
    expect(res.body.result.user_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(res.body.result.pin).toBeUndefined();
  });

  it('rejects a duplicate phone_number', async () => {
    const res = await request(app).post('/register').send(payload);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Phone Number already registered');
  });

  it('rejects a pin that is not exactly 6 digits', async () => {
    const res = await request(app)
      .post('/register')
      .send({ ...payload, phone_number: '0811255599', pin: '123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/pin/i);
  });
});

describe('POST /login', () => {
  beforeAll(async () => {
    await request(app).post('/register').send({
      first_name: 'Tom',
      last_name: 'Araya',
      phone_number: '0811255502',
      address: 'Jl. Diponegoro No. 215',
      pin: '654321'
    });
  });

  it('returns access_token and refresh_token on correct credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send({ phone_number: '0811255502', pin: '654321' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUCCESS');
    expect(typeof res.body.result.access_token).toBe('string');
    expect(typeof res.body.result.refresh_token).toBe('string');
  });

  it('rejects an incorrect pin', async () => {
    const res = await request(app)
      .post('/login')
      .send({ phone_number: '0811255502', pin: '000000' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Phone number and pin doesn't match.");
  });

  it('rejects an unknown phone number', async () => {
    const res = await request(app)
      .post('/login')
      .send({ phone_number: '0899999999', pin: '111111' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Phone number and pin doesn't match.");
  });
});
