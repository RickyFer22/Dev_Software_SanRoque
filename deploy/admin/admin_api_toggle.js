const http = require('http');
function request(path, method='GET', body, headers={}){
  return new Promise((resolve,reject)=>{
    const opts = { host: '127.0.0.1', port: 4000, path, method, headers: Object.assign({'Content-Type':'application/json'}, headers) };
    const req = http.request(opts, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async ()=>{
  try{
    const loginBody = JSON.stringify({ username: 'admin', password: 'setup-local' });
    const loginRes = await request('/admin/login', 'POST', loginBody);
    const cookie = loginRes.headers['set-cookie'] && loginRes.headers['set-cookie'][0] ? loginRes.headers['set-cookie'][0].split(';')[0] : '';
    console.log('COOKIE', cookie);

    const listRes = await request('/admin/api/gastronomia', 'GET', null, { Cookie: cookie });
    console.log('LIST STATUS', listRes.status);
    console.log('LIST BODY (truncated):', (listRes.body||'').slice(0,800));
    let items = [];
    try { items = JSON.parse(listRes.body); } catch(e){ console.error('parse list failed', e.message); return; }
    if (!Array.isArray(items) || items.length === 0) { console.log('No gastronomia items'); return; }
    const id = items[0].id;
    console.log('Toggling id', id);
    const itemRes = await request(`/admin/api/gastronomia/${encodeURIComponent(id)}`, 'GET', null, { Cookie: cookie });
    console.log('ITEM GET', itemRes.status, (itemRes.body||'').slice(0,400));
    const item = JSON.parse(itemRes.body);
    const updated = Object.assign({}, item, { activo: item.activo ? 0 : 1 });
    const putRes = await request(`/admin/api/gastronomia/${encodeURIComponent(id)}`, 'PUT', JSON.stringify(updated), { Cookie: cookie });
    console.log('PUT', putRes.status, putRes.body);
    const afterRes = await request('/admin/api/gastronomia', 'GET', null, { Cookie: cookie });
    console.log('AFTER LIST STATUS', afterRes.status);
    console.log('AFTER LIST BODY (truncated):', (afterRes.body||'').slice(0,800));
  } catch(e){ console.error(e); process.exit(1); }
})();
