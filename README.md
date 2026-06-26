# Portal de Consulta de Declividade e Riscos

Portal web interativo para consulta de declividade e areas de risco em Juiz de Fora, com mapa Leaflet, camadas GeoJSON, busca de endereco e assistente com IA para orientacoes preventivas.

## Funcionalidades

- Visualizacao de mapa interativo com Leaflet.
- Camadas de risco geologico, risco hidrologico e setores CPRM.
- Consulta de declividade por clique no mapa, sem poluir a visualizacao com a camada inteira.
- Busca de endereco com geocodificacao.
- Menu separado para basemaps:
  - OpenStreetMap
  - Esri World Imagery + Labels
  - OpenTopoMap
  - CARTO Positron
- Chatbot flutuante com suporte a IA.
- Indicador visual de status da API.
- Layout responsivo para desktop e celular.
- Deploy preparado para Netlify Functions.

## Tecnologias

- HTML
- CSS
- JavaScript
- Leaflet
- GeoJSON
- Netlify Functions
- DeepSeek API

## Estrutura do Projeto

```txt
.
├── index.html
├── style.css
├── script.js
├── data/
├── assets/
├── netlify/
│   └── functions/
├── scripts/
│   └── build-netlify.js
├── backend/
├── netlify.toml
└── README.md
```

## Como Rodar Localmente

Para visualizar apenas a interface:

```bash
python -m http.server 4173 --directory dist
```

Depois acesse:

```txt
http://localhost:4173
```

Para usar o backend local, configure a chave da API em `backend/.env`:

```env
DEEPSEEK_API_KEY=sua_chave_aqui
```

Em seguida, execute o servidor local pelo arquivo:

```txt
start-dev.bat
```

## Deploy no Netlify

O projeto ja esta preparado para deploy no Netlify usando:

```toml
[build]
  command = "node scripts/build-netlify.js"
  publish = "dist"
  functions = "netlify/functions"
```

No Netlify, configure a variavel de ambiente:

```txt
DEEPSEEK_API_KEY
```

Depois faca um novo deploy.

Para testar se a API esta funcionando no Netlify:

```txt
https://SEU-SITE.netlify.app/.netlify/functions/api-diagnostic
```

## Dados e Creditos

As camadas de risco geologico e hidrologico foram cedidas pela Prefeitura de Juiz de Fora.

A camada CPRM foi cedida pela CPRM.

## Autoria

Desenvolvido por [Rebeca Diniz Moura](https://github.com/RebecaGis).

