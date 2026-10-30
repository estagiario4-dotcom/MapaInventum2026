# Mapa Inventum 2026

Mapa do evento para celular. A base é a imagem final do mapa (`src/imagens/mapa-inventum.webp`), com os números dela (1 a 20) e sem o QR code e as tabelas: o nome de cada lugar aparece ao lado do número. A pessoa escaneia o QR code e aparece "Você está aqui". Ela toca no número ou no nome do lugar no mapa (ou escolhe na lista) e aparece a rota. Tocar de novo no mesmo lugar (ou no X) desmarca.

- A rota é uma linha azul por cima da imagem, da origem até o destino, seguindo os caminhos do evento.
- O painel mostra "Como chegar" em passos: de onde sair, por quais lugares passar e onde chegar, com o tempo a pé.
- A lista tem duas abas: **Área externa** e **Dentro do Pavilhão** (as atrações do Pavilhão). Para as atrações de dentro, a rota leva até a entrada do Pavilhão.
- O mapa ocupa a tela toda. O card de baixo sempre mostra a dica do que fazer em cada etapa, e o botão redondo volta o mapa para onde a pessoa está.
- Um X na etiqueta "Você está aqui", na do destino e no painel desmarca. Arrastar move o mapa, e dois dedos dão zoom (no computador, a roda do mouse ou os botões + / −).
- Sem QR code, o primeiro toque marca onde a pessoa está.

## Rodar local

```bash
npm install
npm run dev
```

Abrir `http://localhost:5173/?aqui=food-truck` (o `aqui` é o `id` de um local).

## Mudar o mapa: tudo em `src/dados/mapa.json`

As posições são medidas na imagem com largura 1600 e altura 800 (`imagem.largura` e `imagem.altura`), não importa o tamanho real do arquivo.

- **imagem**: tamanho de referência do mapa. O arquivo fica em `src/imagens/` (o build dá a ele um nome único, assim o celular guarda a imagem e não baixa de novo).
- **locais**: cada lugar.
  - `id`: vai no QR code (`?aqui=id`). Não mudar depois de imprimir.
  - `numero`: o número que aparece na imagem.
  - `rotulo`: o nome que aparece no mapa, ao lado do ponto.
  - `nome`: aparece na lista e nos passos.
  - `x`, `y`: onde fica o número na imagem (é onde a pessoa toca).
  - `no`: em qual ponto do caminho o lugar se liga. A rota chega por ele.
  - `dentro: true`: atração de dentro do Pavilhão. `x`, `y` é o meio do espaço dela (onde a rota chega), `ponto` é onde fica a bolinha com o ícone, `no` é a porta dela no corredor e `icone` é o desenho da bolinha (pato, foto, empresa, palco, banheiro, drone, bola, foguete, fone, volante, arvore, controle, robo, cafe, chip, vr, planeta). Sem `x`, `y` e `no` (ex.: Expositores), não aparece no mapa e a rota vai até a entrada do Pavilhão.
- **pavilhao**: o `id` do lugar que representa o Pavilhão (Exposição Interna).
- **planta**: o Pavilhão por dentro. Com o mapa aproximado, o telhado some e aparece o desenho 3D de dentro (`imagem`, em `src/imagens/pavilhao-dentro.webp`, feito a partir da planta interna do Miro). `contorno` é `[x, y, largura, altura]` do telhado; `entrada` (porta da frente) e `entradaLateral` (ENTRADA 01) marcam as portas. Os corredores de dentro são os nós `pv...` em `nos` e `caminhos`; a porta da frente liga no nó `entrada` e a lateral no corredor dos food trucks (`f4`).
- **nos**: pontos dos caminhos (`x`, `y` na imagem).
- **caminhos**: ligações entre dois nós. A rota só anda por elas. Um 3º número opcional deixa o trecho "mais caro" (ex.: `["p1", "entrada", 4]`): a calçada da frente do Pavilhão tem custo 4, para que quem está à esquerda e vai para o Auditório (ou outro lugar à direita) passe por dentro do Pavilhão.
- **metrosPorUnidade**: usado para o tempo a pé (aproximado).

**Lugar mudou de nome?** Trocar o `nome`. **Mudou de lugar?** Trocar `x`, `y` e `no`.

### Quando chegar a versão final da imagem

1. Exporte a imagem nova (2:1, de preferência com 3200 px de largura) e salve por cima de `src/imagens/mapa-inventum.webp` (mesmo nome).
2. Abra com `?editor` (ex.: `http://localhost:5173/?editor`) e toque em cada lugar e em cada curva dos caminhos para ver o `x, y`.
3. Atualize `locais`, `nos` e `caminhos` no JSON e rode `node scripts/testar-rotas.mjs`.

Se a imagem nova não for 2:1, mude também `imagem.largura` e `imagem.altura` para a mesma proporção.

### Modo editor

Abrir com `?editor` no final, ex.: `http://localhost:5173/?aqui=food-truck&editor`.
Mostra os caminhos (linhas rosa), os nós (pontos amarelos com o nome) e a ligação de cada lugar ao seu nó (linhas azuis tracejadas). Ao tocar no mapa, mostra o `x, y` daquele ponto para colocar no JSON.

### Conferir as rotas

```bash
node scripts/testar-rotas.mjs
```

Confere se todos os nós existem e se dá para ir de qualquer lugar para qualquer outro.

## Deploy na Vercel

O projeto já tem o `vercel.json` (build com `npm run build`, publica a pasta `dist`).

**Pelo GitHub (recomendado):**

1. Suba o projeto para o GitHub (`git add . && git commit -m "deploy vercel" && git push`).
2. Em vercel.com, entre com a conta do GitHub e clique em **Add New → Project**.
3. Escolha o repositório `Mapa_Inventum` e clique em **Deploy** (as configurações já vêm do `vercel.json`).
4. Pronto: a Vercel mostra o link (`https://...vercel.app`). Cada `git push` na `main` atualiza o site sozinho.

**Pelo terminal (sem GitHub):**

```bash
npm i -g vercel
vercel          # primeira vez: faz login e cria o projeto
vercel --prod   # publica a versão final
```

**Domínio próprio:** em Project → Settings → Domains, adicione o endereço (ex.: `mapa.patobranco.pr.gov.br`) e passe para a TI o registro DNS que a Vercel mostrar.

## Alternativa: Cloud Run

```bash
gcloud run deploy mapa-inventum \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --min-instances 1
```

`--min-instances 1` evita a demora da primeira abertura (cold start). Depois do evento, volte para 0 para não pagar:

```bash
gcloud run services update mapa-inventum --region southamerica-east1 --min-instances 0
```

## QR codes

Depois do deploy, com o link definitivo do site (o mesmo que vai ficar no ar durante o evento):

```bash
npm run qrcodes -- https://mapa-inventum-xxxxx.run.app
```

Gera um PNG por local na pasta `qrcodes/`. Imprima só os dos pontos onde vai ter QR.


## Entradas do Pavilhão

O acesso é só pelas laterais: a da esquerda (`entradaLateral`, ligada ao nó `f4`, no fim do corredor dos Food Trucks) e a da direita (`entradaDireita`, que passa pelo anexo de teto diferente e sai na calçada pelos nós `anexo` e `anexo-porta`). A frente do Pavilhão não tem entrada.
