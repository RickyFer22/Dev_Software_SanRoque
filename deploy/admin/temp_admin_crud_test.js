const http = require('http');
function request(options, body) {
  return new Promise((resolve, reject) => {
    // add admin headers automatically for admin routes
    const adminHeaders = { 'X-Admin-User': 'dev', 'X-Admin-Role': 'super-admin' };
    if (options && options.path && options.path.indexOf('/admin') === 0) {
      options.headers = Object.assign({}, options.headers || {}, adminHeaders);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
(async () => {
  const base = { hostname: '127.0.0.1', port: 4000 };
  const initial = [
    { method: 'GET', path: '/health' },
    { method: 'GET', path: '/admin/api/users' },
    { method: 'GET', path: '/admin/api/datos-utiles' },
  ];
  for (const item of initial) {
    const res = await request(Object.assign({}, base, item));
    console.log(`${item.method} ${item.path} -> ${res.status}`);
  }
  const payload = JSON.stringify({
    categoria: 'test-transportes',
    titulo: 'Transporte',
    descripcion: 'Info de transporte',
    contenido: { contactos: [{ nombre: 'Remis', tel: '549377xxxxxxx' }] },
  });
  let res = await request(Object.assign({}, base, {
    method: 'PUT',
    path: '/admin/api/datos-utiles/test-transportes',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
  }), payload);
  console.log('PUT datos-utiles ->', res.status, res.body.slice(0, 300));
  res = await request(Object.assign({}, base, { method: 'GET', path: '/admin/api/datos-utiles' }));
  console.log('GET datos-utiles ->', res.status, res.body.slice(0, 300));
  const updatePayload = JSON.stringify({ titulo: 'Transporte Editado', descripcion: 'Actualizado' });
  res = await request(Object.assign({}, base, {
    method: 'PUT',
    path: '/admin/api/datos-utiles/test-transportes',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(updatePayload) },
  }), updatePayload);
  console.log('PUT update datos-utiles ->', res.status, res.body.slice(0, 300));
  res = await request(Object.assign({}, base, { method: 'DELETE', path: '/admin/api/datos-utiles/test-transportes' }));
  console.log('DELETE datos-utiles ->', res.status, res.body.slice(0, 300));
  const userPayload = JSON.stringify({ username: 'test_cli_user', name: 'CLI User', role: 'editor', status: 'active' });
  res = await request(Object.assign({}, base, {
    method: 'POST',
    path: '/admin/api/users',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(userPayload) },
  }), userPayload);
  console.log('POST users ->', res.status, res.body.slice(0, 300));
  let created = null;
  try { created = JSON.parse(res.body); } catch (err) {}
  if (created && created.id) {
    const userId = created.id;
    const updateUserPayload = JSON.stringify({ name: 'CLI User Editado', status: 'inactive' });
    res = await request(Object.assign({}, base, {
      method: 'PUT',
      path: `/admin/api/users/${encodeURIComponent(userId)}`,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(updateUserPayload) },
    }), updateUserPayload);
    console.log('PUT users ->', res.status, res.body.slice(0, 300));
    res = await request(Object.assign({}, base, { method: 'DELETE', path: `/admin/api/users/${encodeURIComponent(userId)}` }));
    console.log('DELETE users ->', res.status, res.body.slice(0, 300));
  } else {
    console.log('No se pudo crear usuario para completar PUT/DELETE');
  }
  res = await request(Object.assign({}, base, { method: 'GET', path: '/admin' }));
  console.log('GET /admin ->', res.status, res.body.slice(0, 120));
})();
