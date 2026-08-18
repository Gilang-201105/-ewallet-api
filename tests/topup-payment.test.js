require('./setup');
const request = require('supertest');
const app = require('../src/app');

async function registerAndLogin(phone) {
  await request(app).post('/register').send({
    first_name: 'Test',
    last_name: 'User',
    phone_number: phone,
    address: 'Test address',
    pin: '111111'
  });
  const res = await request(app).post('/login').send({ phone_number: phone, pin: '111111' });
  return res.body.result.access_token;
}

describe('POST /topup', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).post('/topup').send({ amount: 500000 });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Unauthenticated');
  });

  it('adds the amount to the balance', async () => {
    const token = await registerAndLogin('0811000001');

    const res = await request(app)
      .post('/topup')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 500000 });

    expect(res.status).toBe(200);
    expect(res.body.result).toMatchObject({
      amount_top_up: 500000,
      balance_before: 0,
      balance_after: 500000
    });
    expect(res.body.result.top_up_id).toBeDefined();
  });

  it('rejects a non-positive amount', async () => {
    const token = await registerAndLogin('0811000002');
    const res = await request(app)
      .post('/topup')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: -100 });

    expect(res.status).toBe(400);
  });
});

describe('POST /pay', () => {
  it('debits the balance on a successful payment', async () => {
    const token = await registerAndLogin('0811000003');
    await request(app).post('/topup').set('Authorization', `Bearer ${token}`).send({ amount: 500000 });

    const res = await request(app)
      .post('/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100000, remarks: 'Pulsa Telkomsel 100k' });

    expect(res.status).toBe(200);
    expect(res.body.result).toMatchObject({
      amount: 100000,
      remarks: 'Pulsa Telkomsel 100k',
      balance_before: 500000,
      balance_after: 400000
    });
  });

  it('rejects payment when balance is insufficient', async () => {
    const token = await registerAndLogin('0811000004');

    const res = await request(app)
      .post('/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100000, remarks: 'too much' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Balance is not enough');
  });
});
