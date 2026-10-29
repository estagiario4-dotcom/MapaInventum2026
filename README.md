# Mapa Inventum 2026

Mapa do evento para celular, no estilo dos apps de mapa: busca em cima, mapa no meio e painel embaixo. A pessoa escaneia o QR code e aparece "Você está aqui". Ela toca no lugar no mapa (ou usa a busca e os atalhos) e o mapa mostra a rota.

- No celular, o mapa abre perto de "Você está aqui". "Ver o mapa todo" mostra o evento inteiro. Arrastar move o mapa, e dois dedos ou os botões + / − dão zoom.
- Os nomes ficam com tamanho fixo na tela. Quando o nome não cabe no bloco, aparece um ícone com o nome embaixo, sem sobrepor outros nomes.
- Atalhos no painel (Banheiros, Comida, Palcos, Estandes, Atrações, Entradas) destacam esses lugares no mapa e mostram a lista.
- Tocar num lugar marca o destino e traça a rota azul, sem mexer no zoom. Um X na etiqueta do lugar (e no painel) desmarca. O painel mostra o tempo a pé, calculado pelas medidas reais (1 metro = 4 unidades do mapa).
- Sem QR code, o primeiro toque (ou a busca) marca onde a pessoa está.
- **Street View:** no painel do destino, o botão "Street View" abre o Google Street View na rua mais próxima, já virado para o lugar (para lugares dentro do pavilhão, mostra a fachada do pavilhão). O botão do bonequinho no mapa liga um modo em que o toque em qualquer ponto abre o Street View dali. Usa o link oficial do Google Maps (não precisa de chave de API); no celular abre o app do Google Maps. O Google sempre mostra a foto mais próxima do ponto, e dentro do parque normalmente só existem fotos das ruas em volta. A conversão do mapa para latitude/longitude fica em `geo`, no `mapa.json`, e o código em `src/streetview.js`.
- A base do mapa (ruas, prédios, cerca do parque, kartódromo, lago e matas) vem do **OpenStreetMap**, com as medidas reais. Por isso o crédito "© OpenStreetMap" aparece no canto do mapa e precisa ficar (licença ODbL). Os dados ficam dentro do app, então o mapa funciona sem buscar nada na internet.
- Os nomes vêm dos cards do Miro "Inventum 2026 – Mapa dos Estandes" (onde não há card, do número da tabela do Miro). A planta dos estandes foi encaixada no contorno real do Centro de Eventos.
- A rota anda **só por dentro do parque** (caminhos internos do OSM, dentro da cerca), nunca pelas ruas de fora. Além dos caminhos do OSM, há a entrada principal do pavilhão (lado oeste), os portões do meio (norte e sul), o caminho do pavilhão até a pista e a passagem pelo gramado de dentro da pista até os boxes do kartódromo. O teste `scripts/testar-rotas.mjs` confere todas as rotas.

## Rodar local

```bash
npm install
npm run dev
```

Abrir `http://localhost:5173/?aqui=food-trucks` (o `aqui` é o `id` de um local).

## Mudar o mapa: tudo em `src/dados/mapa.json`

- **locais**: cada lugar que dá para tocar e buscar
  - `id`: vai no QR code (`?aqui=id`). Não mudar depois de imprimir.
  - `nome`: aparece no mapa e na busca. Locais com o mesmo nome (ex.: "Banheiros") viram um destino só, e a rota vai para o mais perto.
  - `dica` (opcional): texto extra, também entra na busca (ex.: "Animais empalhados").
  - `x`, `y`: canto superior esquerdo do bloco. `w`, `h`: largura e altura.
  - `forma` (opcional): `"circulo"` desenha redondo.
  - `no`: em qual ponto de caminho o local se liga. A rota chega por ele.
- `pontos` (opcional): contorno do lugar, quando não é retângulo. `dentro: true` marca os lugares de dentro do pavilhão.
- **chao**: a base do mapa, vinda do OpenStreetMap (1 metro = 4 unidades): `parque` (área dentro da cerca), `areas` (estacionamentos, campos, lotes), `matas`, `ruas` (`tipo: "rua"` com `nome`, ou `tipo: "interna"` para os caminhos do parque), `pista` do kartódromo, `cercas`, `predios` e o `pavilhao`.
- **nos** e **caminhos**: pontos e ligações por onde a rota anda (caminhos reais do parque e corredores do pavilhão).
- **mapa**: limites da visão "mapa todo".

**Estande mudou de dono?** Trocar o `nome`. **Mudou de lugar?** Trocar `x`, `y` e `no`. Depois fazer o deploy de novo.

### Modo editor

Abrir com `&editor` no final, ex.: `http://localhost:5173/?aqui=food-trucks&editor`.
Mostra os caminhos (linhas vermelhas) e o nome de cada nó, e ao tocar no mapa mostra o `x, y` daquele ponto para colocar no JSON.

### Conferir as rotas

```bash
node scripts/testar-rotas.mjs
```

Testa todas as combinações de origem e destino e avisa se algum lugar ficou fora da cerca, se alguma rota falhou ou se alguma rota sai do parque.

## Deploy no Cloud Run

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

Depois do deploy, com a URL que o Cloud Run mostrou:

```bash
npm run qrcodes -- https://mapa-inventum-xxxxx.run.app
```

Gera um PNG por local na pasta `qrcodes/`. Imprima só os dos pontos onde vai ter QR.
