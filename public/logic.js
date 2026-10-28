/* Regras do sistema (usado no navegador e no servidor do Netlify) */
(function (root) {
  'use strict';

  const FORMAS = ['Débito', 'Crédito', 'Pix', 'Dinheiro'];
  const ALFA = 'abcdefghjkmnpqrstuvwxyz23456789';

  function rnd(n = 8) {
    let s = '';
    for (let i = 0; i < n; i++) s += ALFA[Math.floor(Math.random() * ALFA.length)];
    return s;
  }
  const r2 = (x) => Math.round(x * 100) / 100;

  function seed() {
    const s = {
      v: 1,
      cfg: { nome: "Esquina's Lanches", mesas: 16, impressora: 80, logoV: 0, logoData: '' },
      equipe: ['Jean', 'Eliane', 'Alauri'],
      codes: {},
      menu: montarCardapio(),
      contas: [],
      pedidos: [],
      turno: null,
      turnos: [],
      log: [],
      feitos: []
    };
    garantirCodigos(s);
    return s;
  }


  // Cardápio da Esquina's (preços em zero até o Jean passar os valores novos)
  function montarCardapio() {
    const base = ['Maionese', 'Alface', 'Tomate', 'Milho', 'Ervilha', 'Queijo', 'Ovo'];
    const PASTEL = ['Carne', 'Frango', 'Calabresa', 'Queijo', 'Estrogonofe'];
    const CAPETA = ['Abacaxi', 'Morango', 'Chocolate'];
    const it = (id, nome, cat, cozinha, ing = [], sab = []) => ({ id, nome, cat, preco: 0, cozinha, ativo: true, ing, sab });
    return [
      it('pastel', 'Pastel', 'Pastéis', true, [], PASTEL),
      it('combo1', 'Combo 1: Pastel + Refri 220 ml', 'Pastéis', true, [], PASTEL),
      it('combo2', 'Combo 2: Pastel + Suco 220 ml', 'Pastéis', true, [], PASTEL),
      it('xis-carne', 'Xis Carne', 'Xis', true, base),
      it('xis-frango', 'Xis Frango', 'Xis', true, base),
      it('xis-calabresa', 'Xis Calabresa', 'Xis', true, base),
      it('xis-coracao', 'Xis Coração', 'Xis', true, base),
      it('xis-bacon', 'Xis Bacon', 'Xis', true, base),
      it('xis-esquinas', "Xis Esquina's", 'Xis', true, ['Carne', 'Frango', 'Calabresa', 'Coração', 'Bacon'].concat(base)),
      it('dog', 'Cachorro-quente', 'Xis', true, ['Molho', 'Milho', 'Ervilha', 'Batata palha', 'Maionese', 'Ketchup', 'Mostarda']),
      it('torrada', 'Torrada', 'Xis', true, ['Presunto', 'Queijo', 'Tomate']),
      it('batata-m', 'Batata frita média', 'Porções', true),
      it('batata-g', 'Batata frita grande', 'Porções', true),
      it('picadao-m', 'Picadão médio', 'Porções', true),
      it('picadao-g', 'Picadão grande', 'Porções', true),
      it('porcao-peixe', 'Porção de peixe', 'Porções', true),
      it('risoles', 'Risoles', 'Porções', true),
      it('ala-carne', 'Ala-minuta de carne', 'Ala-minuta', true, ['Arroz', 'Feijão', 'Ovo', 'Salada', 'Batata frita']),
      it('ala-frango', 'Ala-minuta de frango', 'Ala-minuta', true, ['Arroz', 'Feijão', 'Ovo', 'Salada', 'Batata frita']),
      it('ala-peixe', 'Ala-minuta de peixe', 'Ala-minuta', true, ['Arroz', 'Feijão', 'Ovo', 'Salada', 'Batata frita']),
      it('ala-chuleta', 'Ala-minuta de chuleta', 'Ala-minuta', true, ['Arroz', 'Feijão', 'Ovo', 'Salada', 'Batata frita']),
      it('refri-2l', 'Refri 2 litros', 'Bebidas', false),
      it('refri-lata', 'Refri lata', 'Bebidas', false),
      it('suco', 'Suco', 'Bebidas', false),
      it('agua', 'Água', 'Bebidas', false),
      it('cafe', 'Café', 'Bebidas', false),
      it('schin-1l', 'Schin 1 litro', 'Cervejas', false),
      it('skol-1l', 'Skol 1 litro', 'Cervejas', false),
      it('polar-1l', 'Polar 1 litro', 'Cervejas', false),
      it('schin-lata', 'Schin lata', 'Cervejas', false),
      it('skol-lata', 'Skol lata', 'Cervejas', false),
      it('polar-lata', 'Polar lata', 'Cervejas', false),
      it('chopp-taca', 'Chopp em taça', 'Chopp', false),
      it('chopp-torre', 'Torre de chopp', 'Chopp', false),
      it('capeta-m', 'Capeta médio', 'Capeta', false, [], CAPETA),
      it('capeta-g', 'Capeta grande', 'Capeta', false, [], CAPETA),
      it('halls-m', 'Drink Halls médio', 'Capeta', false),
      it('halls-g', 'Drink Halls grande', 'Capeta', false)
    ];
  }

  function garantirCodigos(s) {
    s.codes = s.codes || {};
    for (let i = 1; i <= s.cfg.mesas; i++) if (!s.codes[i]) s.codes[i] = rnd(8);
  }

  function migrar(s) {
    s.contas = s.contas || [];
    s.pedidos = s.pedidos || [];
    s.turnos = s.turnos || [];
    s.log = s.log || [];
    s.feitos = s.feitos || [];
    s.equipe = s.equipe || [];
    s.menu = (s.menu || []).map((m) => Object.assign({ sab: [], ing: [] }, m));
    garantirCodigos(s);
    return s;
  }

  const vivos = (c) => c.itens.filter((i) => !i.canc);
  const total = (c) => r2(vivos(c).reduce((a, i) => a + i.preco * i.qtd, 0));
  const pago = (c) => r2(c.pags.reduce((a, p) => a + p.valor, 0));
  const restante = (c) => Math.max(0, r2(total(c) - pago(c)));
  const ehBalcao = (c) => c.mesas[0] === 'B';
  const rotulo = (c) => ehBalcao(c)
    ? 'Balcão' + (c.nome ? ' · ' + c.nome : '')
    : (c.mesas.length > 1 ? 'Mesas ' : 'Mesa ') + c.mesas.join(' + ');
  const contaDaMesa = (s, m) => s.contas.find((c) => c.aberta && c.mesas.includes(String(m)));
  const acharConta = (s, id) => {
    const c = s.contas.find((x) => x.id === id);
    if (!c) throw new Error('Conta não encontrada.');
    return c;
  };
  const ordenar = (ms) => ms.sort((a, b) => Number(a) - Number(b));

  function registrar(s, a, txt, tipo = 'info') {
    s.log.unshift({ t: a.t, por: a.por, txt, tipo, turno: s.turno ? s.turno.id : null });
    if (s.log.length > 500) s.log.length = 500;
  }

  const H = {
    lancar(s, a) {
      if (!Array.isArray(a.itens) || !a.itens.length) throw new Error('O pedido está vazio.');
      let c = null;
      if (a.conta) {
        c = s.contas.find((x) => x.id === a.conta && x.aberta);
        if (!c) throw new Error('Essa conta já foi fechada.');
      } else if (a.mesa !== 'B') {
        c = contaDaMesa(s, a.mesa);
      }
      if (!c) {
        const mesa = a.mesa === 'B' ? 'B' : String(a.mesa);
        if (mesa !== 'B' && !(Number(mesa) >= 1 && Number(mesa) <= s.cfg.mesas)) throw new Error('Mesa inválida.');
        c = { id: a.id + 'c', mesas: [mesa], nome: String(a.nome || '').slice(0, 40), aberta: true,
          abertaEm: a.t, abertaPor: a.por, itens: [], pags: [] };
        s.contas.push(c);
      }
      const novos = a.itens.map((it, i) => {
        const m = s.menu.find((x) => x.id === it.mid);
        if (!m) throw new Error('Um item não está mais no cardápio.');
        let sab = '';
        if (m.sab && m.sab.length) {
          sab = String(it.sab || '');
          if (!m.sab.includes(sab)) throw new Error(`Escolha o sabor do ${m.nome}.`);
        }
        return { id: a.id + '-' + i, mid: m.id, nome: sab ? `${m.nome} – ${sab}` : m.nome, sab, preco: m.preco,
          qtd: Math.max(1, Math.min(99, parseInt(it.qtd, 10) || 1)),
          sem: Array.isArray(it.sem) ? it.sem.slice(0, 20).map(String) : [],
          obs: String(it.obs || '').slice(0, 200), cozinha: !!m.cozinha,
          por: a.por, em: a.t, ped: null, canc: null };
      });
      const coz = novos.filter((i) => i.cozinha);
      if (coz.length) {
        const p = { id: a.id + 'p', conta: c.id, rotulo: rotulo(c), itens: coz.map((i) => i.id),
          status: 'novo', por: a.por, em: a.t, ts: {} };
        coz.forEach((i) => { i.ped = p.id; });
        s.pedidos.push(p);
      }
      c.itens.push(...novos);
      registrar(s, a, `${rotulo(c)}: lançou ${novos.map((i) => i.qtd + '× ' + i.nome).join(', ')}`);
    },

    status(s, a) {
      const p = s.pedidos.find((x) => x.id === a.pedido);
      if (!p) throw new Error('Pedido não encontrado.');
      if (!['novo', 'preparando', 'pronto', 'entregue'].includes(a.status)) throw new Error('Etapa inválida.');
      p.status = a.status;
      p.ts[a.status] = a.t;
    },

    cancelarItem(s, a) {
      const c = acharConta(s, a.conta);
      if (!c.aberta) throw new Error('Essa conta já foi fechada.');
      const it = c.itens.find((i) => i.id === a.item);
      if (!it || it.canc) return;
      it.canc = { por: a.por, t: a.t };
      if (it.ped) {
        const p = s.pedidos.find((x) => x.id === it.ped);
        if (p && p.itens.every((id) => { const x = c.itens.find((i) => i.id === id); return !x || x.canc; })) p.status = 'cancelado';
      }
      registrar(s, a, `${rotulo(c)}: cancelou ${it.qtd}× ${it.nome} (${brl(it.preco * it.qtd)})`, 'cancel');
    },

    pagar(s, a) {
      if (!s.turno) throw new Error('Abra o caixa antes de registrar pagamentos.');
      const c = acharConta(s, a.conta);
      if (!c.aberta) throw new Error('Essa conta já foi fechada.');
      if (!FORMAS.includes(a.forma)) throw new Error('Escolha a forma de pagamento.');
      const valor = r2(Number(a.valor));
      if (!(valor > 0)) throw new Error('Digite um valor maior que zero.');
      if (valor > restante(c) + 0.001) throw new Error(`O valor passa do que falta pagar (${brl(restante(c))}).`);
      c.pags.push({ id: a.id, valor, forma: a.forma, por: a.por, t: a.t, turno: s.turno.id });
      registrar(s, a, `${rotulo(c)}: recebeu ${brl(valor)} no ${a.forma}`);
      if (restante(c) === 0) {
        c.aberta = false;
        c.fechadaEm = a.t;
        c.fechadaPor = a.por;
        c.turno = s.turno.id;
      }
    },

    vendaRapida(s, a) {
      if (!s.turno) throw new Error('Abra o caixa antes de vender no balcão.');
      if (!FORMAS.includes(a.forma)) throw new Error('Escolha a forma de pagamento.');
      const nome = String(a.nome || '').trim() || 'Venda rápida';
      H.lancar(s, Object.assign({}, a, { mesa: 'B', conta: null, nome }));
      const c = s.contas.find((x) => x.id === a.id + 'c');
      c.rapida = true;
      const t = total(c);
      if (t > 0) H.pagar(s, Object.assign({}, a, { conta: c.id, valor: t }));
      else { c.aberta = false; c.fechadaEm = a.t; c.fechadaPor = a.por; c.turno = s.turno.id; }
    },

    removerPag(s, a) {
      const c = acharConta(s, a.conta);
      if (!c.aberta) throw new Error('Essa conta já foi fechada.');
      const p = c.pags.find((x) => x.id === a.pag);
      if (!p) return;
      c.pags = c.pags.filter((x) => x !== p);
      registrar(s, a, `${rotulo(c)}: removeu pagamento de ${brl(p.valor)} (${p.forma})`, 'cancel');
    },

    liberar(s, a) {
      const c = acharConta(s, a.conta);
      if (total(c) > 0) throw new Error('Essa conta ainda tem valor. Registre o pagamento.');
      c.aberta = false;
      c.fechadaEm = a.t;
      c.fechadaPor = a.por;
      c.turno = s.turno ? s.turno.id : null;
      registrar(s, a, `${rotulo(c)}: liberou a mesa sem consumo`);
    },

    juntar(s, a) {
      const c = acharConta(s, a.conta);
      const m = String(a.mesa);
      if (ehBalcao(c)) throw new Error('Pedidos de balcão não juntam com mesas.');
      if (c.mesas.includes(m)) return;
      const outra = contaDaMesa(s, m);
      if (outra) {
        outra.itens.forEach((i) => c.itens.push(i));
        outra.pags.forEach((p) => c.pags.push(p));
        outra.mesas.forEach((x) => { if (!c.mesas.includes(x)) c.mesas.push(x); });
        s.pedidos.forEach((p) => { if (p.conta === outra.id) p.conta = c.id; });
        s.contas = s.contas.filter((x) => x !== outra);
      } else {
        c.mesas.push(m);
      }
      ordenar(c.mesas);
      registrar(s, a, `Juntou a mesa ${m}: agora ${rotulo(c)}`);
    },

    separar(s, a) {
      const c = acharConta(s, a.conta);
      const m = String(a.mesa);
      if (c.mesas.length < 2) return;
      c.mesas = c.mesas.filter((x) => x !== m);
      registrar(s, a, `Separou a mesa ${m} de ${rotulo(c)}`);
    },

    trocar(s, a) {
      const c = acharConta(s, a.conta);
      const m = String(a.mesa);
      const ocupada = contaDaMesa(s, m);
      if (ocupada && ocupada !== c) throw new Error(`A mesa ${m} já tem conta aberta. Use "Juntar mesa".`);
      const antes = rotulo(c);
      c.mesas = [m];
      registrar(s, a, `${antes} mudou para a mesa ${m}`);
    },

    abrirCaixa(s, a) {
      if (s.turno) throw new Error('O caixa já está aberto.');
      s.turno = { id: a.id, abertoEm: a.t, abertoPor: a.por, fundo: r2(Number(a.fundo) || 0) };
      registrar(s, a, `Abriu o caixa com ${brl(s.turno.fundo)} de troco`);
    },

    fecharCaixa(s, a) {
      if (!s.turno) throw new Error('O caixa já está fechado.');
      const id = s.turno.id;
      const resumo = relatorio(s);
      s.turnos.unshift(Object.assign({}, s.turno, { fechadoEm: a.t, fechadoPor: a.por, resumo }));
      if (s.turnos.length > 120) s.turnos.length = 120;
      const fechadas = new Set(s.contas.filter((c) => !c.aberta).map((c) => c.id));
      s.contas = s.contas.filter((c) => c.aberta);
      s.pedidos = s.pedidos.filter((p) => !fechadas.has(p.conta) && !['entregue', 'cancelado'].includes(p.status));
      s.log = s.log.filter((l) => l.turno !== id && l.turno !== null);
      s.turno = null;
    },

    menuSalvar(s, a) {
      const it = a.item || {};
      const nome = String(it.nome || '').trim().slice(0, 60);
      const preco = r2(Number(it.preco));
      if (!nome) throw new Error('Dê um nome ao item.');
      if (!(preco >= 0)) throw new Error('Preço inválido.');
      const limpo = { nome, preco, cat: String(it.cat || 'Outros').trim().slice(0, 30) || 'Outros',
        cozinha: !!it.cozinha, ativo: it.ativo !== false,
        ing: (Array.isArray(it.ing) ? it.ing : []).map((x) => String(x).trim()).filter(Boolean).slice(0, 20),
        sab: (Array.isArray(it.sab) ? it.sab : []).map((x) => String(x).trim()).filter(Boolean).slice(0, 20) };
      const atual = it.id && s.menu.find((m) => m.id === it.id);
      if (atual) Object.assign(atual, limpo);
      else s.menu.push(Object.assign({ id: rnd(6) }, limpo));
    },

    menuRemover(s, a) {
      s.menu = s.menu.filter((m) => m.id !== a.mid);
    },

    cfgSalvar(s, a) {
      const c = a.cfg || {};
      if (c.nome !== undefined) s.cfg.nome = String(c.nome).trim().slice(0, 50) || 'Lanchonete';
      if (c.mesas !== undefined) {
        const n = parseInt(c.mesas, 10);
        if (!(n >= 1 && n <= 80)) throw new Error('Número de mesas entre 1 e 80.');
        s.cfg.mesas = n;
        garantirCodigos(s);
      }
      if (c.impressora !== undefined) s.cfg.impressora = Number(c.impressora) === 58 ? 58 : 80;
      if (c.logoV !== undefined) s.cfg.logoV = Number(c.logoV) || 0;
      if (c.logoData !== undefined) {
        if (String(c.logoData).length > 700000) throw new Error('A logo ficou grande demais.');
        s.cfg.logoData = String(c.logoData);
      }
    },

    equipeSalvar(s, a) {
      const lista = (a.equipe || []).map((x) => String(x).trim().slice(0, 30)).filter(Boolean);
      if (!lista.length) throw new Error('Deixe pelo menos uma pessoa na equipe.');
      s.equipe = Array.from(new Set(lista));
    }
  };

  function apply(s, a) {
    if (!a || !a.tipo || !a.id) throw new Error('Ação inválida.');
    migrar(s);
    if (s.feitos.includes(a.id)) return s;
    const f = H[a.tipo];
    if (!f) throw new Error('Ação desconhecida.');
    a.por = String(a.por || 'Equipe').slice(0, 30);
    f(s, a);
    s.feitos.unshift(a.id);
    if (s.feitos.length > 300) s.feitos.length = 300;
    s.v = (s.v || 0) + 1;
    return s;
  }

  function relatorio(s) {
    const t = s.turno;
    if (!t) return null;
    const porForma = {};
    FORMAS.forEach((f) => { porForma[f] = 0; });
    let totalRecebido = 0;
    let nPags = 0;
    const contasPagas = new Set();
    s.contas.forEach((c) => c.pags.forEach((p) => {
      if (p.turno !== t.id) return;
      porForma[p.forma] = r2((porForma[p.forma] || 0) + p.valor);
      totalRecebido = r2(totalRecebido + p.valor);
      nPags++;
      if (!c.aberta) contasPagas.add(c.id);
    }));
    const itens = {};
    s.contas.forEach((c) => vivos(c).forEach((i) => {
      if (i.em < t.abertoEm) return;
      const k = itens[i.nome] || (itens[i.nome] = { nome: i.nome, qtd: 0, valor: 0 });
      k.qtd += i.qtd;
      k.valor = r2(k.valor + i.qtd * i.preco);
    }));
    const abertas = s.contas.filter((c) => c.aberta);
    return {
      total: totalRecebido, porForma, nPags,
      nContas: contasPagas.size,
      ticket: contasPagas.size ? r2(totalRecebido / contasPagas.size) : 0,
      fundo: t.fundo,
      gaveta: r2(t.fundo + (porForma['Dinheiro'] || 0)),
      itens: Object.values(itens).sort((a, b) => b.qtd - a.qtd || b.valor - a.valor),
      cancelamentos: s.log.filter((l) => l.turno === t.id && l.tipo === 'cancel'),
      abertas: abertas.length,
      emAberto: r2(abertas.reduce((a, c) => a + restante(c), 0))
    };
  }

  function publicoMesa(s, code, comLogoData) {
    const n = Object.keys(s.codes).find((k) => s.codes[k] === code && Number(k) <= s.cfg.mesas);
    if (!n) return null;
    const c = contaDaMesa(s, n);
    return {
      cfg: { nome: s.cfg.nome, logoV: s.cfg.logoV, logoData: comLogoData ? s.cfg.logoData : '' },
      mesa: n,
      mesas: c ? c.mesas : [n],
      menu: s.menu.filter((m) => m.ativo).map((m) => ({ nome: m.nome, cat: m.cat, preco: m.preco, ing: m.ing, sab: m.sab || [] })),
      conta: c ? {
        itens: vivos(c).map((i) => ({ nome: i.nome, qtd: i.qtd, preco: i.preco, sem: i.sem, obs: i.obs })),
        total: total(c), pago: pago(c), restante: restante(c)
      } : null,
      t: Date.now()
    };
  }

  function brl(n) {
    return 'R$ ' + (Number(n) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  root.Logic = { FORMAS, rnd, seed, migrar, apply, relatorio, publicoMesa, vivos, total, pago, restante,
    rotulo, contaDaMesa, ehBalcao, brl, garantirCodigos };
})(typeof window !== 'undefined' ? window : globalThis);
