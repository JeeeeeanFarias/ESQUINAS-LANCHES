# Sistema de Mesas da Lanchonete

Site para controlar os pedidos das mesas, a cozinha e o caixa. Funciona no celular, no tablet e no notebook.

## As telas

| Endereço | Para quem | Aparelho |
|---|---|---|
| `seu-site.netlify.app/#garcom` | Garçom lança pedidos | Celular |
| `seu-site.netlify.app/#cozinha` | Cozinha vê e marca os pedidos | Tablet ou celular na parede |
| `seu-site.netlify.app/#caixa` | Caixa recebe, fecha contas, cardápio e relatório | Notebook |
| `seu-site.netlify.app/#cartoes` | Gera os cartões com QR Code para a gráfica | Notebook |
| `seu-site.netlify.app/?m=código` | Cliente (o QR Code da mesa leva aqui) | Celular do cliente |

Cada aparelho lembra a última tela usada.

## Senha da equipe

Todos entram com a mesma senha e escolhem o próprio nome.
A senha padrão é **1234**. Para trocar, no Netlify vá em
**Site configuration → Environment variables** e crie a variável `EQUIPE_PIN` com a senha nova.
Depois faça um novo deploy (Deploys → Trigger deploy).

## Como publicar no Netlify

Este site tem uma parte de servidor (a pasta `netlify/functions`), que guarda os pedidos.
Por isso **não dá para publicar arrastando a pasta** na página do Netlify. Use um destes caminhos:

### Opção 1: pelo terminal (Netlify CLI)

1. Instale o Node.js (nodejs.org, versão LTS).
2. Abra o terminal nesta pasta e rode:
   ```
   npm install
   npx netlify-cli login
   npx netlify-cli deploy --prod
   ```
3. Na primeira vez ele pergunta se quer criar um site novo. Responda que sim e escolha um nome.

### Opção 2: pelo GitHub

1. Suba esta pasta para um repositório no GitHub.
2. No Netlify: **Add new site → Import an existing project → GitHub** e escolha o repositório.
3. Não precisa mudar nada nas configurações. É só clicar em Deploy.

## Depois de publicar

1. Abra `#caixa` no notebook, entre com a senha e vá em **Ajustes**: coloque o nome da lanchonete, a logo e confira o número de mesas.
2. Em **Cardápio**, troque os itens de exemplo pelos seus (preços, ingredientes que dá para tirar, e se vai para a cozinha).
3. Abra `#cartoes`, clique em **Gerar arquivo para a gráfica** e escolha **Salvar como PDF**. Leve o PDF à gráfica (10 × 15 cm, sem margem).

> Importante: só imprima os cartões **depois** de publicar. Os QR Codes usam o endereço do site.
> Se um dia mudar o endereço do site, gere os cartões de novo.

## Impressora térmica

A impressão usa a janela normal de impressão do navegador. No notebook:
1. Instale o driver da impressora térmica e deixe ela como **impressora padrão**.
2. Em **Ajustes**, escolha a bobina (58 mm ou 80 mm).
3. No Chrome, na primeira impressão, desmarque "Cabeçalhos e rodapés" e deixe as margens em "Nenhuma".

## O dia a dia

- **Abrir caixa** no começo do expediente (com o troco inicial) e **Fechar caixa** no fim, mesmo que seja de madrugada.
- O resumo de cada caixa fechado fica em **Relatório → Caixas anteriores**.
- Cancelamentos e remoções de pagamento ficam registrados com o nome de quem fez.
