require('./setup');
const request = require('supertest');
const app = require('../src/app');
const { processNext } = require('../src/queue/queueService');
const { TransferJob } = require('../src/models');

async function registerAndLogin(phone) {
  await request(app).post('/register').send({
    first_name: 'Test',
    last_name: 'User',
    phone_number: phone,
    address: 'Test address',
    pin: '111111'
  });
  const login = await request(app).post('/login').send({ phone_number: phone, pin: '111111' });
  return login.body.result.access_token;
}

async function getUserId(phone, token) {
  // profile update response includes user_id; cheapest way to fetch it here
  const res = await request(app)
    .put('/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({ first_name: 'Test' });
  return res.body.result.user_id;
}

describe('POST /transfer + background worker', () => {
  it('debits the sender immediately and queues a job', async () => {
    const tokenA = await registerAndLogin('0812000001');
    const tokenB = await registerAndLogin('0812000002');
    const userIdB = await getUserId('0812000002', tokenB);

    await request(app).post('/topup').set('Authorization', `Bearer ${tokenA}`).send({ amount: 500000 });

    const res = await request(app)
      .post('/transfer')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ target_user: userIdB, amount: 30000, remarks: 'Hadiah Ultah' });

    expect(res.status).toBe(200);
    expect(res.body.result).toMatchObject({
      amount: 30000,
      remarks: 'Hadiah Ultah',
      balance_before: 500000,
      balance_after: 470000
    });

    // there should be exactly one QUEUED job right after the request
    const queuedJobs = await TransferJob.findAll({ where: { status: 'QUEUED' } });
    expect(queuedJobs.length).toBe(1);
  });

  it('rejects a transfer larger than the sender balance', async () => {
    const tokenA = await registerAndLogin('0812000003');
    const tokenB = await registerAndLogin('0812000004');
    const userIdB = await getUserId('0812000004', tokenB);

    const res = await request(app)
      .post('/transfer')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ target_user: userIdB, amount: 1000000, remarks: 'too much' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Balance is not enough');
  });

  it('credits the receiver once the background worker processes the queued job', async () => {
    const tokenA = await registerAndLogin('0812000005');
    const tokenB = await registerAndLogin('0812000006');
    const userIdB = await getUserId('0812000006', tokenB);

    await request(app).post('/topup').set('Authorization', `Bearer ${tokenA}`).send({ amount: 200000 });
    await request(app)
      .post('/transfer')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ target_user: userIdB, amount: 50000, remarks: 'test' });

    // Simulate the worker draining the queue (instead of running the real polling loop).
    // Other tests in this file may have queued jobs earlier, so drain until empty
    // rather than assuming this test's job is the only/next one.
    let processedJob = await processNext();
    while (processedJob) {
      processedJob = await processNext();
    }

    const txB = await request(app).get('/transactions').set('Authorization', `Bearer ${tokenB}`);
    expect(txB.body.result.length).toBe(1);
    expect(txB.body.result[0]).toMatchObject({
      transaction_type: 'CREDIT',
      amount: 50000,
      balance_before: 0,
      balance_after: 50000
    });
  });
});
