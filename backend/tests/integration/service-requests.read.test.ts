import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { createCatalogFixtures, createServiceRequest, resetDatabase } from '../helpers/db.js';

let fx: Awaited<ReturnType<typeof createCatalogFixtures>>;

const titles = (res: request.Response) => res.body.data.map((r: { title: string }) => r.title);

describe('GET /api/v1/service-requests', () => {
  beforeEach(async () => {
    await resetDatabase();
    fx = await createCatalogFixtures();
    // Created in this order, so default sort (createdAt desc) is the reverse
    await createServiceRequest({ title: 'Impresora atascada', priority: 'HIGH', status: 'PENDING', serviceTypeId: fx.printer.id });
    await createServiceRequest({ title: 'Instalar Office', priority: 'LOW', status: 'IN_PROGRESS', technicianId: fx.pedro.id, serviceTypeId: fx.software.id });
    await createServiceRequest({ title: 'Plotter', description: 'Revisión del PLOTTER de ingeniería', priority: 'MEDIUM', status: 'COMPLETED', technicianId: fx.jorge.id, serviceTypeId: fx.printer.id });
    await createServiceRequest({ title: 'Descuento 100% en licencias', requesterName: 'Marta Díaz', priority: 'LOW', status: 'CANCELLED', serviceTypeId: fx.software.id });
  });

  it('returns { data, meta } with default sort createdAt desc and the contract shape', async () => {
    const res = await request(app).get('/api/v1/service-requests');
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 10, total: 4, totalPages: 1 });
    expect(titles(res)).toEqual(['Descuento 100% en licencias', 'Plotter', 'Instalar Office', 'Impresora atascada']);
    const office = res.body.data[2];
    expect(Object.keys(office).sort()).toEqual(
      ['createdAt', 'description', 'id', 'priority', 'requesterEmail', 'requesterName', 'serviceType', 'status', 'technician', 'title', 'updatedAt'],
    );
    expect(office.technician).toEqual({ id: fx.pedro.id, fullName: 'Pedro Pérez', isActive: true });
    expect(office.serviceType).toEqual({ id: fx.software.id, name: 'Instalación de Software', isActive: true });
    expect(res.body.data[3].technician).toBeNull();
  });

  it('filters by status, priority, technician, unassigned and service type', async () => {
    expect(titles(await request(app).get('/api/v1/service-requests?status=COMPLETED'))).toEqual(['Plotter']);
    expect(titles(await request(app).get('/api/v1/service-requests?priority=LOW'))).toEqual(['Descuento 100% en licencias', 'Instalar Office']);
    expect(titles(await request(app).get(`/api/v1/service-requests?technicianId=${fx.pedro.id}`))).toEqual(['Instalar Office']);
    expect(titles(await request(app).get('/api/v1/service-requests?technicianId=unassigned'))).toEqual(['Descuento 100% en licencias', 'Impresora atascada']);
    expect(titles(await request(app).get(`/api/v1/service-requests?serviceTypeId=${fx.printer.id}&status=PENDING`))).toEqual(['Impresora atascada']);
  });

  it('searches case-insensitively in title, description and requesterName', async () => {
    expect(titles(await request(app).get('/api/v1/service-requests?search=IMPRESORA'))).toEqual(['Impresora atascada']);
    expect(titles(await request(app).get('/api/v1/service-requests?search=plotter de'))).toEqual(['Plotter']);
    expect(titles(await request(app).get('/api/v1/service-requests?search=marta'))).toEqual(['Descuento 100% en licencias']);
  });

  it('treats LIKE wildcards in search literally', async () => {
    expect(titles(await request(app).get('/api/v1/service-requests?search=%25'))).toEqual(['Descuento 100% en licencias']);
    expect(titles(await request(app).get('/api/v1/service-requests?search=_'))).toEqual([]);
    expect(titles(await request(app).get('/api/v1/service-requests?search=%5C'))).toEqual([]);
  });

  it('sorts by priority following the enum order', async () => {
    const asc = await request(app).get('/api/v1/service-requests?sortBy=priority&order=asc');
    expect(asc.body.data.map((r: { priority: string }) => r.priority)).toEqual(['LOW', 'LOW', 'MEDIUM', 'HIGH']);
  });

  it('paginates and answers an out-of-range page with empty data', async () => {
    const page2 = await request(app).get('/api/v1/service-requests?page=2&pageSize=3');
    expect(page2.body.meta).toEqual({ page: 2, pageSize: 3, total: 4, totalPages: 2 });
    expect(titles(page2)).toEqual(['Impresora atascada']);
    const outOfRange = await request(app).get('/api/v1/service-requests?page=99');
    expect(outOfRange.status).toBe(200);
    expect(outOfRange.body.data).toEqual([]);
  });

  it('rejects invalid query params with 400 naming the param', async () => {
    const res = await request(app).get('/api/v1/service-requests?status=FOO&pageSize=101');
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual(['pageSize', 'status']);
  });

  it('rejects repeated filter params', async () => {
    const res = await request(app).get('/api/v1/service-requests?status=PENDING&status=COMPLETED');
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('status');
  });
});

describe('GET /api/v1/service-requests/:id', () => {
  beforeEach(async () => {
    await resetDatabase();
    fx = await createCatalogFixtures();
  });

  it('returns the request with embedded relations', async () => {
    const created = await createServiceRequest({ title: 'Plotter', status: 'COMPLETED', technicianId: fx.jorge.id, serviceTypeId: fx.printer.id });
    const res = await request(app).get(`/api/v1/service-requests/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: created.id,
      title: 'Plotter',
      technician: { id: fx.jorge.id, fullName: 'Jorge Ramírez', isActive: false },
      serviceType: { id: fx.printer.id, name: 'Mantenimiento Impresora', isActive: true },
    });
    expect(res.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('answers 404 for a missing id and 400 for a non-numeric id', async () => {
    const missing = await request(app).get('/api/v1/service-requests/999');
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: { code: 'NOT_FOUND', message: 'La solicitud no existe.' } });
    const invalid = await request(app).get('/api/v1/service-requests/abc');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.details[0].field).toBe('id');
    const tooBig = await request(app).get('/api/v1/service-requests/2147483648');
    expect(tooBig.status).toBe(400);
    expect(tooBig.body.error.details[0].field).toBe('id');
  });
});
