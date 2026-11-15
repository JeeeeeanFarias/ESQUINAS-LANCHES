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
      menuV: CARDAPIO_V,
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


  // Cardápio da Esquina's. Os preços começam em zero: o caixa preenche na aba Cardápio.
  function montarCardapio() {
    const base = INGREDIENTES.xis;
    const PASTEL = ['Carne', 'Frango', 'Calabresa', 'Queijo', 'Estrogonofe'];
    const CAPETA = ['Abacaxi', 'Morango', 'Chocolate'];
    const ADICIONAL = ['Bife', 'Frango', 'Peixe', 'Chuleta'];
    const it = (id, nome, cat, cozinha, ing = [], sab = []) => ({ id, nome, cat, preco: 0, cozinha, ativo: true, ing: ing.slice(), sab: sab.slice() });
    return [
      it('pastel', 'Pastel', 'Pastéis', true, [], PASTEL),
      it('combo1', 'Combo 1: Pastel + Refri 220 ml', 'Pastéis', true, [], PASTEL),
      it('combo2', 'Combo 2: Pastel + Café', 'Pastéis', true, [], PASTEL),
      it('risoles', 'Risoles', 'Pastéis', true),
      it('xis-carne', 'Xis Carne', 'Xis', true, base),
      it('xis-frango', 'Xis Frango', 'Xis', true, base),
      it('xis-calabresa', 'Xis Calabresa', 'Xis', true, base),
      it('xis-coracao', 'Xis Coração', 'Xis', true, base),
      it('xis-bacon', 'Xis Bacon', 'Xis', true, base),
      it('xis-esquinas', "Xis Esquina's", 'Xis', true, INGREDIENTES.esquinas),
      it('dog', 'Cachorro-quente', 'Xis', true, INGREDIENTES.dog),
      it('torrada', 'Torrada', 'Xis', true, INGREDIENTES.torrada),
      it('torrada-ovo', 'Torrada com ovo', 'Xis', true, INGREDIENTES.torradaOvo),
      it('batata-m', 'Batata frita média', 'Porções', true),
      it('batata-g', 'Batata frita grande', 'Porções', true),
      it('picadao-m', 'Picadão médio', 'Porções', true),
      it('picadao-g', 'Picadão grande', 'Porções', true),
      it('porcao-peixe', 'Porção de peixe', 'Porções', true),
      it('ala-carne', 'Ala-minuta de bife', 'Ala-minuta', true, ['Arroz', 'Feijão', 'Ovo', 'Salada', 'Batata frita']),
      it('ala-frango', 'Ala-minuta de frango', 'Ala-minuta', true, ['Arroz', 'Feijão', 'Ovo', 'Salada', 'Batata frita']),
      it('ala-peixe', 'Ala-minuta de peixe', 'Ala-minuta', true, ['Arroz', 'Feijão', 'Ovo', 'Salada', 'Batata frita']),
      it('ala-chuleta', 'Ala-minuta de chuleta', 'Ala-minuta', true, ['Arroz', 'Feijão', 'Ovo', 'Salada', 'Batata frita']),
      it('adic-ovo', 'Adicional de ovo', 'Adicionais', true),
      it('adic-carne', 'Adicional', 'Adicionais', true, [], ADICIONAL),
      it('refri-2l', 'Refri 2 litros', 'Bebidas', false),
      it('charrua-2l', 'Guaraná Charrua 2 litros', 'Bebidas', false),
      it('refri-lata', 'Refri lata', 'Bebidas', false),
      it('suco', 'Suco', 'Bebidas', false),
      it('agua', 'Água', 'Bebidas', false),
      it('cafe', 'Café', 'Bebidas', false),
      it('baly', 'Baly', 'Energéticos', false),
      it('monster', 'Monster', 'Energéticos', false),
      it('schin-1l', 'Schin 1 litro', 'Cervejas', false),
      it('polar-1l', 'Polar 1 litro', 'Cervejas', false),
      it('bud-1l', 'Budweiser 1 litro', 'Cervejas', false),
      it('original-latao', 'Original latão', 'Latão', false),
      it('heineken-latao', 'Heineken latão', 'Latão', false),
      it('bud-latao', 'Budweiser latão', 'Latão', false),
      it('polar-latao', 'Polar latão', 'Latão', false),
      it('brahma-latao', 'Brahma latão', 'Latão', false),
      it('schin-latao', 'Schin latão', 'Latão', false),
      it('amstel-latao', 'Amstel latão', 'Latão', false),
      it('heineken-ln', 'Heineken long neck', 'Long neck', false),
      it('bud-ln', 'Budweiser long neck', 'Long neck', false),
      it('skol-beats', 'Skol Beats', 'Long neck', false),
      it('ice', 'Ice', 'Long neck', false),
      it('keep-cooler', 'Keep Cooler', 'Long neck', false),
      it('chopp-taca', 'Chopp em taça', 'Chopp', false),
      it('chopp-torre', 'Torre de chopp', 'Chopp', false),
      it('capeta-m', 'Capeta médio', 'Capeta', false, [], CAPETA),
      it('capeta-g', 'Capeta grande', 'Capeta', false, [], CAPETA)
    ].map((m) => Object.assign(m, { preco: PRECOS_BEBIDAS[m.id] || PRECOS_COMIDAS[m.id] || 0 }));
  }

  // Versão do cardápio de fábrica. Ao subir, atualizarCardapio() ajusta o cardápio já em uso
  // sem apagar preços nem itens que o caixa cadastrou.
  const CARDAPIO_V = 9;

  // O que vai em cada lanche (vira os botões de "tirar ingrediente"). O pão não entra, porque não se tira.
  const INGREDIENTES = (() => {
    const xis = ['Maionese', 'Alface', 'Tomate', 'Milho', 'Ervilha', 'Ovo', 'Queijo'];
    return {
      xis,
      esquinas: ['Carne', 'Frango', 'Calabresa', 'Coração', 'Bacon'].concat(xis),
      dog: ['Molho', 'Maionese', 'Milho', 'Ervilha', 'Batata palha', 'Salsicha'],
      torrada: ['Presunto', 'Queijo'],
      torradaOvo: ['Presunto', 'Queijo', 'Ovo', 'Alface']
    };
  })();

  // Preços das bebidas passados pelo Jean em 15/11/2026
  const PRECOS_BEBIDAS = {
    'refri-2l': 15, 'charrua-2l': 10, 'refri-lata': 6.5, suco: 7.5, agua: 5, cafe: 5.5,
    baly: 9, monster: 12.5, 'chopp-taca': 10, 'chopp-torre': 75, 'capeta-m': 20, 'capeta-g': 25,
    'schin-1l': 13, 'polar-1l': 16, 'bud-1l': 18,
    'original-latao': 10, 'heineken-latao': 9, 'bud-latao': 8, 'polar-latao': 7.5, 'brahma-latao': 7.5,
    'schin-latao': 6.5, 'amstel-latao': 6.5,
    'heineken-ln': 9, 'bud-ln': 9, 'skol-beats': 13, ice: 8, 'keep-cooler': 14.5
  };
  // Preços das comidas, da mesma data
  const PRECOS_COMIDAS = {
    pastel: 13, risoles: 13, combo1: 16.5, combo2: 16.5,
    'xis-carne': 25, 'xis-frango': 25, 'xis-calabresa': 25, 'xis-coracao': 29, 'xis-bacon': 28, 'xis-esquinas': 38,
    dog: 20, torrada: 15, 'torrada-ovo': 17,
    'batata-m': 39, 'batata-g': 49, 'picadao-m': 120, 'picadao-g': 145, 'porcao-peixe': 89,
    'ala-carne': 29.9, 'ala-frango': 29.9, 'ala-peixe': 39, 'ala-chuleta': 29.9,
    'adic-ovo': 2.5, 'adic-carne': 10
  };

  function atualizarCardapio(s) {
    const de = s.menuV || 1;
    if (de >= CARDAPIO_V) return false;
    const novo = (id, nome, cat) => ({ id, nome, cat, preco: 0, cozinha: false, ativo: true, ing: [], sab: [] });
    const acha = (id) => s.menu.find((m) => m.id === id);
    // Põe os itens depois do último item da categoria "ancora" (ou no fim), sem duplicar
    const inserir = (ancora, itens) => {
      itens = itens.filter((n) => !acha(n.id));
      if (!itens.length) return;
      let pos = -1;
      s.menu.forEach((m, i) => { if (ancora(m)) pos = i; });
      if (pos < 0) s.menu.push(...itens); else s.menu.splice(pos + 1, 0, ...itens);
    };
    if (de < 2) {
      // Novembro de 2026: risoles junto dos pastéis, ala-minuta de bife, Guaraná Charrua,
      // energéticos, cervejas só de litro, latão e long neck, sem Drink Halls
      const ris = acha('risoles');
      if (ris && ris.cat === 'Porções') {
        ris.cat = 'Pastéis';
        s.menu = s.menu.filter((m) => m !== ris);
        inserir((m) => m.cat === 'Pastéis', [ris]);
      }
      const ala = acha('ala-carne');
      if (ala && ala.nome === 'Ala-minuta de carne') ala.nome = 'Ala-minuta de bife';
      const fora = ['skol-1l', 'schin-lata', 'skol-lata', 'polar-lata', 'halls-m', 'halls-g'];
      s.menu = s.menu.filter((m) => !fora.includes(m.id));
      inserir((m) => m.id === 'refri-2l', [novo('charrua-2l', 'Guaraná Charrua 2 litros', 'Bebidas')]);
      inserir((m) => m.cat === 'Bebidas', [novo('baly', 'Baly', 'Energéticos'), novo('monster', 'Monster', 'Energéticos')]);
      inserir((m) => m.cat === 'Cervejas', [novo('bud-1l', 'Budweiser 1 litro', 'Cervejas')]);
      inserir((m) => m.cat === 'Cervejas', [
        novo('original-latao', 'Original latão', 'Latão'), novo('heineken-latao', 'Heineken latão', 'Latão'),
        novo('bud-latao', 'Budweiser latão', 'Latão'), novo('polar-latao', 'Polar latão', 'Latão'),
        novo('brahma-latao', 'Brahma latão', 'Latão'), novo('schin-latao', 'Schin latão', 'Latão'),
        novo('amstel-latao', 'Amstel latão', 'Latão')]);
      inserir((m) => m.cat === 'Latão', [
        novo('heineken-ln', 'Heineken long neck', 'Long neck'), novo('bud-ln', 'Budweiser long neck', 'Long neck'),
        novo('skol-beats', 'Skol Beats', 'Long neck'), novo('ice', 'Ice', 'Long neck')]);
    }
    if (de < 3) {
      // Keep Cooler e os preços das bebidas
      inserir((m) => m.cat === 'Long neck', [novo('keep-cooler', 'Keep Cooler', 'Long neck')]);
      s.menu.forEach((m) => { if (PRECOS_BEBIDAS[m.id]) m.preco = PRECOS_BEBIDAS[m.id]; });
    }
    if (de < 4) {
      // Torrada com ovo e os preços das comidas
      const tor = acha('torrada');
      inserir((m) => m.id === 'torrada', [Object.assign(novo('torrada-ovo', 'Torrada com ovo', tor ? tor.cat : 'Xis'),
        { cozinha: true, ing: ['Presunto', 'Queijo', 'Tomate', 'Ovo'] })]);
      s.menu.forEach((m) => { if (PRECOS_COMIDAS[m.id]) m.preco = PRECOS_COMIDAS[m.id]; });
    }
    if (de < 5) {
      // Adicionais: ovo e bife, frango, peixe ou chuleta
      inserir((m) => m.cat === 'Ala-minuta', [
        Object.assign(novo('adic-ovo', 'Adicional de ovo', 'Adicionais'), { cozinha: true, preco: 2.5 }),
        Object.assign(novo('adic-carne', 'Adicional', 'Adicionais'), { cozinha: true, preco: 10, sab: ['Bife', 'Frango', 'Peixe', 'Chuleta'] })]);
    }
    if (de < 6) {
      // O site no ar ainda tinha o cardápio de exemplo do primeiro dia (X-Salada, X-Bacon, X-Tudo…).
      // Nesse caso troca pelo cardápio de verdade, guardando só os itens que o caixa cadastrou.
      const EXEMPLO = ['xsalada', 'xbacon', 'xtudo', 'batata', 'cerveja-lata', 'cerveja-600', 'peixe', 'fritas', 'alaminuta', 'chopp', 'gelo'];
      if (s.menu.some((m) => EXEMPLO.includes(m.id))) {
        const fabrica = montarCardapio();
        const ids = new Set(fabrica.map((m) => m.id));
        const antigos = new Map(s.menu.map((m) => [m.id, m]));
        const doCaixa = s.menu.filter((m) => !ids.has(m.id) && !EXEMPLO.includes(m.id) && /^[a-z0-9]{6}$/.test(m.id) && !/[-]/.test(m.id) && !['pastel', 'combo1', 'combo2'].includes(m.id));
        fabrica.forEach((m) => {
          const a = antigos.get(m.id);
          if (a && !m.preco && a.preco > 0 && /^combo/.test(m.id)) m.preco = a.preco;
        });
        s.menu = fabrica.concat(doCaixa);
      }
    }
    if (de < 7) {
      // Xis carne, frango e calabresa passam a R$ 25
      ['xis-carne', 'xis-frango', 'xis-calabresa'].forEach((id) => { const m = acha(id); if (m) m.preco = 25; });
    }
    if (de < 8) {
      // Ingredientes dos lanches conforme o Jean passou
      const por = { 'xis-carne': 'xis', 'xis-frango': 'xis', 'xis-calabresa': 'xis', 'xis-coracao': 'xis', 'xis-bacon': 'xis',
        'xis-esquinas': 'esquinas', dog: 'dog', torrada: 'torrada', 'torrada-ovo': 'torradaOvo' };
      Object.keys(por).forEach((id) => { const m = acha(id); if (m) m.ing = INGREDIENTES[por[id]].slice(); });
    }
    if (de < 9) {
      // Combos a R$ 16,50; o combo 2 passa a ser pastel com café
      const c1 = acha('combo1'); if (c1) c1.preco = 16.5;
      const c2 = acha('combo2'); if (c2) { c2.preco = 16.5; c2.nome = 'Combo 2: Pastel + Café'; }
    }
    s.menuV = CARDAPIO_V;
    s.v = (s.v || 0) + 1;
    return true;
  }

  function garantirCodigos(s) {
    s.codes = s.codes || {};
    for (let i = 1; i <= s.cfg.mesas; i++) if (!s.codes[i]) s.codes[i] = rnd(8);
  }

  function migrar(s) {
    s.cfg = Object.assign({ nome: "Esquina's Lanches", mesas: 16, impressora: 80, logoV: 0, logoData: '' }, s.cfg || {});
    s.contas = s.contas || [];
    s.pedidos = s.pedidos || [];
    s.turnos = s.turnos || [];
    s.feitos = s.feitos || [];
    s.equipe = s.equipe || [];
    s.turno = s.turno || null;
    // O registro guarda só cancelamentos e correções (é o que aparece no relatório)
    s.log = (s.log || []).filter((l) => l.tipo === 'cancel').slice(0, 300);
    s.menu = (s.menu || []).map((m) => Object.assign({ sab: [], ing: [] }, m));
    atualizarCardapio(s);
    const tid = s.turno ? s.turno.id : null;
    s.contas.forEach((c) => {
      c.itens = c.itens || [];
      c.pags = c.pags || [];
      c.itens.forEach((i) => { if (i.turno === undefined) i.turno = tid; });
    });
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
    if (!c) throw new Error('Conta não encontrada. Ela pode já ter sido fechada.');
    return c;
  };
  const contaAberta = (s, id) => {
    const c = acharConta(s, id);
    if (!c.aberta) throw new Error('Essa conta já foi fechada.');
    return c;
  };
  const mesaValida = (s, m) => /^\d+$/.test(String(m)) && Number(m) >= 1 && Number(m) <= s.cfg.mesas;
  const ordenar = (ms) => ms.sort((a, b) => Number(a) - Number(b));

  function anotar(s, a, txt) {
    s.log.unshift({ t: a.t, por: a.por, txt, tipo: 'cancel', turno: s.turno ? s.turno.id : null });
    if (s.log.length > 300) s.log.length = 300;
  }
  function fechar(s, c, a) {
    c.aberta = false;
    c.fechadaEm = a.t;
    c.fechadaPor = a.por;
    c.turno = s.turno ? s.turno.id : null;
  }

  const H = {
    lancar(s, a) {
      if (!Array.isArray(a.itens) || !a.itens.length) throw new Error('O pedido está vazio.');
      if (a.itens.length > 60) throw new Error('Pedido grande demais. Envie em duas partes.');
      let c = null;
      if (a.conta) {
        c = contaAberta(s, a.conta);
      } else if (a.mesa !== 'B') {
        if (!mesaValida(s, a.mesa)) throw new Error('Mesa inválida.');
        c = contaDaMesa(s, a.mesa);
      }
      if (!c) {
        const mesa = a.mesa === 'B' ? 'B' : String(a.mesa);
        c = { id: a.id + 'c', mesas: [mesa], nome: String(a.nome || '').trim().slice(0, 40), aberta: true,
          abertaEm: a.t, abertaPor: a.por, itens: [], pags: [] };
        s.contas.push(c);
      }
      const tid = s.turno ? s.turno.id : null;
      const novos = a.itens.map((it, i) => {
        const m = s.menu.find((x) => x.id === it.mid);
        if (!m) throw new Error('Um item do pedido não está mais no cardápio. Monte o pedido de novo.');
        if (!m.ativo) throw new Error(`${m.nome} está em falta. Tire do pedido e envie de novo.`);
        let sab = '';
        if (m.sab && m.sab.length) {
          sab = String(it.sab || '');
          if (!m.sab.includes(sab)) throw new Error(`Escolha o sabor do ${m.nome}.`);
        }
        return { id: a.id + '-' + i, mid: m.id, nome: sab ? `${m.nome} – ${sab}` : m.nome, sab, preco: m.preco,
          qtd: Math.max(1, Math.min(99, parseInt(it.qtd, 10) || 1)),
          sem: Array.isArray(it.sem) ? it.sem.slice(0, 20).map((x) => String(x).slice(0, 40)) : [],
          obs: String(it.obs || '').trim().slice(0, 200), cozinha: !!m.cozinha,
          por: a.por, em: a.t, turno: tid, ped: null, canc: null };
      });
      const coz = novos.filter((i) => i.cozinha);
      if (coz.length) {
        const p = { id: a.id + 'p', conta: c.id, rotulo: rotulo(c), itens: coz.map((i) => i.id),
          status: 'novo', por: a.por, em: a.t, ts: {} };
        coz.forEach((i) => { i.ped = p.id; });
        s.pedidos.push(p);
      }
      c.itens.push(...novos);
    },

    status(s, a) {
      const p = s.pedidos.find((x) => x.id === a.pedido);
      if (!p) throw new Error('Esse pedido não está mais na lista.');
      if (!['novo', 'preparando', 'pronto', 'entregue'].includes(a.status)) throw new Error('Etapa inválida.');
      if (p.status === 'cancelado' || p.status === a.status) return;
      p.status = a.status;
      p.ts[a.status] = a.t;
    },

    cancelarItem(s, a) {
      const c = contaAberta(s, a.conta);
      const it = c.itens.find((i) => i.id === a.item);
      if (!it || it.canc) return;
      const novoTotal = r2(total(c) - it.preco * it.qtd);
      if (pago(c) > novoTotal + 0.001) {
        throw new Error(`Essa conta já recebeu ${brl(pago(c))}. Remova um pagamento antes de cancelar este item.`);
      }
      it.canc = { por: a.por, t: a.t };
      if (it.ped) {
        const p = s.pedidos.find((x) => x.id === it.ped);
        if (p && p.itens.every((id) => { const x = c.itens.find((i) => i.id === id); return !x || x.canc; })) p.status = 'cancelado';
      }
      anotar(s, a, `${rotulo(c)}: cancelou ${it.qtd}× ${it.nome} (${brl(it.preco * it.qtd)})`);
      // Sem nada a cobrar, a mesa fica livre de novo
      if (!vivos(c).length && !c.pags.length) fechar(s, c, a);
      else if (c.pags.length && restante(c) === 0 && total(c) > 0) fechar(s, c, a);
    },

    pagar(s, a) {
      if (!s.turno) throw new Error('Abra o caixa antes de registrar pagamentos.');
      const c = contaAberta(s, a.conta);
      if (!FORMAS.includes(a.forma)) throw new Error('Escolha a forma de pagamento.');
      const valor = r2(Number(a.valor));
      if (!(valor > 0)) throw new Error('Digite um valor maior que zero.');
      if (valor > restante(c) + 0.001) throw new Error(`O valor passa do que falta pagar (${brl(restante(c))}).`);
      c.pags.push({ id: a.id, valor, forma: a.forma, por: a.por, t: a.t, turno: s.turno.id });
      if (restante(c) === 0) fechar(s, c, a);
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
      else fechar(s, c, a);
    },

    removerPag(s, a) {
      const c = contaAberta(s, a.conta);
      const p = c.pags.find((x) => x.id === a.pag);
      if (!p) return;
      c.pags = c.pags.filter((x) => x !== p);
      anotar(s, a, `${rotulo(c)}: removeu pagamento de ${brl(p.valor)} (${p.forma})`);
    },

    liberar(s, a) {
      const c = contaAberta(s, a.conta);
      if (total(c) > 0) throw new Error('Essa conta ainda tem valor. O pagamento é feito no caixa.');
      if (c.pags.length) throw new Error('Essa conta tem pagamento registrado. Fale com o caixa.');
      fechar(s, c, a);
    },

    juntar(s, a) {
      const c = contaAberta(s, a.conta);
      const m = String(a.mesa);
      if (ehBalcao(c)) throw new Error('Pedidos de balcão não juntam com mesas.');
      if (!mesaValida(s, m)) throw new Error('Mesa inválida.');
      if (c.mesas.includes(m)) return;
      const outra = contaDaMesa(s, m);
      if (outra) {
        outra.itens.forEach((i) => c.itens.push(i));
        outra.pags.forEach((p) => c.pags.push(p));
        outra.mesas.forEach((x) => { if (!c.mesas.includes(x)) c.mesas.push(x); });
        c.abertaEm = Math.min(c.abertaEm, outra.abertaEm);
        s.pedidos.forEach((p) => { if (p.conta === outra.id) p.conta = c.id; });
        s.contas = s.contas.filter((x) => x !== outra);
      } else {
        c.mesas.push(m);
      }
      ordenar(c.mesas);
    },

    separar(s, a) {
      const c = contaAberta(s, a.conta);
      const m = String(a.mesa);
      if (c.mesas.length < 2 || !c.mesas.includes(m)) return;
      c.mesas = c.mesas.filter((x) => x !== m);
    },

    trocar(s, a) {
      const c = contaAberta(s, a.conta);
      const m = String(a.mesa);
      if (ehBalcao(c)) throw new Error('Pedidos de balcão não mudam de mesa.');
      if (!mesaValida(s, m)) throw new Error('Mesa inválida.');
      const ocupada = contaDaMesa(s, m);
      if (ocupada && ocupada !== c) throw new Error(`A mesa ${m} já tem conta aberta. Use "Juntar mesa".`);
      c.mesas = [m];
    },

    abrirCaixa(s, a) {
      if (s.turno) throw new Error('O caixa já está aberto.');
      const fundo = r2(Number(a.fundo) || 0);
      if (fundo < 0) throw new Error('O troco inicial não pode ser negativo.');
      s.turno = { id: a.id, abertoEm: a.t, abertoPor: a.por, fundo };
      // Pedidos lançados com o caixa fechado entram neste caixa
      s.contas.forEach((c) => c.itens.forEach((i) => { if (!i.turno) i.turno = a.id; }));
    },

    fecharCaixa(s, a) {
      if (!s.turno) throw new Error('O caixa já está fechado.');
      const id = s.turno.id;
      const resumo = relatorio(s);
      s.turnos.unshift(Object.assign({}, s.turno, { fechadoEm: a.t, fechadoPor: a.por, resumo }));
      if (s.turnos.length > 200) s.turnos.length = 200;
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
      if (!(preco >= 0) || preco > 100000) throw new Error('Preço inválido.');
      const lista = (v) => Array.from(new Set((Array.isArray(v) ? v : []).map((x) => String(x).trim().slice(0, 40)).filter(Boolean))).slice(0, 20);
      const limpo = { nome, preco, cat: String(it.cat || 'Outros').trim().slice(0, 30) || 'Outros',
        cozinha: !!it.cozinha, ativo: it.ativo !== false, ing: lista(it.ing), sab: lista(it.sab) };
      const atual = it.id && s.menu.find((m) => m.id === it.id);
      if (atual) Object.assign(atual, limpo);
      else {
        if (s.menu.length >= 300) throw new Error('O cardápio chegou ao limite de 300 itens.');
        s.menu.push(Object.assign({ id: rnd(6) }, limpo));
      }
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
        const maior = Math.max(0, ...s.contas.filter((x) => x.aberta && !ehBalcao(x)).flatMap((x) => x.mesas.map(Number)));
        if (maior > n) throw new Error(`A mesa ${maior} está com conta aberta. Feche a conta antes de diminuir as mesas.`);
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
      const lista = (Array.isArray(a.equipe) ? a.equipe : []).map((x) => String(x).trim().slice(0, 30)).filter(Boolean);
      if (!lista.length) throw new Error('Deixe pelo menos uma pessoa na equipe.');
      if (lista.length > 40) throw new Error('A equipe chegou ao limite de 40 pessoas.');
      s.equipe = Array.from(new Set(lista));
    }
  };

  function apply(s, a) {
    if (!a || !a.tipo || !a.id) throw new Error('Ação inválida.');
    migrar(s);
    if (s.feitos.includes(a.id)) return s;
    if (!Object.prototype.hasOwnProperty.call(H, a.tipo)) throw new Error('Ação desconhecida.');
    a.por = String(a.por || 'Equipe').slice(0, 30);
    H[a.tipo](s, a);
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
      if (i.turno !== t.id) return;
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
      cancelamentos: (s.log || []).filter((l) => l.turno === t.id && l.tipo === 'cancel'),
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
      v: s.v,
      t: Date.now()
    };
  }

  function brl(n) {
    return 'R$ ' + (Number(n) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  const TIPOS = Object.keys(H);
  root.Logic = { CARDAPIO_V, FORMAS, TIPOS, rnd, seed, migrar, apply, relatorio, publicoMesa, vivos, total, pago, restante,
    rotulo, contaDaMesa, ehBalcao, brl, garantirCodigos };
})(typeof window !== 'undefined' ? window : globalThis);
