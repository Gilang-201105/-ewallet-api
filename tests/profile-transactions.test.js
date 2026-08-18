require('./setup');
const request = require('supertest');
const app = require('../src/app');

async function registerAndLogin(phone) {
  await request(app).post('/register').send({
    first_name: 'Guntur',
    last_name: 'Saputro',
    phone_number: phone,
    address: 'Jl. Kebon Sirih No. 1',
    pin: '123456'
  });
  const res = await request(app).post('/login').send({ phone_number: phone, pin: '123456' });
  return res.body.result.access_token;
}

describe('PUT /profile', () => {
  it('updates first_name, last_name and address', async () => {
    const token = await registerAndLogin('0813000001');

    const res = await request(app)
      .put('/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ first_name: 'Tom', last_name: 'Araya', address: 'Jl. Diponegoro No. 215' });

    expect(res.status).toBe(200);
    expect(res.body.result).toMatchObject({
      first_name: 'Tom',
      last_name: 'Araya',
      address: 'Jl. Diponegoro No. 215'
    });
  });

  it('does not accept phone_number as an updatable field', async () => {
    const token = await registerAndLogin('0813000002');

    const res = await request(app)
      .put('/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone_number: '0899999999', first_name: 'Changed' });

    expect(res.status).toBe(200);
    expect(res.body.result.phone_number).toBeUndefined();
    expect(res.body.result.first_name).toBe('Changed');
  });
});

describe('GET /transactions', () => {
  it('lists top up, payment and transfer(debit) rows for the authenticated user only', async () => {
    const token = await registerAndLogin('0813000003');

    await request(app).post('/topup').set('Authorization', `Bearer ${token}`).send({ amount: 500000 });
    await request(app)
      .post('/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100000, remarks: 'Pulsa Telkomsel 100k' });

    const res = await request(app).get('/transactions').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.result.length).toBe(2);
    const categories = res.body.result.map((r) => Object.keys(r)[0]);
    expect(categories).toEqual(expect.arrayContaining(['top_up_id', 'payment_id']));
  });

  it('rejects requests without a valid token', async () => {
    const res = await request(app).get('/transactions');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Unauthenticated');
  });
});
