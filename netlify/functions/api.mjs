// Servidor da lanchonete (Netlify Functions + Netlify Blobs)
import { getStore } from '@netlify/blobs';
import '../../public/logic.js';

const L = globalThis.Logic;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export default async (req) => {
  const url = new URL(req.url);
  const rota = url.pathname.replace(/^\/api/, '') || '/';
  const store = getStore({ name: 'lanchonete', consistency: 'strong' });
  const PIN = String(process.env.EQUIPE_PIN || '1234');

  async function carregar() {
    let r = await store.getWithMetadata('estado', { type: 'json' });
    if (!r) {
      await store.setJSON('estado', L.seed(), { onlyIfNew: true });
      r = await store.getWithMetadata('estado', { type: 'json' });
    }
    return { s: L.migrar(r.data), etag: r.etag };
  }

  try {
    if (rota === '/ping') return json({ ok: true, app: 'lanchonete-mesas' });

    // Página pública do cliente (QR Code da mesa)
    if (rota === '/mesa' && req.method === 'GET') {
      const { s } = await carregar();
      const dados = L.publicoMesa(s, url.searchParams.get('c') || '', false);
      return dados ? json(dados) : json({ erro: 'Mesa não encontrada.' }, 404);
    }

    if (rota === '/logo' && req.method === 'GET') {
      const r = await store.getWithMetadata('logo', { type: 'arrayBuffer' });
      if (!r) return new Response('', { status: 404 });
      return new Response(r.data, {
        headers: { 'content-type': (r.metadata && r.metadata.tipo) || 'image/png', 'cache-control': 'public, max-age=604800' }
      });
    }

    // Daqui para baixo, só a equipe
    if (req.headers.get('x-pin') !== PIN) return json({ erro: 'Senha da equipe incorreta.' }, 401);

    if (rota === '/estado' && req.method === 'GET') {
      const { s } = await carregar();
      const v = url.searchParams.get('v');
      if (v && Number(v) === s.v) return json({ same: true });
      return json(s);
    }

    if (rota === '/acao' && req.method === 'POST') {
      const a = await req.json();
      a.t = Date.now();
      delete a.cfg?.logoData;
      for (let i = 0; i < 8; i++) {
        const { s, etag } = await carregar();
        let novo;
        try {
          novo = L.apply(structuredClone(s), a);
        } catch (e) {
          return json({ erro: e.message }, 400);
        }
        if (novo.v === s.v) return json(novo);
        const r = await store.setJSON('estado', novo, { onlyIfMatch: etag });
        if (!r || r.modified !== false) return json(novo);
        await espera(60 * (i + 1));
      }
      return json({ erro: 'Muita gente salvando ao mesmo tempo. Tente de novo.' }, 409);
    }

    if (rota === '/logo' && req.method === 'POST') {
      const buf = await req.arrayBuffer();
      if (buf.byteLength > 900000) return json({ erro: 'Imagem grande demais.' }, 413);
      await store.set('logo', buf, { metadata: { tipo: req.headers.get('content-type') || 'image/png' } });
      return json({ ok: true });
    }

    return json({ erro: 'Rota não encontrada.' }, 404);
  } catch (e) {
    return json({ erro: 'Erro no servidor: ' + e.message }, 500);
  }
};

export const config = { path: '/api/*' };
