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
    console.log('LOGIN', loginRes.status);
    const cookie = loginRes.headers['set-cookie'] && loginRes.headers['set-cookie'][0] ? loginRes.headers['set-cookie'][0].split(';')[0] : '';
    console.log('COOKIE', cookie);
    const newUser = { username: 'tester1', name: 'Tester Uno', role: 'editor', status: 'active', password: 'secret123' };
    const createRes = await request('/admin/api/users', 'POST', JSON.stringify(newUser), { Cookie: cookie });
    console.log('CREATE', createRes.status, createRes.body);
    const listRes = await request('/admin/api/users', 'GET', null, { Cookie: cookie });
    console.log('LIST', listRes.status, (listRes.body||'').slice(0,400));
  } catch(e){ console.error(e); process.exit(1); }
})();