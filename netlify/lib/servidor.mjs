// Regras do servidor da lanchonete. Recebe o "armário" (Netlify Blobs) de quem chama,
// para poder ser testado fora do Netlify.
import '../../public/logic.js';

const L = globalThis.Logic;

// Senhas de fábrica. O caixa é obrigado a trocar a do gerente no primeiro acesso.
const PADRAO = { equipe: '1234', gerente: '4321' };

// O que só o caixa (senha do gerente) pode fazer
const SO_GERENTE = new Set(['abrirCaixa', 'fecharCaixa', 'pagar', 'removerPag', 'liberar', 'vendaRapida',
  'menuSalvar', 'menuRemover', 'cfgSalvar', 'equipeSalvar', 'senhasSalvar']);
const EM_ANDAMENTO = ['novo', 'preparando', 'pronto'];

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function nivelDe(pin, senhas) {
  if (!pin || !senhas) return null;
  if (pin === senhas.gerente) return 'gerente';
  if (pin === senhas.equipe) return 'equipe';
  return null;
}

// O que cada aparelho recebe. Garçom e cozinha não recebem dados do caixa.
function visao(s, nivel) {
  const gerente = nivel === 'gerente';
  const ativos = new Set(s.pedidos.filter((p) => EM_ANDAMENTO.includes(p.status)).map((p) => p.conta));
  const contas = gerente ? s.contas : s.contas.filter((c) => c.aberta || ativos.has(c.id));
  const ids = new Set(contas.map((c) => c.id));
  const v = {
    v: s.v,
    _nivel: nivel,
    cfg: Object.assign({}, s.cfg, { logoData: '' }),
    equipe: s.equipe,
    menu: s.menu,
    contas,
    pedidos: gerente ? s.pedidos : s.pedidos.filter((p) => ids.has(p.conta)),
    turno: gerente ? s.turno : (s.turno ? { id: s.turno.id, abertoEm: s.turno.abertoEm } : null),
    // Sempre presentes (vazios para a equipe), para uma aba antiga aberta não quebrar depois de uma atualização
    codes: {},
    log: [],
    turnos: []
  };
  if (gerente) {
    v.codes = s.codes;
    v.log = s.log;
    v._senhas = {
      trocarGerente: s.senhas.gerente === PADRAO.gerente || s.senhas.gerente === s.senhas.equipe,
      equipePadrao: s.senhas.equipe === PADRAO.equipe
    };
  }
  return v;
}

function trocarSenhas(s, a) {
  const limpa = (x) => String(x == null ? '' : x).trim();
  const gerente = a.gerente === undefined ? s.senhas.gerente : limpa(a.gerente);
  const equipe = a.equipe === undefined ? s.senhas.equipe : limpa(a.equipe);
  if (gerente.length < 4 || gerente.length > 40) throw new Error('A senha do gerente precisa ter de 4 a 40 caracteres.');
  if (equipe.length < 4 || equipe.length > 40) throw new Error('A senha da equipe precisa ter de 4 a 40 caracteres.');
  if (gerente === PADRAO.gerente) throw new Error('Escolha uma senha do gerente diferente da senha de fábrica.');
  if (gerente === equipe) throw new Error('A senha do gerente tem que ser diferente da senha da equipe.');
  s.senhas = { equipe, gerente };
  s.v = (s.v || 0) + 1;
  return s;
}

export function criarApi(store, env = {}) {
  const senhasIniciais = () => ({
    equipe: String(env.EQUIPE_PIN || PADRAO.equipe),
    gerente: String(env.GERENTE_PIN || PADRAO.gerente)
  });
  // Socorro para senha esquecida: a variável REDEFINIR_SENHAS (qualquer texto novo) devolve as senhas de fábrica uma vez
  const socorro = String(env.REDEFINIR_SENHAS || '');
  const meta = (s) => ({ v: s.v, se: s.senhas.equipe, sg: s.senhas.gerente, rd: s.redefinido || '', mv: s.menuV || 1 });

  async function carregar(tentativa = 0) {
    let r = await store.getWithMetadata('estado', { type: 'json' });
    if (!r) {
      const novo = L.seed();
      novo.senhas = senhasIniciais();
      await store.setJSON('estado', novo, { onlyIfNew: true, metadata: meta(novo) });
      r = await store.getWithMetadata('estado', { type: 'json' });
    }
    const cardapioAntes = r.data.menuV || 1;
    const s = L.migrar(r.data);
    if (!s.senhas || !s.senhas.equipe || !s.senhas.gerente) s.senhas = senhasIniciais();
    // O cardápio de fábrica mudou: grava já, para todos os aparelhos receberem a novidade
    if (s.menuV !== cardapioAntes && tentativa < 3) {
      if (socorro && s.redefinido !== socorro) { s.senhas = senhasIniciais(); s.redefinido = socorro; }
      await store.setJSON('estado', s, { onlyIfMatch: r.etag, metadata: meta(s) });
      return carregar(tentativa + 1);
    }
    if (socorro && s.redefinido !== socorro) {
      s.senhas = senhasIniciais();
      s.redefinido = socorro;
    }
    return { s, etag: r.etag };
  }

  // Leitura barata: só a etiqueta do arquivo (versão e senhas), sem baixar os pedidos
  async function etiqueta() {
    try {
      const r = await store.getMetadata('estado');
      const m = r && r.metadata;
      if (!m || !m.sg || !m.se || typeof m.v !== 'number') return null;
      if (socorro && m.rd !== socorro) return null;
      if (m.mv !== L.CARDAPIO_V) return null; // cardápio de fábrica mudou: carrega e atualiza
      return m;
    } catch (e) {
      return null;
    }
  }

  async function guardarTurnos(novos) {
    const atuais = (await store.get('turnos', { type: 'json' })) || [];
    const porId = new Map();
    novos.concat(atuais).forEach((t) => { if (t && t.id && !porId.has(t.id)) porId.set(t.id, t); });
    const lista = Array.from(porId.values()).sort((a, b) => (b.fechadoEm || 0) - (a.fechadoEm || 0)).slice(0, 200);
    await store.setJSON('turnos', lista);
    return lista;
  }

  async function negar() {
    await espera(400);
    return json({ erro: 'Senha incorreta.' }, 401);
  }

  return async function api(req) {
    const url = new URL(req.url);
    const rota = url.pathname.replace(/^\/api/, '') || '/';
    const pin = req.headers.get('x-pin') || '';

    try {
      if (rota === '/ping') return json({ ok: true, app: 'lanchonete-mesas', versao: 2 });

      // Página pública do cliente (QR Code da mesa)
      if (rota === '/mesa' && req.method === 'GET') {
        const visto = url.searchParams.get('v');
        if (visto) {
          const m = await etiqueta();
          if (m && m.v === Number(visto)) return json({ same: true });
        }
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

      // Daqui para baixo, só com senha
      if (rota === '/estado' && req.method === 'GET') {
        const visto = url.searchParams.get('v');
        const m = await etiqueta();
        if (m) {
          const nivel = nivelDe(pin, { equipe: m.se, gerente: m.sg });
          if (!nivel) return negar();
          if (visto && m.v === Number(visto) && url.searchParams.get('n') === nivel) return json({ same: true });
        }
        const { s } = await carregar();
        const nivel = nivelDe(pin, s.senhas);
        if (!nivel) return negar();
        return json(visao(s, nivel));
      }

      if (rota === '/turnos' && req.method === 'GET') {
        const { s } = await carregar();
        if (nivelDe(pin, s.senhas) !== 'gerente') return nivelDe(pin, s.senhas) ? json({ erro: 'Só o caixa vê o histórico.' }, 403) : negar();
        const guardados = (await store.get('turnos', { type: 'json' })) || [];
        const porId = new Map();
        s.turnos.concat(guardados).forEach((t) => { if (t && t.id && !porId.has(t.id)) porId.set(t.id, t); });
        const turnos = Array.from(porId.values()).sort((a, b) => (b.fechadoEm || 0) - (a.fechadoEm || 0)).slice(0, 120);
        return json({ turnos });
      }

      if (rota === '/acao' && req.method === 'POST') {
        const a = await req.json().catch(() => null);
        if (!a || typeof a !== 'object' || Array.isArray(a)) return json({ erro: 'Ação inválida.' }, 400);
        a.t = Date.now();
        if (a.cfg && typeof a.cfg === 'object') delete a.cfg.logoData;
        for (let i = 0; i < 8; i++) {
          const { s, etag } = await carregar();
          const nivel = nivelDe(pin, s.senhas);
          if (!nivel) return negar();
          if (SO_GERENTE.has(a.tipo) && nivel !== 'gerente') {
            return json({ erro: 'Isso é feito só no caixa, com a senha do gerente.' }, 403);
          }
          let novo;
          try {
            novo = a.tipo === 'senhasSalvar' ? trocarSenhas(structuredClone(s), a) : L.apply(structuredClone(s), a);
          } catch (e) {
            return json({ erro: e.message }, 400);
          }
          if (novo.v === s.v) return json(visao(novo, nivel));
          // O histórico de caixas fechados fica em um arquivo separado, para o dia a dia ficar leve
          if (novo.turnos.length) {
            await guardarTurnos(novo.turnos);
            novo.turnos = [];
          }
          const r = await store.setJSON('estado', novo, { onlyIfMatch: etag, metadata: meta(novo) });
          if (!r || r.modified !== false) return json(visao(novo, a.tipo === 'senhasSalvar' ? 'gerente' : nivel));
          await espera(40 * (i + 1) + Math.floor(Math.random() * 60));
        }
        return json({ erro: 'Muita gente salvando ao mesmo tempo. Tente de novo.' }, 409);
      }

      if (rota === '/logo' && req.method === 'POST') {
        const { s } = await carregar();
        const nivel = nivelDe(pin, s.senhas);
        if (!nivel) return negar();
        if (nivel !== 'gerente') return json({ erro: 'Isso é feito só no caixa, com a senha do gerente.' }, 403);
        const buf = await req.arrayBuffer();
        if (!buf.byteLength) return json({ erro: 'Imagem vazia.' }, 400);
        if (buf.byteLength > 900000) return json({ erro: 'Imagem grande demais.' }, 413);
        const tipo = req.headers.get('content-type') || 'image/png';
        if (!/^image\/(png|jpeg|webp)$/.test(tipo)) return json({ erro: 'Use uma imagem PNG ou JPG.' }, 415);
        await store.set('logo', buf, { metadata: { tipo } });
        return json({ ok: true });
      }

      return json({ erro: 'Rota não encontrada.' }, 404);
    } catch (e) {
      return json({ erro: 'Erro no servidor: ' + (e && e.message ? e.message : 'desconhecido') }, 500);
    }
  };
}
