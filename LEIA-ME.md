# Sistema da Esquina's Lanches

Site para controlar os pedidos das mesas, a cozinha e o caixa. Funciona no celular, no tablet e no notebook.

Endereço: **https://esquinaslanches.netlify.app**

## As telas

| Endereço | Para quem | Aparelho | Senha |
|---|---|---|---|
| `/#garcom` | Garçom: vê o cardápio e anota os pedidos | Celular | da equipe |
| `/#cozinha` | Cozinha: vê os pedidos e marca o andamento | Tablet ou celular na parede | da equipe |
| `/#caixa` | Caixa: abre e fecha o caixa, recebe, cardápio, relatório | Notebook | do gerente |
| `/#cartoes` | Gera os cartões com QR Code para a gráfica | Notebook | do gerente |
| `/?m=código` | Cliente (o QR Code da mesa leva aqui) | Celular do cliente | nenhuma |

Cada aparelho lembra a última tela usada e a senha digitada.

## As duas senhas

- **Senha da equipe**: garçom e cozinha. Com ela dá para lançar pedidos, cancelar item, juntar e trocar mesas e marcar o andamento na cozinha. **Não dá** para abrir ou fechar o caixa, receber pagamento, vender no balcão, mexer no cardápio, ver o relatório nem os ajustes.
- **Senha do gerente**: caixa. Faz tudo.

As senhas de fábrica são **1234** (equipe) e **4321** (gerente). No primeiro acesso ao caixa, o sistema obriga a criar uma senha do gerente nova. Troque também a da equipe, em **Caixa → Ajustes → Senhas**.

Quando uma senha muda, os aparelhos que usavam a antiga voltam para a tela de entrada sozinhos.

**Se esquecer a senha do gerente:** no Netlify, abra **Site configuration → Environment variables** e crie a variável `REDEFINIR_SENHAS` com um texto qualquer (por exemplo, a data de hoje). Depois vá em **Deploys → Trigger deploy**. As duas senhas voltam às de fábrica **uma única vez**, sem apagar nada, e o caixa pede para criar uma senha nova. Se precisar de novo no futuro, troque o texto da variável.

## O dia a dia

1. **Abrir o caixa** no começo do expediente, com o troco inicial.
2. O garçom lança os pedidos pelo celular. Lanches e porções aparecem na cozinha; bebidas só entram na conta.
3. A cozinha marca **Preparando** e **Pronto**. O garçom recebe o aviso no celular.
4. No caixa, clique na mesa para ver a conta, dividir e registrar o pagamento. Quando falta zero, a mesa é liberada.
5. Venda no balcão, paga na hora: aba **Balcão**.
6. **Fechar o caixa** no fim, mesmo que seja de madrugada. O resumo fica em **Relatório → Caixas anteriores** e pode ser impresso.

Cancelamentos e pagamentos removidos ficam registrados com o nome de quem fez.

## Preços

O cardápio já está cadastrado, mas **os preços começam em zero**. Preencha em **Caixa → Cardápio → Editar**. Enquanto um item estiver sem preço, o caixa mostra um aviso.

## Impressora térmica

A impressão usa a janela normal de impressão do navegador, no notebook do caixa:

1. Instale o driver da impressora e deixe ela como **impressora padrão**.
2. Em **Ajustes**, escolha a bobina (58 mm ou 80 mm).
3. No Chrome, na primeira impressão, desmarque "Cabeçalhos e rodapés" e deixe as margens em "Nenhuma".

O que dá para imprimir: a via da cozinha (em **Mesas e contas → Pedidos na cozinha**), a conta da mesa, o comprovante da venda no balcão e o fechamento do caixa.

## Cartões das mesas

Abra `/#cartoes`, clique em **Gerar arquivo para a gráfica** e escolha **Salvar como PDF**. São 10 × 15 cm, um por página.

Os QR Codes usam o endereço do site. Se um dia o endereço mudar, gere os cartões de novo.

## Como o site é publicado

O site fica no GitHub (repositório `ESQUINAS-LANCHES`) e o Netlify publica sozinho a cada mudança. Não arraste a pasta direto no Netlify: a pasta `netlify`, que guarda os pedidos, não sobe desse jeito.

## Limite do plano gratuito do Netlify

Os aparelhos da equipe perguntam ao servidor se há novidade a cada 8 a 12 segundos, e menos quando o movimento para. Só perguntam com a tela ligada e o site aberto. Isso mantém o uso baixo, mas o plano gratuito tem limite mensal. Confira de vez em quando em **Netlify → Usage**. Se o uso passar do limite, o site pode parar até o mês virar.

Dicas para gastar menos: feche a aba do caixa quando a lanchonete estiver fechada e não deixe celulares com o site aberto à toa.
