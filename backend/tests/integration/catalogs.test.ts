import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { createCatalogFixtures, resetDatabase } from '../helpers/db.js';

describe('catalog endpoints', () => {
  beforeEach(async () => {
    await resetDatabase();
    await createCatalogFixtures();
  });

  it('GET /technicians returns all technicians as a plain array ordered by name', async () => {
    const res = await request(app).get('/api/v1/technicians');
    expect(res.status).toBe(200);
    expect(res.body.map((t: { fullName: string }) => t.fullName)).toEqual(['Jorge Ramírez', 'Laura Gómez', 'Pedro Pérez']);
    expect(res.body[0]).toEqual({ id: expect.any(Number), fullName: 'Jorge Ramírez', email: 'jorge@test.com', isActive: false });
  });

  it('GET /technicians?active=true returns only active technicians', async () => {
    const res = await request(app).get('/api/v1/technicians?active=true');
    expect(res.body.map((t: { fullName: string }) => t.fullName)).toEqual(['Laura Gómez', 'Pedro Pérez']);
  });

  it('GET /technicians?active=false returns only inactive technicians', async () => {
    const res = await request(app).get('/api/v1/technicians?active=false');
    expect(res.body.map((t: { fullName: string }) => t.fullName)).toEqual(['Jorge Ramírez']);
  });

  it('GET /service-types returns the contract shape and honours the active filter', async () => {
    const all = await request(app).get('/api/v1/service-types');
    expect(all.status).toBe(200);
    expect(all.body).toHaveLength(3);
    expect(all.body[0]).toEqual({ id: expect.any(Number), name: 'Instalación de Software', description: null, isActive: true });
    const active = await request(app).get('/api/v1/service-types?active=true');
    expect(active.body.map((s: { name: string }) => s.name)).toEqual(['Instalación de Software', 'Mantenimiento Impresora']);
  });

  it('rejects an invalid active value with 400 on field "active"', async () => {
    const res = await request(app).get('/api/v1/technicians?active=yes');
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('active');
  });
});
