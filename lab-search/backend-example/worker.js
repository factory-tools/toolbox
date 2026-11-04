// Cloudflare Worker example. BEFORE deployment, protect ALL traffic with Cloudflare Access.
// Set a secret RAGIC_API_KEY in Cloudflare Worker Settings (never in GitHub).
// Set ALLOWED_ORIGIN e.g. https://factory-tools.github.io .
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = String(env.ALLOWED_ORIGIN || '');
    const cors = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Credentials': 'true',
      'Vary': 'Origin',
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    };
    const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: cors });
    if (!env.RAGIC_API_KEY || !allowedOrigin.startsWith('https://')) return reply({error:'Backend not configured'}, 503);
    if (origin !== allowedOrigin) return reply({error:'Origin not allowed'},403);
    // Cloudflare Access MUST be enabled at the Worker level; an Origin header is not authentication.
    // Access checks the login session BEFORE this Worker executes.
    if (request.method !== 'GET') return reply({error:'Only GET supported'},405);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') || 250);
    const offset = Number(url.searchParams.get('offset') || 0);
    if (!Number.isInteger(limit) || limit < 1 || limit > 250 || !Number.isInteger(offset) || offset < 0 || offset > 1000000) return reply({error:'Invalid paging parameters'},400);
    const api = new URL('https://ragic.paiho.vn/default/thng-tin-mc-/3');
    api.searchParams.set('api','');
    api.searchParams.set('limit', String(limit));
    api.searchParams.set('offset', String(offset));
    // Backend-only key: not sent to clients or added to URL/logs.
    let r;
    try { r = await fetch(api.toString(), { headers: { 'Authorization': `Basic ${env.RAGIC_API_KEY}`, 'Accept':'application/json' }, redirect: 'error', cf:{cacheTtl:0} }); }
    catch { return reply({error:'Unable to connect to Ragic'},502); }
    if (!r.ok) return reply({error:`Ragic returned HTTP ${r.status}`},502);
    let data;
    try { data = await r.json(); }
    catch { return reply({error:'Ragic did not return JSON'},502); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return reply({error:'Unexpected Ragic response'},502);
    // Limit output to relevant fields only. Do not expose staff information and internal order data.
    const rows = {};
    for (const [id, x] of Object.entries(data)) {
      if (!x || typeof x !== 'object') continue;
      rows[id] = {
        _ragicId: x._ragicId,
        'mã số 編號': x['mã số 編號'],
        'Màu in<br>印刷色': x['Màu in<br>印刷色'],
        'Kiểu loại mực<br>油墨種類': x['Kiểu loại mực<br>油墨種類'],
        'Bộ phận sử dụng 使用部門': x['Bộ phận sử dụng 使用部門'],
        'L*': x['L*'], 'a*':x['a*'], 'b*':x['b*'],
        '目前版次': x['目前版次'],
        'Trạng thái công thức<br>配方狀態':x['Trạng thái công thức<br>配方狀態'],
        '_subtable_1001759': x['_subtable_1001759'],
        '_subtable_1001760': x['_subtable_1001760']
      };
    }
    return reply(rows);
  }
};
