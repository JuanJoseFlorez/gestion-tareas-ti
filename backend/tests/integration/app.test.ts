import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';

describe('app shell', () => {
  it('GET /api/v1/health answers 200 when the database is up', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('unknown routes answer 404 with the standard error body', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'El recurso solicitado no existe.' } });
  });

  it('malformed JSON answers 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/service-requests')
      .set('Content-Type', 'application/json')
      .send('{"title": ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('El cuerpo de la solicitud no es un JSON válido.');
  });

  it('a JSON body over the size limit answers 413 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/service-requests')
      .set('Content-Type', 'application/json')
      .send({ title: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
