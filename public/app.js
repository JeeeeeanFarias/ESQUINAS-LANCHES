/* Sistema de mesas — telas do garçom, cozinha, caixa, cartões e cliente */
(function () {
  'use strict';
  const L = window.Logic;
  const FORMAS = L.FORMAS;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const brl = L.brl;
  const hora = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dataHora = (t) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const minDesde = (t) => Math.max(0, Math.floor((Date.now() - t) / 60000));
  const tempo = (t) => { const m = minDesde(t); return m < 1 ? 'agora' : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`; };
  const num = (v) => { let s = String(v || '').trim().replace(/[R$\s]/g, ''); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const n = parseFloat(s); return isNaN(n) ? 0 : Math.round(n * 100) / 100; };
  const fmt = (n) => (Number(n) || 0).toFixed(2).replace('.', ',');
  const mem = {};
  const guarda = {
    get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return mem[k] ?? null; } },
    set(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } }
  };
  const DEMO_SITE = 'https://esquinaslanches.netlify.app';

  /* ---------- Conexão ---------- */
  const API = {
    modo: 'demo', _pin: '', demo: null,
    async iniciar() {
      try {
        const r = await fetch('/api/ping', { cache: 'no-store' });
        if (r.ok && (await r.json()).app === 'lanchonete-mesas') { this.modo = 'online'; return; }
      } catch (e) { /* sem servidor: modo demonstração */ }
      if (/\.netlify\.app$/.test(location.hostname)) {
        document.getElementById('app').innerHTML = '<main class="wrap login"><h1>O servidor do site não está ligado</h1><p>O site foi publicado sem a pasta <b>netlify/functions</b>, que guarda os pedidos. Isso acontece quando a pasta é arrastada direto no Netlify. Publique pelo GitHub (veja o LEIA-ME) e recarregue esta página.</p></main>';
        throw new Error('sem servidor');
      }
      this.modo = 'demo';
      this.demo = L.migrar(guarda.get('demo-estado-v3') || L.seed());
      guarda.set('demo-estado-v3', this.demo);
    },
    pin() { return (sessao && sessao.pin) || this._pin; },
    async estado(v, pin) {
      if (this.modo === 'demo') return this.demo;
      const r = await fetch('/api/estado' + (v ? '?v=' + v : ''), { headers: { 'x-pin': pin || this.pin() }, cache: 'no-store' });
      if (r.status === 401) { const e = new Error('Senha da equipe incorreta.'); e.code = 401; throw e; }
      if (!r.ok) throw new Error('Sem resposta do servidor.');
      const j = await r.json();
      return j.same ? null : j;
    },
    async acao(tipo, dados) {
      const a = Object.assign({}, dados, { tipo, id: L.rnd(10), por: sessao ? sessao.nome : 'Equipe', t: Date.now() });
      if (this.modo === 'demo') {
        const base = L.migrar(guarda.get('demo-estado-v3') || this.demo);
        this.demo = L.apply(JSON.parse(JSON.stringify(base)), a);
        guarda.set('demo-estado-v3', this.demo);
        return { s: this.demo, id: a.id };
      }
      const r = await fetch('/api/acao', { method: 'POST', headers: { 'content-type': 'application/json', 'x-pin': this.pin() }, body: JSON.stringify(a) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.erro || 'Não foi possível salvar. Confira a internet.');
      return { s: j, id: a.id };
    },
    async mesa(code) {
      if (this.modo === 'demo') return L.publicoMesa(L.migrar(guarda.get('demo-estado-v3') || this.demo), code, true);
      const r = await fetch('/api/mesa?c=' + encodeURIComponent(code), { cache: 'no-store' });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('Sem resposta do servidor.');
      return r.json();
    }
  };

  /* ---------- Estado da tela ---------- */
  let S = null;
  let sessao = guarda.get('sessao');
  let tela = 'inicio';
  let codigoMesa = null;
  let cliente = null;
  const ui = {
    g: { vista: 'mesas', alvo: null, cart: [], cat: null, sheet: null, conf: null },
    cx: { tab: 'mesas', sel: null, forma: 'Débito', confFechar: false, edit: null, conf: null },
    previa: null, som: false, offline: false, loginErro: '', carregando: true
  };

  /* ---------- Utilidades de tela ---------- */
  function logoSrc(cfg) {
    if (!cfg) return '';
    if (cfg.logoData) return cfg.logoData;
    if (API.modo === 'online' && cfg.logoV) return '/api/logo?v=' + cfg.logoV;
    return window.LOGO_PADRAO || 'logo.png';
  }
  function logoHtml(cfg, tam) {
    const src = logoSrc(cfg);
    const nome = (cfg && cfg.nome) || 'Lanchonete';
    return `<span class="logo ${tam}" aria-hidden="true">${src ? `<img src="${esc(src)}" alt="">` : esc(nome.trim()[0] || 'L')}</span>`;
  }
  function toast(txt, tipo = '') {
    const box = $('#toast');
    if (!box) return;
    const d = document.createElement('div');
    d.className = 'toast ' + tipo;
    d.textContent = txt;
    box.appendChild(d);
    setTimeout(() => d.remove(), tipo === 'erro' ? 4500 : 2600);
  }
  async function fazer(tipo, dados) {
    try {
      const r = await API.acao(tipo, dados);
      atualizar(r.s);
      return r;
    } catch (e) {
      toast(e.message || 'Não deu certo.', 'erro');
      return null;
    }
  }
  function atualizar(novo) {
    const ant = S;
    S = novo;
    avisos(ant, novo);
    render();
  }
  function ir(t) {
    tela = t;
    guarda.set('tela', t);
    try { history.replaceState(null, '', t === 'inicio' ? location.pathname : '#' + t); } catch (e) { /* ok */ }
    if (t === 'cozinha') manterTelaLigada();
    window.scrollTo(0, 0);
    render();
  }
  const contaPorId = (id) => S && S.contas.find((c) => c.id === id);

  /* ---------- Som e avisos ---------- */
  let actx = null;
  function bip(vezes = 1) {
    if (!ui.som) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      for (let k = 0; k < vezes; k++) {
        const t0 = actx.currentTime + k * 0.35;
        const o = actx.createOscillator(); const g = actx.createGain();
        o.frequency.value = k % 2 ? 1175 : 880;
        o.connect(g); g.connect(actx.destination);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
        o.start(t0); o.stop(t0 + 0.32);
      }
    } catch (e) { /* sem áudio */ }
  }
  function avisos(ant, novo) {
    if (!ant || !novo) return;
    const antes = new Map(ant.pedidos.map((p) => [p.id, p.status]));
    if (tela === 'cozinha') {
      const chegou = novo.pedidos.some((p) => p.status === 'novo' && !antes.has(p.id));
      if (chegou) bip(2);
    }
    if (tela === 'garcom') {
      const pronto = novo.pedidos.some((p) => p.status === 'pronto' && antes.get(p.id) !== 'pronto');
      if (pronto) { bip(3); try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { /* ok */ } }
    }
  }
  let wake = null;
  async function manterTelaLigada() {
    try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { /* ok */ }
  }

  /* ---------- Impressão ---------- */
  const CSS_TICKET = (w) => `@page{size:${w}mm auto;margin:0}body{margin:0;padding:3mm;width:${w - 6}mm;font:${w === 58 ? 11 : 12.5}px/1.35 'Courier New',monospace;color:#000}
    .c{text-align:center}.big{font-size:2em;font-weight:900}.m{font-size:1.25em;font-weight:900}hr{border:0;border-top:1px dashed #000;margin:6px 0}
    .l{display:flex;justify-content:space-between;gap:6px}.it{margin:6px 0}.sem{font-weight:900}.peq{font-size:.9em}`;
  function imprimir(corpo) {
    const w = (S && S.cfg.impressora) || 80;
    if (API.modo === 'demo') { ui.previa = corpo; render(); return; }
    imprimirDoc(`<style>${CSS_TICKET(w)}</style>${corpo}`);
  }
  function imprimirDoc(html, espera) {
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(f);
    const d = f.contentDocument;
    d.open();
    d.write(`<!doctype html><html><head><meta charset="utf-8"><title>Impressão</title></head><body>${html}</body></html>`);
    d.close();
    const vai = async () => {
      try { if (espera && d.fonts) await d.fonts.ready; } catch (e) { /* ok */ }
      setTimeout(() => {
        try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast('Não consegui abrir a impressão.', 'erro'); }
        setTimeout(() => f.remove(), 60000);
      }, espera ? 400 : 150);
    };
    if (d.readyState === 'complete') vai(); else f.onload = vai;
  }
  function ticketCozinha(p) {
    const c = contaPorId(p.conta);
    const itens = p.itens.map((id) => c && c.itens.find((i) => i.id === id)).filter((i) => i && !i.canc);
    return `<div class="c peq">${esc(S.cfg.nome)} · COZINHA</div><hr>
      <div class="c big">${esc((c ? L.rotulo(c) : p.rotulo).toUpperCase())}</div>
      <div class="c">${hora(p.em)} · ${esc(p.por)}</div><hr>
      ${itens.map((i) => `<div class="it"><div class="m">${i.qtd}x ${esc(i.nome.toUpperCase())}</div>
        ${i.sem.length ? `<div class="sem">  SEM: ${esc(i.sem.join(', ').toUpperCase())}</div>` : ''}
        ${i.obs ? `<div>  OBS: ${esc(i.obs)}</div>` : ''}</div>`).join('')}
      <hr><div class="c peq">pedido ${esc(p.id.slice(0, 6))}</div>`;
  }
  function ticketConta(c) {
    return `<div class="c m">${esc(S.cfg.nome)}</div><div class="c">${esc(L.rotulo(c))} · ${dataHora(Date.now())}</div><hr>
      ${L.vivos(c).map((i) => `<div class="l"><span>${i.qtd}x ${esc(i.nome)}</span><span>${fmt(i.qtd * i.preco)}</span></div>`).join('')}
      <hr><div class="l m"><span>TOTAL</span><span>${brl(L.total(c))}</span></div>
      ${c.pags.length ? `<div class="l"><span>Já pago</span><span>${brl(L.pago(c))}</span></div><div class="l m"><span>FALTA</span><span>${brl(L.restante(c))}</span></div>` : ''}
      <hr><div class="c peq">Obrigado pela preferência!</div>`;
  }

  /* ---------- Cartões das mesas ---------- */
  const CSS_CARTAO = `
    .cartao{width:100cqw;height:150cqw;background:#F07316;color:#151110;display:flex;flex-direction:column;align-items:center;justify-content:space-between;font-family:'Bricolage Grotesque','Segoe UI',Arial,sans-serif;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact;position:relative}
    .cartao .c-topo{display:flex;flex-direction:column;align-items:center;gap:1.5cqw;padding:7cqw 6cqw 0;text-align:center}
    .cartao .c-logo{height:24cqw;width:24cqw;border-radius:50%;background:#151110;color:#F07316;display:grid;place-items:center;font-weight:800;font-size:9cqw;overflow:hidden}
    .cartao .c-logo img{width:100%;height:100%;object-fit:contain}
    .cartao .c-nome{font-weight:800;font-size:6cqw;line-height:1.05;letter-spacing:-.02em}
    .cartao .c-mesa{display:flex;align-items:baseline;gap:3cqw;line-height:.85;padding:2cqw 0 3cqw}
    .cartao .c-mesa span{font-size:7cqw;font-weight:800;letter-spacing:.18em}
    .cartao .c-mesa b{font-size:25cqw;font-weight:800;letter-spacing:-.04em}
    .cartao .c-qr{background:#fff;border-radius:5cqw;padding:4cqw;width:52cqw;height:52cqw;box-shadow:0 0 0 1.5cqw #151110}
    .cartao .c-qr svg{width:100%;height:100%;display:block}
    .cartao .c-pe{width:100%;background:#151110;color:#fff;text-align:center;padding:4.5cqw 6cqw 5.5cqw;font-family:'Figtree',Arial,sans-serif}
    .cartao .c-pe b{display:block;font-size:5cqw;color:#F07316;font-family:'Bricolage Grotesque',Arial,sans-serif;font-weight:800}
    .cartao .c-pe span{font-size:3.8cqw;line-height:1.3;display:block;margin-top:1cqw}`;
  function qrSvg(texto) {
    const qr = window.qrcode(0, 'M');
    qr.addData(texto);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return `<svg viewBox="0 0 ${n} ${n}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="${d}" fill="#151110"/></svg>`;
  }
  function baseSite() { return API.modo === 'online' ? location.origin : DEMO_SITE; }
  const linkMesa = (n) => `${baseSite()}/?m=${S.codes[n]}`;
  function cartaoHtml(n) {
    const src = logoSrc(S.cfg);
    return `<div class="cartao">
      <div class="c-topo"><div class="c-logo">${src ? `<img src="${esc(src)}" alt="">` : esc((S.cfg.nome.trim()[0] || 'L'))}</div>${src ? '' : `<div class="c-nome">${esc(S.cfg.nome)}</div>`}</div>
      <div class="c-mesa"><span>MESA</span><b>${n}</b></div>
      <div class="c-qr">${qrSvg(linkMesa(n))}</div>
      <div class="c-pe"><b>Aponte a câmera do celular</b><span>Veja o cardápio e acompanhe a conta da sua mesa</span></div>
    </div>`;
  }
  function imprimirCartoes() {
    if (API.modo === 'demo') { toast('Na versão publicada no Netlify, este botão gera o arquivo para a gráfica.'); return; }
    const pags = [];
    for (let i = 1; i <= S.cfg.mesas; i++) pags.push(`<div class="pg">${cartaoHtml(i)}</div>`);
    imprimirDoc(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Figtree:wght@500;600&display=swap">
      <style>@page{size:100mm 150mm;margin:0}html,body{margin:0;padding:0}.pg{width:100mm;height:150mm;container-type:inline-size;page-break-after:always;break-after:page;overflow:hidden}${CSS_CARTAO}</style>${pags.join('')}`, true);
  }

  /* ---------- Faixas comuns ---------- */
  function faixaDemo() {
    if (API.modo !== 'demo') return '';
    return `<div class="faixa-demo"><div class="wrap"><b>Modo demonstração.</b><span>Os dados ficam só neste aparelho. Publicado no Netlify, todos os celulares e o notebook ficam ligados.</span></div></div>`;
  }
  function faixaOff() { return ui.offline ? '<div class="faixa-off" role="status">Sem conexão com o servidor. Tentando de novo…</div>' : ''; }
  function topo(titulo) {
    return `<header class="topo"><div class="wrap topo-in">
      <button class="marca" data-act="ir" data-t="inicio" aria-label="Voltar ao início">${logoHtml(S && S.cfg, 'sm')}<span>${esc((S && S.cfg.nome) || 'Lanchonete')}</span></button>
      <span class="topo-t">${esc(titulo)}</span><span class="esp"></span>
      ${sessao ? `<span class="quem"><span class="so-largo">Você é </span><b>${esc(sessao.nome)}</b></span><button class="btn mini no-escuro" data-act="sair">Trocar</button>` : ''}
    </div></header>${faixaOff()}${faixaDemo()}`;
  }

  /* ---------- Início ---------- */
  function vInicio() {
    const cfg = S && S.cfg;
    const portas = [
      ['garcom', 'Garçom', 'Lançar pedidos nas mesas e no balcão', 'Celular', true],
      ['cozinha', 'Cozinha', 'Pedidos chegando: novo, preparando e pronto', 'Tablet ou celular na parede'],
      ['caixa', 'Caixa', 'Contas, pagamentos, cardápio e relatório', 'Notebook'],
      ['cartoes', 'Cartões das mesas', 'QR Codes prontos para a gráfica', '10 × 15 cm']
    ];
    let mesasOpt = '';
    if (S) for (let i = 1; i <= S.cfg.mesas; i++) mesasOpt += `<option value="${i}">Mesa ${i}</option>`;
    return `${faixaDemo()}<main class="wrap inicio">
      <div class="hero">${logoHtml(cfg, 'lg')}<h1>${esc((cfg && cfg.nome) || 'Lanchonete')}</h1><p class="muted">Escolha a tela deste aparelho. Ele lembra da escolha.</p></div>
      <div class="portas">${portas.map(([t, n, d, a, pri]) => `<button class="porta ${pri ? 'principal' : ''}" data-act="ir" data-t="${t}"><span class="rot">${a}</span><b>${n}</b><span class="muted">${d}</span></button>`).join('')}</div>
      ${API.modo === 'demo' ? `<section class="bloco"><h2>Ver como cliente</h2><p class="muted">É isto que aparece quando alguém aponta a câmera para o cartão da mesa.</p>
        <div class="linha-btns"><label class="sr" for="demo-mesa">Mesa</label><select id="demo-mesa" style="max-width:180px">${mesasOpt}</select><button class="btn escuro" data-act="verCliente">Abrir tela do cliente</button></div>
        <div class="linha-btns"><button class="btn mini leve" data-act="zerarDemo">Zerar dados da demonstração</button></div></section>` : ''}
    </main>`;
  }

  /* ---------- Entrada da equipe ---------- */
  function vLogin(titulo) {
    if (API.modo === 'online' && !S) {
      return `${topo(titulo)}<main class="wrap login"><h1>Entrar</h1><p class="muted">Digite a senha da equipe.</p>
        <form id="f-pin" class="bloco"><label class="campo"><span>Senha da equipe</span><input id="lg-pin" type="password" inputmode="numeric" autocomplete="current-password" required></label>
        ${ui.loginErro ? `<p class="erro">${esc(ui.loginErro)}</p>` : ''}<button class="btn pri grande cheio">Continuar</button></form></main>`;
    }
    return `${topo(titulo)}<main class="wrap login"><h1>Quem é você?</h1><p class="muted">Seu nome fica marcado em cada pedido, cancelamento e pagamento.</p>
      <div class="nomes">${S.equipe.map((n) => `<button class="btn" data-act="entrar" data-n="${esc(n)}">${esc(n)}</button>`).join('')}</div></main>`;
  }

  /* ---------- Garçom ---------- */
  function contaDoAlvo() {
    const a = ui.g.alvo;
    if (!a) return null;
    if (a.conta) return contaPorId(a.conta) || null;
    if (a.mesa && a.mesa !== 'B') return L.contaDaMesa(S, a.mesa) || null;
    return null;
  }
  function rotuloAlvo() {
    const c = contaDoAlvo();
    if (c) return L.rotulo(c);
    const a = ui.g.alvo;
    return a.mesa === 'B' ? 'Balcão' + (a.nome ? ' · ' + a.nome : '') : 'Mesa ' + a.mesa;
  }
  function gradeMesas(opts) {
    let h = '';
    for (let i = 1; i <= S.cfg.mesas; i++) {
      const c = L.contaDaMesa(S, i);
      const pronto = c && S.pedidos.some((p) => p.conta === c.id && p.status === 'pronto');
      const desab = opts.desab && opts.desab(i, c);
      const sel = opts.sel && opts.sel(i, c);
      const outras = c ? c.mesas.filter((m) => m !== String(i)) : [];
      h += `<button class="mesa ${c ? 'ocupada' : ''} ${sel ? 'sel' : ''} ${desab ? 'desab' : ''}" data-act="${opts.act}" data-m="${i}" ${desab ? 'disabled' : ''}>
        <span class="num">${i}</span>
        ${c ? `<span class="tot">${brl(L.total(c))}</span><span class="sub">${outras.length ? 'junto com ' + outras.join(', ') : 'desde ' + hora(c.abertaEm)}</span>` : '<span class="sub">livre</span>'}
        ${pronto && opts.flag ? '<span class="flag">pronto</span>' : ''}</button>`;
    }
    return h;
  }
  function balcaoTiles(act, selId) {
    return S.contas.filter((c) => c.aberta && L.ehBalcao(c)).map((c) => `
      <button class="mesa ocupada balcao ${selId === c.id ? 'sel' : ''}" data-act="${act}" data-c="${c.id}"><span class="num">${esc(c.nome || 'Balcão')}</span><span class="tot">${brl(L.total(c))}</span><span class="sub">desde ${hora(c.abertaEm)}</span>
      ${S.pedidos.some((p) => p.conta === c.id && p.status === 'pronto') ? '<span class="flag">pronto</span>' : ''}</button>`).join('');
  }
  function prontosFaixa() {
    const ps = S.pedidos.filter((p) => p.status === 'pronto');
    if (!ps.length) return '';
    return `<div class="prontos" role="status">${ps.map((p) => {
      const c = contaPorId(p.conta);
      const itens = p.itens.map((id) => c && c.itens.find((i) => i.id === id)).filter((i) => i && !i.canc);
      return `<div class="pronto"><div class="txt"><b>${esc(c ? L.rotulo(c) : p.rotulo)}</b> · ${esc(itens.map((i) => i.qtd + '× ' + i.nome).join(', '))}<br><small>pronto há ${tempo(p.ts.pronto || p.em)}</small></div>
        <button class="btn mini escuro" data-act="statusPed" data-p="${p.id}" data-s="entregue">Levei à mesa</button></div>`;
    }).join('')}</div>`;
  }
  function gMesas() {
    return `<section class="secao"><div class="secao-cab"><h2>Mesas</h2><span class="muted">${S.contas.filter((c) => c.aberta && !L.ehBalcao(c)).length} com conta aberta</span></div>
      <div class="mesas">${gradeMesas({ act: 'abrirMesa', flag: true })}</div></section>
      <section class="secao"><div class="secao-cab"><h2>Balcão / Viagem</h2><span class="esp"></span><button class="btn pri mini" data-act="novoBalcao">Novo pedido</button></div>
      <div class="mesas">${balcaoTiles('abrirConta') || '<p class="muted">Nenhum pedido de balcão aberto.</p>'}</div></section>`;
  }
  function itemLinha(c, i, permiteCancelar) {
    const p = i.ped && S.pedidos.find((x) => x.id === i.ped);
    const conf = ui.g.conf === i.id || ui.cx.conf === i.id;
    return `<div class="item ${i.canc ? 'canc' : ''}">
      <span class="q">${i.qtd}×</span><span class="n">${esc(i.nome)}</span><span class="valor">${brl(i.qtd * i.preco)}</span>
      <div class="det">${i.sem.length ? `<span class="sem">sem ${esc(i.sem.join(', ').toLowerCase())}</span>` : ''}${i.obs ? `<span>“${esc(i.obs)}”</span>` : ''}
        ${p && !i.canc && p.status !== 'cancelado' ? `<span class="st ${p.status}">${{ novo: 'na fila', preparando: 'preparando', pronto: 'pronto', entregue: 'entregue' }[p.status]}</span>` : ''}
        <span>${esc(i.por)} · ${hora(i.em)}</span>
        ${i.canc ? `<span>cancelado por ${esc(i.canc.por)}</span>` : ''}
        ${permiteCancelar && !i.canc && !conf ? `<button class="btn mini leve" data-act="pedirCancel" data-i="${i.id}">Cancelar item</button>` : ''}</div>
      ${conf && !i.canc ? `<div class="conf"><span>Cancelar ${i.qtd}× ${esc(i.nome)}?</span><span class="esp"></span><button class="btn mini perigo" data-act="cancelarItem" data-c="${c.id}" data-i="${i.id}">Sim, cancelar</button><button class="btn mini" data-act="naoCancel">Não</button></div>` : ''}
    </div>`;
  }
  function listaItens(c, permiteCancelar) {
    if (!c.itens.length) return '<div class="itens"><p class="vazio">Nenhum item lançado ainda.</p></div>';
    const ord = c.itens.slice().sort((a, b) => b.em - a.em);
    return `<div class="itens">${ord.map((i) => itemLinha(c, i, permiteCancelar)).join('')}
      <div class="totais"><div class="grande"><span>Total</span><span>${brl(L.total(c))}</span></div>
      ${c.pags.length ? `<div><span>Já pago</span><span>${brl(L.pago(c))}</span></div><div><b>Falta</b><b>${brl(L.restante(c))}</b></div>` : ''}</div></div>`;
  }
  function gConta() {
    const c = contaDoAlvo();
    if (!c) {
      const a = ui.g.alvo || {};
      const fechou = a.conta && S.contas.find((x) => x.id === a.conta && !x.aberta);
      return `<div class="voltar"><button class="btn mini" data-act="gVoltar">← Mesas</button></div>
        <div class="bloco" style="margin-top:14px"><h2>${fechou ? 'Conta fechada' : 'Mesa livre'}</h2><p class="muted">${fechou ? 'Essa conta já foi paga no caixa.' : 'Nenhum pedido aberto.'}</p>
        ${!fechou ? '<button class="btn pri grande" data-act="gMenu">Lançar pedido</button>' : ''}</div>`;
    }
    const balc = L.ehBalcao(c);
    return `<div class="voltar"><button class="btn mini" data-act="gVoltar" aria-label="Voltar às mesas">←</button><h1>${esc(L.rotulo(c))}</h1></div>
      <p class="muted" style="padding:4px 0 12px">Aberta às ${hora(c.abertaEm)} por ${esc(c.abertaPor)}</p>
      ${listaItens(c, true)}
      <div class="secao"><button class="btn pri grande cheio" data-act="gMenu">+ Adicionar itens</button>
      ${!balc ? `<div class="linha-btns"><button class="btn" data-act="folha" data-f="juntar">Juntar mesa</button><button class="btn" data-act="folha" data-f="trocar">Trocar de mesa</button>
        ${c.mesas.length > 1 ? c.mesas.slice(1).map((m) => `<button class="btn" data-act="separar" data-m="${m}">Separar mesa ${m}</button>`).join('') : ''}</div>` : ''}
      <p class="muted">O pagamento é registrado no caixa.</p></div>`;
  }
  function gMenu() {
    const ativos = S.menu.filter((m) => m.ativo);
    const cats = Array.from(new Set(ativos.map((m) => m.cat)));
    const cat = cats.includes(ui.g.cat) ? ui.g.cat : cats[0];
    const noCarrinho = (mid) => ui.g.cart.filter((x) => x.mid === mid).reduce((a, x) => a + x.qtd, 0);
    return `<div class="voltar"><button class="btn mini" data-act="gVoltarConta" aria-label="Voltar">←</button><h1>${esc(rotuloAlvo())}</h1></div>
      <p class="muted" style="padding:4px 0 10px">Toque nos itens para montar o pedido.</p>
      <div class="cats" role="tablist">${cats.map((c) => `<button class="cat ${c === cat ? 'on' : ''}" data-act="cat" data-c="${esc(c)}" role="tab" aria-selected="${c === cat}">${esc(c)}</button>`).join('')}</div>
      <div class="cardapio">${ativos.filter((m) => m.cat === cat).map((m) => {
        const q = noCarrinho(m.id);
        return `<button class="prod" data-act="tocarItem" data-m="${m.id}"><span class="n">${esc(m.nome)}${q ? `<span class="noc">${q}</span>` : ''}</span><span class="p">${brl(m.preco)}</span>
          ${m.sab && m.sab.length ? `<span class="i">Sabores: ${esc(m.sab.join(', '))}</span>` : m.ing.length ? `<span class="i">${esc(m.ing.join(', '))}</span>` : ''}</button>`;
      }).join('')}</div>
      ${ui.g.cart.length ? `<div class="barra-pedido"><button class="btn pri grande" data-act="folha" data-f="cart">Ver pedido · ${ui.g.cart.reduce((a, x) => a + x.qtd, 0)} ${ui.g.cart.reduce((a, x) => a + x.qtd, 0) > 1 ? 'itens' : 'item'} · ${brl(ui.g.cart.reduce((a, x) => a + x.qtd * x.preco, 0))}</button></div>` : ''}`;
  }
  function gFolha() {
    const f = ui.g.sheet;
    if (!f) return '';
    let h = '';
    if (f.tipo === 'item') {
      const m = S.menu.find((x) => x.id === f.mid);
      if (!m) return '';
      h = `<div class="folha-cab"><h2 id="folha-t">${esc(m.nome)}</h2><button class="btn mini" data-act="fecharFolha">Fechar</button></div>
        ${m.sab && m.sab.length ? `<div class="campo"><span>Sabor</span><small>Escolha um.</small>
          <div class="chips">${m.sab.map((x) => `<button class="chip escolha ${f.sab === x ? 'on' : ''}" data-act="sabor" data-x="${esc(x)}" aria-pressed="${f.sab === x}">${esc(x)}</button>`).join('')}</div></div>` : ''}
        ${m.ing.length ? `<div class="campo"><span>Tirar ingredientes</span><small>Toque no que <b>não</b> vai no lanche.</small>
          <div class="chips">${m.ing.map((x) => `<button class="chip ${f.sem.includes(x) ? 'on' : ''}" data-act="chip" data-x="${esc(x)}" aria-pressed="${f.sem.includes(x)}">${esc(x)}</button>`).join('')}</div></div>` : ''}
        <label class="campo"><span>Alguma alteração?</span><textarea id="obs-${f.k}" placeholder="Ex.: sem ervilha, sem milho, molho à parte" maxlength="200"></textarea></label>
        <div class="qtd"><span class="rot">Quantidade</span><button class="btn" data-act="qtdItem" data-d="-1" aria-label="Menos">−</button><b>${f.qtd}</b><button class="btn" data-act="qtdItem" data-d="1" aria-label="Mais">+</button></div>
        <button class="btn pri grande cheio" data-act="addItem">Adicionar · ${brl(m.preco * f.qtd)}</button>`;
    } else if (f.tipo === 'cart') {
      const tot = ui.g.cart.reduce((a, x) => a + x.qtd * x.preco, 0);
      h = `<div class="folha-cab"><h2 id="folha-t">Pedido · ${esc(rotuloAlvo())}</h2><button class="btn mini" data-act="fecharFolha">Continuar escolhendo</button></div>
        <div class="itens carrinho">${ui.g.cart.map((x) => `<div class="item"><span class="n">${x.qtd}× ${esc(x.nome)}</span><span class="valor">${brl(x.qtd * x.preco)}</span>
          <div class="det">${x.sem.length ? `<span class="sem">sem ${esc(x.sem.join(', ').toLowerCase())}</span>` : ''}${x.obs ? `<span>“${esc(x.obs)}”</span>` : ''}
          <span class="esp"></span><button class="btn mini" data-act="cartQtd" data-k="${x.k}" data-d="-1" aria-label="Menos">−</button><button class="btn mini" data-act="cartQtd" data-k="${x.k}" data-d="1" aria-label="Mais">+</button></div></div>`).join('')}
          <div class="totais"><div class="grande"><span>Este pedido</span><span>${brl(tot)}</span></div></div></div>
        <button class="btn pri grande cheio" data-act="enviar">Enviar pedido</button>
        <button class="btn leve" data-act="limparCart">Descartar pedido</button>`;
    } else if (f.tipo === 'balcao') {
      h = `<div class="folha-cab"><h2 id="folha-t">Pedido de balcão / viagem</h2><button class="btn mini" data-act="fecharFolha">Fechar</button></div>
        <form id="f-balcao" class="campo"><label class="campo"><span>Nome do cliente</span><input id="balcao-nome" type="text" placeholder="Ex.: Carlos" maxlength="40" autocomplete="off"></label>
        <button class="btn pri grande cheio">Começar pedido</button></form>`;
    } else if (f.tipo === 'juntar' || f.tipo === 'trocar') {
      const c = contaDoAlvo();
      if (!c) return '';
      const juntar = f.tipo === 'juntar';
      h = `<div class="folha-cab"><h2 id="folha-t">${juntar ? 'Juntar com qual mesa?' : 'Mudar para qual mesa?'}</h2><button class="btn mini" data-act="fecharFolha">Fechar</button></div>
        <p class="muted">${juntar ? 'Se a mesa escolhida já tiver conta, os itens dela passam para esta conta.' : 'Só aparecem as mesas livres.'}</p>
        <div class="mesas">${gradeMesas({ act: juntar ? 'juntar' : 'trocar', desab: (i, cc) => c.mesas.includes(String(i)) || (!juntar && !!cc) })}</div>`;
    }
    return `<div class="veu" data-act="fundoFolha"><div class="folha" role="dialog" aria-modal="true" aria-labelledby="folha-t">${h}</div></div>`;
  }
  function vGarcom() {
    const v = ui.g.vista;
    const corpo = v === 'mesas' ? gMesas() : v === 'conta' ? gConta() : gMenu();
    return `${topo('Garçom')}<main class="wrap">${prontosFaixa()}${corpo}</main>${gFolha()}`;
  }

  /* ---------- Cozinha ---------- */
  function vCozinha() {
    const cols = [['novo', 'Novos'], ['preparando', 'Preparando'], ['pronto', 'Prontos']];
    const comanda = (p) => {
      const c = contaPorId(p.conta);
      const itens = p.itens.map((id) => c && c.itens.find((i) => i.id === id)).filter((i) => i && !i.canc);
      const min = minDesde(p.em);
      const tarde = p.status !== 'pronto' && min >= 15;
      const prox = { novo: ['preparando', 'Começar a preparar'], preparando: ['pronto', 'Marcar pronto'], pronto: ['entregue', 'Entregue'] }[p.status];
      const volta = { preparando: 'novo', pronto: 'preparando' }[p.status];
      return `<article class="comanda ${tarde ? 'atraso' : ''}">
        <div class="comanda-cab"><b>${esc(c ? L.rotulo(c) : p.rotulo)}</b><span class="muted">${esc(p.por)} · ${hora(p.em)}</span><span class="tempo ${tarde ? 'tarde' : ''}">${tempo(p.em)}</span></div>
        <ul>${itens.map((i) => `<li><b>${i.qtd}× ${esc(i.nome)}</b>${i.sem.length ? `<span class="sem">SEM ${esc(i.sem.join(', ').toUpperCase())}</span>` : ''}${i.obs ? `<span class="obs">${esc(i.obs)}</span>` : ''}</li>`).join('')}</ul>
        <div class="acoes"><button class="btn pri" data-act="statusPed" data-p="${p.id}" data-s="${prox[0]}">${prox[1]}</button>
          <button class="btn" data-act="imprimirPed" data-p="${p.id}">Imprimir</button>
          ${volta ? `<button class="btn leve" data-act="statusPed" data-p="${p.id}" data-s="${volta}">Voltar</button>` : ''}</div></article>`;
    };
    return `${topo('Cozinha')}<main class="wrap">
      <div class="secao-cab" style="padding-top:14px"><span class="muted">Mostra só lanches e comidas. Bebidas ficam com o garçom.</span><span class="esp"></span>
        <button class="btn mini ${ui.som ? 'escuro' : 'pri'}" data-act="som">${ui.som ? 'Som ligado' : 'Ligar som de aviso'}</button></div>
      <div class="coz">${cols.map(([st, nome]) => {
        const ps = S.pedidos.filter((p) => p.status === st).sort((a, b) => a.em - b.em);
        return `<section class="col col-${st}"><div class="col-cab"><h2>${nome}</h2><span class="n">${ps.length}</span></div>
          ${ps.map(comanda).join('') || '<p class="muted vazio">Nada aqui.</p>'}</section>`;
      }).join('')}</div></main>`;
  }

  /* ---------- Caixa ---------- */
  function cxTurno() {
    if (!S.turno) {
      return `<form id="f-abrir" class="turno fechado"><div><b>Caixa fechado.</b> <span>Abra para registrar pagamentos.</span></div><span class="esp"></span>
        <label class="campo"><span class="rot">Troco inicial</span><input id="fundo" type="text" inputmode="decimal" placeholder="0,00"></label>
        <button class="btn pri">Abrir caixa</button></form>`;
    }
    const t = S.turno;
    const r = L.relatorio(S);
    return `<div class="turno aberto"><span class="pill ok">Caixa aberto</span><span>desde <b>${dataHora(t.abertoEm)}</b> por ${esc(t.abertoPor)}</span>
      <span class="muted">· recebido ${brl(r.total)}</span><span class="esp"></span>
      ${ui.cx.confFechar ? `<span><b>Fechar o caixa agora?</b> ${r.abertas ? `Ainda há ${r.abertas} conta(s) aberta(s), que passam para o próximo caixa.` : ''}</span>
        <button class="btn perigo" data-act="fecharCaixa">Sim, fechar</button><button class="btn" data-act="confFechar" data-v="0">Não</button>`
        : '<button class="btn escuro" data-act="confFechar" data-v="1">Fechar caixa</button>'}</div>`;
  }
  function cxPainel() {
    const c = contaPorId(ui.cx.sel);
    if (!c) return '<div class="painel bloco"><h2>Escolha uma mesa</h2><p class="muted">Toque numa mesa laranja para ver a conta e receber.</p></div>';
    if (!c.aberta) {
      return `<div class="painel bloco"><span class="pill ok">Paga</span><h2>${esc(L.rotulo(c))}</h2><p>Conta de ${brl(L.total(c))} fechada às ${hora(c.fechadaEm)} por ${esc(c.fechadaPor)}.</p>
        <div class="pags">${c.pags.map((p) => `<div class="pag"><span>${p.forma}</span><span class="esp"></span><span class="valor">${brl(p.valor)}</span></div>`).join('')}</div>
        <button class="btn" data-act="cxSel" data-c="">Fechar</button></div>`;
    }
    const rest = L.restante(c);
    const key = c.id + '-' + c.pags.length;
    const total = L.total(c);
    return `<div class="painel">
      <div class="secao-cab"><h2>${esc(L.rotulo(c))}</h2><span class="esp"></span><button class="btn mini" data-act="imprimirConta" data-c="${c.id}">Imprimir conta</button></div>
      ${listaItens(c, true)}
      ${c.pags.length ? `<div class="pags">${c.pags.map((p) => `<div class="pag"><span>${p.forma}</span><span class="muted">${hora(p.t)} · ${esc(p.por)}</span><span class="esp"></span><span class="valor">${brl(p.valor)}</span>
        ${ui.cx.conf === 'pag-' + p.id ? `<button class="btn mini perigo" data-act="removerPag" data-c="${c.id}" data-p="${p.id}">Remover</button><button class="btn mini" data-act="naoCancel">Não</button>` : `<button class="btn mini leve" data-act="pedirRemPag" data-p="${p.id}" aria-label="Remover pagamento">×</button>`}</div>`).join('')}</div>` : ''}
      <div class="restante"><span>Falta receber</span><b>${brl(rest)}</b></div>
      ${!S.turno ? '<p class="aviso-pag">Abra o caixa (acima) para registrar o pagamento.</p>' : total === 0 ? `<button class="btn" data-act="liberar" data-c="${c.id}">Liberar mesa sem consumo</button>` : `
      <form id="f-pagar" class="bloco" data-c="${c.id}">
        <div class="duas"><label class="campo"><span>Dividir a conta</span><input id="dv-${key}" type="number" min="1" max="30" value="2" inputmode="numeric"></label>
          <div class="campo"><span>Cada pessoa paga</span><button type="button" class="btn" data-act="usarDiv" data-k="${key}" data-r="${rest}" id="dv-out">${brl(rest / 2)}</button></div></div>
        <label class="campo"><span>Valor deste pagamento</span><input id="pg-valor-${key}" type="text" inputmode="decimal" value="${fmt(rest)}" autocomplete="off"></label>
        <div class="campo"><span>Forma</span><div class="formas" role="radiogroup">${FORMAS.map((f) => `<button type="button" class="forma ${ui.cx.forma === f ? 'on' : ''}" data-act="forma" data-f="${f}" role="radio" aria-checked="${ui.cx.forma === f}">${f}</button>`).join('')}</div></div>
        ${ui.cx.forma === 'Dinheiro' ? `<div class="duas"><label class="campo"><span>Cliente entregou</span><input id="pg-receb-${key}" type="text" inputmode="decimal" placeholder="0,00"></label>
          <div class="campo"><span>Troco</span><b id="troco" style="font-size:1.4rem;padding-top:8px">—</b></div></div>` : ''}
        <button class="btn pri grande cheio">Registrar pagamento</button>
        <p class="muted" style="font-size:.85rem">Digite este valor na maquininha. Quando falta zero, a mesa é liberada sozinha.</p>
      </form>`}
      <button class="btn" data-act="cxLancar" data-c="${c.id}">+ Lançar itens nesta conta</button>
    </div>`;
  }
  function cxMesas() {
    return `<div class="cx"><div>
      <section class="secao"><div class="secao-cab"><h2>Mesas</h2></div><div class="mesas">${gradeMesas({ act: 'cxMesa', sel: (i, c) => c && c.id === ui.cx.sel })}</div></section>
      <section class="secao"><div class="secao-cab"><h2>Balcão / Viagem</h2><span class="esp"></span><button class="btn mini pri" data-act="cxBalcao">Novo pedido</button></div>
        <div class="mesas">${balcaoTiles('cxSel', ui.cx.sel) || '<p class="muted">Nenhum pedido de balcão aberto.</p>'}</div></section>
      ${(() => { const fech = S.contas.filter((c) => !c.aberta).sort((a, b) => b.fechadaEm - a.fechadaEm); return fech.length ? `<section class="secao"><h2>Pagas neste caixa</h2>
        <div class="tabela-wrap"><table><thead><tr><th>Conta</th><th>Fechada</th><th>Forma</th><th class="d">Total</th></tr></thead><tbody>
        ${fech.map((c) => `<tr><td><button class="btn mini leve" data-act="cxSel" data-c="${c.id}">${esc(L.rotulo(c))}</button></td><td>${hora(c.fechadaEm)}</td><td>${esc(Array.from(new Set(c.pags.map((p) => p.forma))).join(' + ') || '—')}</td><td class="d">${brl(L.total(c))}</td></tr>`).join('')}
        </tbody></table></div></section>` : ''; })()}
    </div>${cxPainel()}</div>`;
  }
  function cxRelatorio() {
    const r = L.relatorio(S);
    const hist = S.turnos;
    let atual = '<div class="bloco"><h2>Caixa fechado</h2><p class="muted">Abra o caixa para começar a contar as vendas.</p></div>';
    if (r) {
      const max = Math.max(1, ...r.itens.map((i) => i.qtd));
      atual = `<div class="kpis">
        <div class="kpi destaque"><span class="rot">Recebido neste caixa</span><b>${brl(r.total)}</b></div>
        ${FORMAS.map((f) => `<div class="kpi"><span class="rot">${f}</span><b>${brl(r.porForma[f] || 0)}</b></div>`).join('')}
      </div>
      <div class="kpis">
        <div class="kpi"><span class="rot">Contas pagas</span><b>${r.nContas}</b></div>
        <div class="kpi"><span class="rot">Ticket médio</span><b>${brl(r.ticket)}</b></div>
        <div class="kpi"><span class="rot">Dinheiro na gaveta</span><b>${brl(r.gaveta)}</b><small class="muted">troco inicial ${brl(r.fundo)} + dinheiro</small></div>
        <div class="kpi"><span class="rot">Ainda em aberto</span><b>${brl(r.emAberto)}</b><small class="muted">${r.abertas} conta(s)</small></div>
      </div>
      <div class="grade2">
        <section class="bloco"><h2>Mais vendidos</h2>${r.itens.length ? `<div class="barras">${r.itens.slice(0, 12).map((i) => `<div class="barra"><span>${esc(i.nome)}</span><span class="trilho"><i style="width:${(i.qtd / max) * 100}%"></i></span><span class="valor">${i.qtd}</span></div>`).join('')}</div>` : '<p class="muted">Nenhuma venda ainda.</p>'}</section>
        <section class="bloco"><h2>Cancelamentos e correções</h2>${r.cancelamentos.length ? `<div class="pags">${r.cancelamentos.map((l) => `<div class="pag"><span class="muted">${hora(l.t)}</span><span><b>${esc(l.por)}</b> · ${esc(l.txt)}</span></div>`).join('')}</div>` : '<p class="muted">Nenhum cancelamento neste caixa.</p>'}</section>
      </div>`;
    }
    return `<div class="secao">${atual}
      <section class="secao"><h2>Caixas anteriores</h2>${hist.length ? `<div class="tabela-wrap"><table><thead><tr><th>Abertura</th><th>Fechamento</th><th>Quem</th>${FORMAS.map((f) => `<th class="d">${f}</th>`).join('')}<th class="d">Total</th></tr></thead><tbody>
        ${hist.map((t) => `<tr><td>${dataHora(t.abertoEm)}</td><td>${dataHora(t.fechadoEm)}</td><td>${esc(t.abertoPor)} / ${esc(t.fechadoPor)}</td>${FORMAS.map((f) => `<td class="d">${fmt(t.resumo.porForma[f] || 0)}</td>`).join('')}<td class="d"><b>${brl(t.resumo.total)}</b></td></tr>`).join('')}
        </tbody></table></div>` : '<p class="muted">Quando você fechar o primeiro caixa, ele aparece aqui.</p>'}</section></div>`;
  }
  function cxCardapio() {
    const e = ui.cx.edit;
    const m = e && e !== 'novo' ? S.menu.find((x) => x.id === e) : null;
    const k = e ? (m ? m.id : 'novo') : '';
    const cats = Array.from(new Set(S.menu.map((x) => x.cat)));
    const form = e ? `<form id="f-menu" class="bloco" data-id="${m ? m.id : ''}"><h2>${m ? 'Editar ' + esc(m.nome) : 'Novo item'}</h2>
      <div class="ed">
        <label class="campo"><span>Nome</span><input id="me-nome-${k}" type="text" value="${esc(m ? m.nome : '')}" required maxlength="60"></label>
        <label class="campo"><span>Categoria</span><input id="me-cat-${k}" type="text" list="cats" value="${esc(m ? m.cat : 'Lanches')}" maxlength="30"><datalist id="cats">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></label>
        <label class="campo"><span>Preço (R$)</span><input id="me-preco-${k}" type="text" inputmode="decimal" value="${m ? fmt(m.preco) : ''}" required></label>
        <label class="campo larga"><span>Ingredientes que dá para tirar</span><input id="me-ing-${k}" type="text" value="${esc(m ? m.ing.join(', ') : '')}" placeholder="Ex.: Milho, Ervilha, Tomate"><small>Separe por vírgula. Viram os botões que o garçom toca.</small></label>
        <label class="campo larga"><span>Sabores (o garçom escolhe um)</span><input id="me-sab-${k}" type="text" value="${esc(m && m.sab ? m.sab.join(', ') : '')}" placeholder="Ex.: Carne, Frango, Queijo"><small>Deixe vazio se o item não tem sabor.</small></label>
        <label class="check"><input id="me-coz-${k}" type="checkbox" ${!m || m.cozinha ? 'checked' : ''}> Vai para a cozinha</label>
        <label class="check"><input id="me-atv-${k}" type="checkbox" ${!m || m.ativo ? 'checked' : ''}> Disponível hoje</label>
      </div>
      <div class="linha-btns"><button class="btn pri">Salvar item</button><button type="button" class="btn" data-act="editMenu" data-m="">Cancelar</button>
      ${m ? (ui.cx.conf === 'menu-' + m.id ? `<span class="esp"></span><b>Remover do cardápio?</b><button type="button" class="btn perigo" data-act="removerMenu" data-m="${m.id}">Remover</button>` : `<span class="esp"></span><button type="button" class="btn leve" data-act="pedirRemMenu" data-m="${m.id}">Remover item</button>`) : ''}</div></form>` : '';
    return `<div class="secao"><div class="secao-cab"><h2>Cardápio</h2><span class="muted">Preços de exemplo. Troque pelos seus.</span><span class="esp"></span>${!e ? '<button class="btn pri" data-act="editMenu" data-m="novo">+ Novo item</button>' : ''}</div>
      ${form}
      ${cats.map((c) => `<section class="secao"><h3>${esc(c)}</h3><div class="itens">${S.menu.filter((x) => x.cat === c).map((x) => `<div class="prod-ed ${x.ativo ? '' : 'off'}">
        <div><b>${esc(x.nome)}</b> <span class="valor">· ${brl(x.preco)}</span> ${x.cozinha ? '<span class="pill lar">cozinha</span>' : ''} ${x.ativo ? '' : '<span class="pill warn">em falta</span>'}
        ${x.sab && x.sab.length ? `<div class="i">Sabores: ${esc(x.sab.join(', '))}</div>` : ''}${x.ing.length ? `<div class="i">${esc(x.ing.join(', '))}</div>` : ''}</div>
        <div class="linha-btns"><button class="btn mini" data-act="ativoMenu" data-m="${x.id}">${x.ativo ? 'Marcar em falta' : 'Voltou'}</button><button class="btn mini escuro" data-act="editMenu" data-m="${x.id}">Editar</button></div></div>`).join('')}</div></section>`).join('')}</div>`;
  }
  function cxAjustes() {
    return `<div class="grade2 secao">
      <form id="f-cfg" class="bloco"><h2>Lanchonete</h2>
        <label class="campo"><span>Nome</span><input id="aj-nome" type="text" value="${esc(S.cfg.nome)}" maxlength="50"></label>
        <div class="duas"><label class="campo"><span>Número de mesas</span><input id="aj-mesas" type="number" min="1" max="80" value="${S.cfg.mesas}"></label>
        <label class="campo"><span>Bobina da impressora</span><select id="aj-imp"><option value="80" ${S.cfg.impressora === 80 ? 'selected' : ''}>80 mm</option><option value="58" ${S.cfg.impressora === 58 ? 'selected' : ''}>58 mm</option></select></label></div>
        <button class="btn pri">Salvar</button></form>
      <div class="bloco"><h2>Logo</h2><div class="linha-btns" style="align-items:center">${logoHtml(S.cfg, 'lg')}<label class="btn"><input id="aj-logo" type="file" accept="image/*" class="sr">Escolher imagem</label></div>
        <p class="muted">Aparece no topo, na tela do cliente e nos cartões das mesas. PNG com fundo transparente fica melhor.</p></div>
      <div class="bloco"><h2>Equipe</h2><div class="pags">${S.equipe.map((n) => `<div class="pag"><b>${esc(n)}</b><span class="esp"></span><button class="btn mini leve" data-act="remEquipe" data-n="${esc(n)}">Remover</button></div>`).join('')}</div>
        <form id="f-equipe" class="linha-btns"><label class="sr" for="aj-novo">Novo nome</label><input id="aj-novo" type="text" placeholder="Nome" maxlength="30" style="flex:1;min-width:140px"><button class="btn escuro">Adicionar</button></form>
        <p class="muted">${API.modo === 'online' ? 'A senha da equipe fica no Netlify (variável EQUIPE_PIN).' : 'No Netlify, todos entram com uma senha da equipe que você define.'}</p></div>
      ${API.modo === 'demo' ? '<div class="bloco"><h2>Demonstração</h2><p class="muted">Apaga os pedidos de teste e volta ao cardápio de exemplo.</p><button class="btn" data-act="zerarDemo">Zerar demonstração</button></div>' : ''}
    </div>`;
  }
  function vCaixa() {
    const abas = [['mesas', 'Mesas e contas'], ['relatorio', 'Relatório'], ['cardapio', 'Cardápio'], ['ajustes', 'Ajustes']];
    const t = ui.cx.tab;
    const corpo = t === 'mesas' ? cxMesas() : t === 'relatorio' ? cxRelatorio() : t === 'cardapio' ? cxCardapio() : cxAjustes();
    return `${topo('Caixa')}<main class="wrap">${cxTurno()}
      <nav class="abas" aria-label="Seções do caixa">${abas.map(([k, n]) => `<button class="aba ${t === k ? 'on' : ''}" data-act="aba" data-t="${k}">${n}</button>`).join('')}<button class="aba" data-act="ir" data-t="cartoes">Cartões das mesas</button></nav>
      ${corpo}</main>`;
  }

  /* ---------- Cartões ---------- */
  function vCartoes() {
    let h = '';
    for (let i = 1; i <= S.cfg.mesas; i++) {
      h += `<div class="campo"><div class="cartao-cx">${cartaoHtml(i)}</div>
        <div class="link-mesa"><span class="esp">${esc(linkMesa(i))}</span><button class="btn mini" data-act="copiar" data-v="${esc(linkMesa(i))}">Copiar</button></div></div>`;
    }
    return `${topo('Cartões das mesas')}<main class="wrap"><div class="secao">
      <div class="secao-cab"><div><h1 style="font-size:1.8rem">Cartões das mesas</h1><p class="muted">Tamanho 10 × 15 cm, um por página. Cada cartão leva a um link secreto da mesa.</p></div><span class="esp"></span>
        <button class="btn pri grande" data-act="imprimirCartoes">Gerar arquivo para a gráfica</button></div>
      ${API.modo === 'demo' ? '<p class="aviso-pag">Na demonstração, os QR Codes apontam para um endereço de exemplo. Depois de publicar no Netlify, gere os cartões de novo pelo site para levar à gráfica.</p>' : '<p class="muted">Na janela de impressão, escolha “Salvar como PDF” e leve o arquivo para a gráfica. Peça impressão sem margem, em papel firme ou PVC.</p>'}
      <div class="cartoes-grade">${h}</div></div></main>`;
  }

  /* ---------- Cliente ---------- */
  function vCliente() {
    if (!cliente) {
      return `<main class="wrap cli"><h1>${cliente === null ? 'Carregando…' : ''}</h1></main>`;
    }
    if (cliente.erro) return `<main class="wrap cli"><h1>Mesa não encontrada</h1><p class="muted">Peça ajuda ao garçom.</p></main>`;
    const d = cliente;
    const cats = Array.from(new Set(d.menu.map((m) => m.cat)));
    const c = d.conta;
    return `<header class="cli-topo"><div class="wrap">${logoHtml(d.cfg, 'sm')}<div><b>${esc(d.cfg.nome)}</b><span class="muted" style="color:inherit;opacity:.7;font-size:.85rem">Atualizado às ${hora(d.t)}</span></div>
      <div class="mesa-tag"><span>${d.mesas.length > 1 ? 'Mesas' : 'Mesa'}</span><strong>${esc(d.mesas.join(' + '))}</strong></div></div></header>
      ${API.modo === 'demo' ? `<div class="faixa-demo"><div class="wrap"><b>Prévia do cliente.</b><span class="esp"></span><button class="btn mini" data-act="sairCliente">Voltar ao sistema</button></div></div>` : ''}
      <main class="wrap cli">
        <section class="campo"><h2>Sua conta</h2>
        ${c && c.itens.length ? `<div class="itens">${c.itens.map((i) => `<div class="item"><span class="q">${i.qtd}×</span><span class="n">${esc(i.nome)}</span><span class="valor">${brl(i.qtd * i.preco)}</span>
          ${i.sem.length || i.obs ? `<div class="det">${i.sem.length ? `<span>sem ${esc(i.sem.join(', ').toLowerCase())}</span>` : ''}${i.obs ? `<span>“${esc(i.obs)}”</span>` : ''}</div>` : ''}</div>`).join('')}
          <div class="totais"><div class="grande"><span>Total</span><span>${brl(c.total)}</span></div>${c.pago ? `<div><span>Já pago</span><span>${brl(c.pago)}</span></div><div><b>Falta</b><b>${brl(c.restante)}</b></div>` : ''}</div></div>
          <p class="aviso-pag">Para pagar, chame a gente ou vá até o caixa. Aceitamos débito, crédito, Pix e dinheiro.</p>`
          : '<div class="itens"><p class="vazio">Nenhum pedido nesta mesa ainda. Chame o garçom quando quiser pedir.</p></div>'}
        </section>
        <section class="cli-menu"><h2>Cardápio</h2>${cats.map((ct) => `<div class="cli-cat"><h3>${esc(ct)}</h3>${d.menu.filter((m) => m.cat === ct).map((m) => `<div class="cli-prod"><b>${esc(m.nome)}</b><span class="p">${brl(m.preco)}</span>${m.sab && m.sab.length ? `<span class="i">${esc(m.sab.join(' · '))}</span>` : m.ing.length ? `<span class="i">${esc(m.ing.join(', '))}</span>` : ''}</div>`).join('')}</div>`).join('')}</section>
      </main>`;
  }
  async function carregarCliente() {
    try { const d = await API.mesa(codigoMesa); cliente = d || { erro: true }; } catch (e) { if (!cliente) cliente = { erro: true }; }
    render();
  }

  /* ---------- Prévia de impressão (demonstração) ---------- */
  function vPrevia() {
    if (!ui.previa) return '';
    const w = S.cfg.impressora || 80;
    return `<div class="veu" data-act="fecharPrevia"><div class="folha" role="dialog" aria-modal="true" aria-labelledby="pv-t">
      <div class="folha-cab"><h2 id="pv-t">Assim sai na impressora</h2><button class="btn mini" data-act="fecharPrevia">Fechar</button></div>
      <style>.ticket .c{text-align:center}.ticket .big{font-size:2em;font-weight:900}.ticket .m{font-size:1.25em;font-weight:900}.ticket hr{border:0;border-top:1px dashed #000;margin:6px 0}.ticket .l{display:flex;justify-content:space-between;gap:6px}.ticket .it{margin:6px 0}.ticket .sem{font-weight:900}.ticket .peq{font-size:.9em}</style>
      <div class="ticket" style="width:${w === 58 ? 220 : 300}px">${ui.previa}</div>
      <p class="muted">Bobina de ${w} mm. Na versão publicada, o botão abre a impressão direto.</p></div></div>`;
  }

  /* ---------- Render ---------- */
  const TELAS_EQUIPE = { garcom: 'Garçom', cozinha: 'Cozinha', caixa: 'Caixa', cartoes: 'Cartões das mesas' };
  function vista() {
    if (tela === 'cliente') return vCliente();
    if (ui.carregando) return '<main class="wrap login"><p class="muted">Carregando…</p></main>';
    if (tela === 'inicio') return vInicio();
    if (!S || !sessao || (S.equipe.indexOf(sessao.nome) === -1)) return vLogin(TELAS_EQUIPE[tela]);
    if (tela === 'garcom') return vGarcom();
    if (tela === 'cozinha') return vCozinha();
    if (tela === 'caixa') return vCaixa() + gFolhaCaixa();
    if (tela === 'cartoes') return vCartoes();
    return vInicio();
  }
  function gFolhaCaixa() { return ui.g.sheet && ui.g.sheet.tipo === 'balcao' ? gFolha() : ''; }
  function render() {
    const app = $('#app');
    const vals = {};
    app.querySelectorAll('input[id], textarea[id], select[id]').forEach((el) => {
      if (el.type === 'file') return;
      vals[el.id] = el.type === 'checkbox' ? el.checked : el.value;
    });
    const ae = document.activeElement;
    const foco = ae && ae.id && app.contains(ae) ? { id: ae.id, s: ae.selectionStart, e: ae.selectionEnd } : null;
    app.innerHTML = vista() + (S ? vPrevia() : '');
    Object.keys(vals).forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = vals[id]; else el.value = vals[id];
    });
    if (foco) {
      const el = document.getElementById(foco.id);
      if (el) { el.focus({ preventScroll: true }); try { if (foco.s != null) el.setSelectionRange(foco.s, foco.e); } catch (e) { /* ok */ } }
    }
    atualizarDivisao();
    atualizarTroco();
  }
  function atualizarDivisao() {
    const inp = document.querySelector('input[id^="dv-"]');
    const out = $('#dv-out');
    if (!inp || !out) return;
    const n = Math.max(1, parseInt(inp.value, 10) || 1);
    const rest = Number(out.dataset.r);
    out.textContent = brl(Math.ceil((rest / n) * 100) / 100);
  }
  function atualizarTroco() {
    const rec = document.querySelector('input[id^="pg-receb-"]');
    const val = document.querySelector('input[id^="pg-valor-"]');
    const out = $('#troco');
    if (!rec || !val || !out) return;
    const t = num(rec.value) - num(val.value);
    out.textContent = rec.value ? (t >= 0 ? brl(t) : 'falta ' + brl(-t)) : '—';
  }

  /* ---------- Ações ---------- */
  const A = {
    ir(d) { ir(d.t); },
    sair() { sessao = null; guarda.set('sessao', null); render(); },
    async entrar(d) {
      sessao = { nome: d.n, pin: API.pin() };
      guarda.set('sessao', sessao);
      guarda.set('tela', tela);
      render();
    },
    verCliente() { const n = $('#demo-mesa').value; codigoMesa = S.codes[n]; tela = 'cliente'; cliente = null; carregarCliente(); window.scrollTo(0, 0); },
    sairCliente() { tela = 'inicio'; render(); },
    zerarDemo() { API.demo = L.seed(); guarda.set('demo-estado-v3', API.demo); S = API.demo; ui.g = { vista: 'mesas', alvo: null, cart: [], cat: null, sheet: null, conf: null }; ui.cx.sel = null; toast('Demonstração zerada.'); render(); },
    // garçom
    abrirMesa(d) {
      const c = L.contaDaMesa(S, d.m);
      ui.g.alvo = c ? { conta: c.id } : { mesa: String(d.m) };
      ui.g.cart = []; ui.g.conf = null;
      ui.g.vista = c ? 'conta' : 'menu';
      window.scrollTo(0, 0); render();
    },
    abrirConta(d) { ui.g.alvo = { conta: d.c }; ui.g.cart = []; ui.g.vista = 'conta'; window.scrollTo(0, 0); render(); },
    gVoltar() { ui.voltarCaixa = false; ui.g.vista = 'mesas'; ui.g.alvo = null; ui.g.cart = []; render(); },
    gVoltarConta() {
      if (ui.g.cart.length && !ui.g.avisouVoltar) { ui.g.avisouVoltar = true; toast('Tem itens no pedido. Toque de novo para descartar.'); setTimeout(() => { ui.g.avisouVoltar = false; }, 3000); return; }
      ui.g.avisouVoltar = false; ui.g.cart = [];
      if (contaDoAlvo()) ui.g.vista = 'conta'; else { ui.g.vista = 'mesas'; ui.g.alvo = null; }
      render();
    },
    gMenu() { ui.g.vista = 'menu'; window.scrollTo(0, 0); render(); },
    novoBalcao() { ui.g.sheet = { tipo: 'balcao' }; render(); setTimeout(() => { const i = $('#balcao-nome'); if (i) i.focus(); }, 50); },
    cat(d) { ui.g.cat = d.c; render(); },
    tocarItem(d) {
      const m = S.menu.find((x) => x.id === d.m);
      if (!m) return;
      if (m.ing.length || m.cozinha || (m.sab && m.sab.length)) { ui.g.sheet = { tipo: 'item', mid: m.id, sem: [], sab: '', qtd: 1, k: L.rnd(5) }; render(); return; }
      addCart(m, 1, [], '');
      toast(`+1 ${m.nome}`);
      render();
    },
    sabor(d) { ui.g.sheet.sab = d.x; render(); },
    chip(d) { const f = ui.g.sheet; const i = f.sem.indexOf(d.x); if (i >= 0) f.sem.splice(i, 1); else f.sem.push(d.x); render(); },
    qtdItem(d) { const f = ui.g.sheet; f.qtd = Math.max(1, Math.min(30, f.qtd + Number(d.d))); render(); },
    addItem() {
      const f = ui.g.sheet; const m = S.menu.find((x) => x.id === f.mid);
      if (m.sab && m.sab.length && !f.sab) { toast('Escolha o sabor primeiro.', 'erro'); return; }
      const obs = ($('#obs-' + f.k) || {}).value || '';
      addCart(m, f.qtd, f.sem.slice(), obs.trim(), f.sab);
      ui.g.sheet = null; toast(`+${f.qtd} ${m.nome}${f.sab ? ' – ' + f.sab : ''}`); render();
    },
    cartQtd(d) {
      const x = ui.g.cart.find((y) => y.k === d.k);
      if (!x) return;
      x.qtd += Number(d.d);
      if (x.qtd <= 0) ui.g.cart = ui.g.cart.filter((y) => y !== x);
      if (!ui.g.cart.length) ui.g.sheet = null;
      render();
    },
    limparCart() { ui.g.cart = []; ui.g.sheet = null; render(); },
    folha(d) { ui.g.sheet = { tipo: d.f }; render(); },
    fecharFolha() { ui.g.sheet = null; if (tela === 'caixa') ui.voltarCaixa = false; render(); },
    fundoFolha(d, el, e) { if (e.target === el) { ui.g.sheet = null; render(); } },
    async enviar(d, el) {
      if (!ui.g.cart.length) return;
      el.disabled = true;
      const a = ui.g.alvo;
      const itens = ui.g.cart.map((x) => ({ mid: x.mid, qtd: x.qtd, sem: x.sem, obs: x.obs, sab: x.sab }));
      const c0 = contaDoAlvo();
      const dados = c0 ? { conta: c0.id, itens } : a.mesa === 'B' ? { mesa: 'B', nome: a.nome, itens } : { mesa: a.mesa, itens };
      const temCoz = ui.g.cart.some((x) => { const m = S.menu.find((y) => y.id === x.mid); return m && m.cozinha; });
      const r = await fazer('lancar', dados);
      if (!r) { el.disabled = false; return; }
      const c = c0 || (a.mesa === 'B' ? contaPorId(r.id + 'c') : L.contaDaMesa(S, a.mesa));
      ui.g.cart = []; ui.g.sheet = null;
      if (c) ui.g.alvo = { conta: c.id };
      ui.g.vista = tela === 'caixa' ? 'mesas' : 'conta';
      toast(temCoz ? 'Pedido enviado para a cozinha.' : 'Itens lançados na conta.', 'ok');
      if (ui.voltarCaixa) { ui.voltarCaixa = false; if (c) ui.cx.sel = c.id; ir('caixa'); return; }
      window.scrollTo(0, 0); render();
    },
    pedirCancel(d) { ui.g.conf = d.i; ui.cx.conf = d.i; render(); },
    naoCancel() { ui.g.conf = null; ui.cx.conf = null; render(); },
    async cancelarItem(d) { ui.g.conf = null; ui.cx.conf = null; if (await fazer('cancelarItem', { conta: d.c, item: d.i })) toast('Item cancelado.'); },
    async juntar(d) { const c = contaDoAlvo(); ui.g.sheet = null; if (c && await fazer('juntar', { conta: c.id, mesa: d.m })) toast('Mesas juntas.', 'ok'); },
    async trocar(d) { const c = contaDoAlvo(); ui.g.sheet = null; if (c && await fazer('trocar', { conta: c.id, mesa: d.m })) toast(`Conta movida para a mesa ${d.m}.`, 'ok'); },
    async separar(d) { const c = contaDoAlvo(); if (c && await fazer('separar', { conta: c.id, mesa: d.m })) toast(`Mesa ${d.m} separada.`); },
    async statusPed(d) { await fazer('status', { pedido: d.p, status: d.s }); },
    imprimirPed(d) { const p = S.pedidos.find((x) => x.id === d.p); if (p) imprimir(ticketCozinha(p)); },
    som() { ui.som = !ui.som; if (ui.som) bip(1); render(); },
    fecharPrevia(d, el, e) { if (e.target === el || el.tagName === 'BUTTON') { ui.previa = null; render(); } },
    // caixa
    aba(d) { ui.cx.tab = d.t; ui.cx.edit = null; render(); },
    confFechar(d) { ui.cx.confFechar = d.v === '1'; render(); },
    async fecharCaixa() { ui.cx.confFechar = false; if (await fazer('fecharCaixa', {})) { ui.cx.sel = null; ui.cx.tab = 'relatorio'; toast('Caixa fechado. O resumo está em “Caixas anteriores”.', 'ok'); render(); } },
    cxMesa(d) { const c = L.contaDaMesa(S, d.m); if (!c) { toast(`Mesa ${d.m} está livre.`); return; } ui.cx.sel = c.id; ui.cx.conf = null; render(); },
    cxSel(d) { ui.cx.sel = d.c || null; ui.cx.conf = null; render(); },
    forma(d) { ui.cx.forma = d.f; render(); },
    usarDiv(d) {
      const n = Math.max(1, parseInt(($('#dv-' + d.k) || {}).value, 10) || 1);
      const v = $('#pg-valor-' + d.k);
      if (v) { v.value = fmt(Math.ceil((Number(d.r) / n) * 100) / 100); v.focus(); }
      atualizarTroco();
    },
    pedirRemPag(d) { ui.cx.conf = 'pag-' + d.p; render(); },
    async removerPag(d) { ui.cx.conf = null; await fazer('removerPag', { conta: d.c, pag: d.p }); },
    async liberar(d) { if (await fazer('liberar', { conta: d.c })) { toast('Mesa liberada.'); ui.cx.sel = null; render(); } },
    imprimirConta(d) { const c = contaPorId(d.c); if (c) imprimir(ticketConta(c)); },
    cxLancar(d) { ui.g.alvo = { conta: d.c }; ui.g.cart = []; ui.g.vista = 'menu'; ui.voltarCaixa = true; ir('garcom'); },
    cxBalcao() { ui.voltarCaixa = true; A.novoBalcao(); },
    editMenu(d) { ui.cx.edit = d.m || null; ui.cx.conf = null; render(); if (d.m) window.scrollTo({ top: 0, behavior: 'smooth' }); },
    pedirRemMenu(d) { ui.cx.conf = 'menu-' + d.m; render(); },
    async removerMenu(d) { if (await fazer('menuRemover', { mid: d.m })) { ui.cx.edit = null; toast('Item removido.'); render(); } },
    async ativoMenu(d) { const m = S.menu.find((x) => x.id === d.m); if (m) await fazer('menuSalvar', { item: Object.assign({}, m, { ativo: !m.ativo }) }); },
    async remEquipe(d) { await fazer('equipeSalvar', { equipe: S.equipe.filter((n) => n !== d.n) }); },
    imprimirCartoes() { imprimirCartoes(); },
    async copiar(d, el) {
      try { await navigator.clipboard.writeText(d.v); toast('Link copiado.'); }
      catch (e) { const r = document.createRange(); r.selectNodeContents(el.previousElementSibling); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Selecionei o link. Copie com Ctrl+C.'); }
    }
  };
  function addCart(m, qtd, sem, obs, sab = '') {
    const igual = !sem.length && !obs && ui.g.cart.find((x) => x.mid === m.id && x.sab === sab && !x.sem.length && !x.obs);
    if (igual) igual.qtd += qtd;
    else ui.g.cart.push({ k: L.rnd(6), mid: m.id, nome: sab ? `${m.nome} – ${sab}` : m.nome, sab, preco: m.preco, qtd, sem, obs });
  }

  const FORMS = {
    async 'f-pin'() {
      const pin = $('#lg-pin').value.trim();
      try { const s = await API.estado(null, pin); API._pin = pin; ui.loginErro = ''; S = s; render(); }
      catch (e) { ui.loginErro = e.code === 401 ? 'Senha incorreta. Confira com o Jean.' : 'Sem conexão. Confira a internet.'; render(); }
    },
    async 'f-balcao'() {
      const nome = ($('#balcao-nome').value || '').trim();
      ui.g.sheet = null;
      ui.g.alvo = { mesa: 'B', nome };
      ui.g.cart = []; ui.g.vista = 'menu';
      if (tela !== 'garcom') { ir('garcom'); return; }
      window.scrollTo(0, 0); render();
    },
    async 'f-abrir'() { if (await fazer('abrirCaixa', { fundo: num($('#fundo').value) })) toast('Caixa aberto.', 'ok'); },
    async 'f-pagar'(form) {
      const c = contaPorId(form.dataset.c);
      if (!c) return;
      const key = c.id + '-' + c.pags.length;
      const valor = num(($('#pg-valor-' + key) || {}).value);
      const rec = $('#pg-receb-' + key);
      const troco = rec && rec.value ? num(rec.value) - valor : null;
      const r = await fazer('pagar', { conta: c.id, valor, forma: ui.cx.forma });
      if (!r) return;
      const depois = contaPorId(c.id);
      if (troco != null && troco > 0) toast(`Troco: ${brl(troco)}`, 'ok');
      if (depois && !depois.aberta) { toast(`${L.rotulo(depois)} paga e liberada.`, 'ok'); }
      else toast(`Pagamento de ${brl(valor)} registrado.`);
    },
    async 'f-menu'(form) {
      const k = form.dataset.id || 'novo';
      const item = {
        id: form.dataset.id || undefined,
        nome: $('#me-nome-' + k).value, cat: $('#me-cat-' + k).value, preco: num($('#me-preco-' + k).value),
        ing: $('#me-ing-' + k).value.split(','), sab: $('#me-sab-' + k).value.split(','), cozinha: $('#me-coz-' + k).checked, ativo: $('#me-atv-' + k).checked
      };
      if (await fazer('menuSalvar', { item })) { ui.cx.edit = null; toast('Cardápio salvo.', 'ok'); render(); }
    },
    async 'f-cfg'() {
      if (await fazer('cfgSalvar', { cfg: { nome: $('#aj-nome').value, mesas: $('#aj-mesas').value, impressora: $('#aj-imp').value } })) toast('Ajustes salvos.', 'ok');
    },
    async 'f-equipe'() {
      const n = $('#aj-novo').value.trim();
      if (!n) return;
      if (await fazer('equipeSalvar', { equipe: S.equipe.concat(n) })) { $('#aj-novo').value = ''; toast(`${n} entrou na equipe.`, 'ok'); }
    }
  };

  async function carregarLogo(file) {
    try {
      const url = URL.createObjectURL(file);
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const max = 480;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      if (API.modo === 'demo') {
        if (await fazer('cfgSalvar', { cfg: { logoData: cv.toDataURL('image/png') } })) toast('Logo atualizada.', 'ok');
        return;
      }
      const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
      const r = await fetch('/api/logo', { method: 'POST', headers: { 'x-pin': API.pin(), 'content-type': 'image/png' }, body: blob });
      if (!r.ok) throw new Error();
      if (await fazer('cfgSalvar', { cfg: { logoV: Date.now() } })) toast('Logo atualizada.', 'ok');
    } catch (e) { toast('Não consegui usar essa imagem. Tente um PNG ou JPG.', 'erro'); }
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const f = A[el.dataset.act];
    if (!f) return;
    if ((el.dataset.act === 'fundoFolha' || el.dataset.act === 'fecharPrevia') && el.classList.contains('veu') && e.target !== el) return;
    e.preventDefault();
    f(el.dataset, el, e);
  });
  document.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = FORMS[e.target.id];
    if (!f) return;
    const b = e.target.querySelector('button:not([type=button])');
    if (b) { if (b.disabled) return; b.disabled = true; }
    Promise.resolve(f(e.target)).finally(() => { if (b && b.isConnected) b.disabled = false; });
  });
  document.addEventListener('input', (e) => {
    const id = e.target.id || '';
    if (id.startsWith('dv-')) atualizarDivisao();
    if (id.startsWith('pg-')) atualizarTroco();
  });
  document.addEventListener('change', (e) => { if (e.target.id === 'aj-logo' && e.target.files[0]) carregarLogo(e.target.files[0]); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (ui.g.sheet || ui.previa)) { ui.g.sheet = null; ui.previa = null; render(); }
  });

  /* ---------- Atualização automática ---------- */
  let ocupado = false;
  async function poll() {
    if (ocupado || tela === 'cliente') return;
    ocupado = true;
    try {
      if (API.modo === 'demo') {
        const d = guarda.get('demo-estado-v3');
        if (d && S && d.v !== S.v) { API.demo = L.migrar(d); atualizar(API.demo); }
      } else if (API.pin()) {
        const s = await API.estado(S && S.v);
        if (ui.offline) { ui.offline = false; render(); }
        if (s) atualizar(s);
      }
    } catch (e) {
      if (e.code === 401) { API._pin = ''; sessao = null; guarda.set('sessao', null); S = null; render(); }
      else if (!ui.offline) { ui.offline = true; render(); }
    } finally { ocupado = false; }
  }
  function digitando() { const a = document.activeElement; return a && /INPUT|TEXTAREA|SELECT/.test(a.tagName); }

  async function iniciar() {
    const st = document.createElement('style');
    st.textContent = CSS_CARTAO;
    document.head.appendChild(st);
    $('#app').innerHTML = '<main class="wrap login"><p class="muted">Carregando…</p></main>';
    try { await API.iniciar(); } catch (e) { return; }
    const q = new URLSearchParams(location.search);
    const h = location.hash.replace('#', '');
    if (q.get('m')) { tela = 'cliente'; codigoMesa = q.get('m'); }
    else if (TELAS_EQUIPE[h]) tela = h;
    else if (guarda.get('tela') && TELAS_EQUIPE[guarda.get('tela')] && API.modo === 'online') tela = guarda.get('tela');
    if (tela === 'cliente') {
      ui.carregando = false;
      await carregarCliente();
      setInterval(carregarCliente, 15000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) carregarCliente(); });
      return;
    }
    if (API.modo === 'demo') {
      S = API.demo;
      if (!sessao) { sessao = { nome: 'Jean', pin: '' }; guarda.set('sessao', sessao); }
    } else if (API.pin()) {
      try { S = await API.estado(); } catch (e) { if (e.code === 401) { sessao = null; guarda.set('sessao', null); } else ui.offline = true; }
    }
    ui.carregando = false;
    render();
    if (tela === 'cozinha') manterTelaLigada();
    setInterval(poll, API.modo === 'demo' ? 1500 : 3000);
    setInterval(() => { if (!digitando() && !ui.g.sheet && (tela === 'cozinha' || tela === 'garcom')) render(); }, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { poll(); if (tela === 'cozinha') manterTelaLigada(); } });
  }
  iniciar();
})();
