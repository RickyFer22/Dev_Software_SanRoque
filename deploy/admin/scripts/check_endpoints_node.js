const endpoints = ['/admin/api/session','/admin/api/users','/admin/api/alojamientos','/admin/api/gastronomia','/admin/api/eventos','/admin/api/datos-utiles','/admin/api/audit','/admin/api/reviews','/admin/api/uploads','/admin/api/backup'];
(async ()=>{
  const results = [];
  for (const ep of endpoints) {
    try {
      const r = await fetch('http://127.0.0.1:4000' + ep, { method: 'GET' });
      let body = '';
      try { body = await r.text(); } catch(e){}
      results.push({ endpoint: ep, status: r.status, ok: r.ok, body: body.slice(0,200) });
    } catch (e) {
      results.push({ endpoint: ep, error: e.message });
    }
  }
  console.log(JSON.stringify(results, null, 2));
})();
