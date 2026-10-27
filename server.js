'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = __dirname;
const dataDir = path.join(root, 'data');
const dataFile = path.join(dataDir, 'store.json');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
const seedBikes = [
  { id: 'CC-104', name: 'The Commuter', station: 'North Quad', type: 'City bike', rate: 3, rating: '4.9', available: true, colorClass: 'photo-lime' },
  { id: 'CC-218', name: 'Campus Cruiser', station: 'Student Union', type: 'Hybrid', rate: 4, rating: '4.8', available: true, colorClass: 'photo-peach' },
  { id: 'CC-076', name: 'The Swift', station: 'Library West', type: 'Road bike', rate: 5, rating: '4.9', available: false, colorClass: 'photo-blue' },
  { id: 'CC-331', name: 'Easy Rider', station: 'Athletics Center', type: 'City bike', rate: 3, rating: '4.7', available: true, colorClass: 'photo-lavender' },
  { id: 'CC-159', name: 'Green Machine', station: 'North Quad', type: 'Hybrid', rate: 4, rating: '4.8', available: true, colorClass: 'photo-peach' },
  { id: 'CC-402', name: 'The Weekender', station: 'Student Union', type: 'Cruiser', rate: 4, rating: '4.9', available: true, colorClass: 'photo-blue' },
  { id: 'CC-093', name: 'Quickstep', station: 'Library West', type: 'Road bike', rate: 5, rating: '4.6', available: true, colorClass: 'photo-lime' },
  { id: 'CC-267', name: 'Campus Classic', station: 'Athletics Center', type: 'City bike', rate: 3, rating: '4.8', available: false, colorClass: 'photo-lavender' }
];

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({ bikes: seedBikes, bookings: [] }, null, 2));

function readStore() { return JSON.parse(fs.readFileSync(dataFile, 'utf8')); }
function saveStore(store) { fs.writeFileSync(dataFile, JSON.stringify(store, null, 2)); }
function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}
function readBody(request) {
  return new Promise((resolve, reject) => {
    let raw = '';
    request.on('data', chunk => { raw += chunk; if (raw.length > 10000) reject(new Error('Request is too large')); });
    request.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); } catch (_) { reject(new Error('Request body must be valid JSON')); }
    });
    request.on('error', reject);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);
  if (pathname.startsWith('/api/')) {
    try {
      const store = readStore();
      if (request.method === 'GET' && pathname === '/api/bikes') return sendJson(response, 200, { bikes: store.bikes });
      if (request.method === 'GET' && pathname === '/api/bookings') return sendJson(response, 200, { bookings: store.bookings });
      if (request.method === 'POST' && pathname === '/api/bookings') {
        const input = await readBody(request);
        const bike = store.bikes.find(item => item.id === input.bikeId);
        const duration = Number(input.duration);
        if (!bike) return sendJson(response, 404, { error: 'That bike could not be found.' });
        if (!bike.available) return sendJson(response, 409, { error: 'That bike has just been reserved. Choose another bike.' });
        if (![1, 2, 4, 8].includes(duration)) return sendJson(response, 400, { error: 'Choose a valid rental duration.' });
        if (typeof input.startTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.startTime)) return sendJson(response, 400, { error: 'Choose a valid start time.' });
        const booking = { id: crypto.randomUUID(), code: 'CC' + crypto.randomBytes(3).toString('hex').toUpperCase(), bikeId: bike.id, bikeName: bike.name, station: bike.station, duration, startTime: input.startTime, total: duration * bike.rate, createdAt: new Date().toISOString(), status: 'active' };
        bike.available = false;
        store.bookings.unshift(booking);
        saveStore(store);
        return sendJson(response, 201, { booking });
      }
      const cancelMatch = pathname.match(/^\/api\/bookings\/([\w-]+)\/cancel$/);
      if (request.method === 'POST' && cancelMatch) {
        const booking = store.bookings.find(item => item.id === cancelMatch[1]);
        if (!booking || booking.status !== 'active') return sendJson(response, 404, { error: 'Active rental not found.' });
        booking.status = 'cancelled';
        const bike = store.bikes.find(item => item.id === booking.bikeId);
        if (bike) bike.available = true;
        saveStore(store);
        return sendJson(response, 200, { booking });
      }
      return sendJson(response, 404, { error: 'API route not found.' });
    } catch (error) {
      return sendJson(response, 400, { error: error.message || 'Unable to complete the request.' });
    }
  }

  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(root, requested);
  if (!file.startsWith(root + path.sep) && file !== path.join(root, 'index.html')) return response.writeHead(403).end('Forbidden');
  fs.readFile(file, (error, content) => {
    if (error) return response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    response.end(content);
  });
});

const port = Number(process.env.PORT || 4200);
server.listen(port, '0.0.0.0', () => console.log(`Campus Cycle is running at http://localhost:${port}`));
