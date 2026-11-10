# Recuperação das pastas do projeto

Em 10/11/2026, os diretórios ausentes no GitHub foram recuperados da [pasta fornecida pela autora](https://drive.google.com/drive/folders/14Ebf0q2glH-7PERUTh3K9aaLc8gb201h).

## Conteúdo recuperado

- `backend/`: servidor Express, manifesto de dependências, lockfile e modelo de configuração.
- `data/`: cinco camadas GeoJSON referenciadas pela aplicação.
- `netlify/functions/`: chat, status, diagnóstico e geocodificação.
- `scripts/build-netlify.js`: geração do diretório estático de distribuição.

Os arquivos existentes de interface e `netlify.toml` foram preservados. `node_modules`, `dist` do Drive e `.env` não foram incorporados. O `dist` pode ser gerado pelo script recuperado.

O `.env.example` de origem continha um valor preenchido com aparência de credencial. A versão recuperada deixa `DEEPSEEK_API_KEY` vazia. A chave de origem deve ser revogada ou substituída pela responsável; nenhum teste de API ou alteração de credenciais foi realizado nesta recuperação.

O manifesto `recovery-manifest.json` registra tamanho e SHA-256 dos arquivos preparados para o repositório.

## Dados

| Arquivo | Feições |
| --- | ---: |
| `declividade.geojson` | 58.745 |
| `mapeamento_risco_geologico.geojson` | 7 |
| `mapeamento_risco_geologico_poligono.geojson` | 879 |
| `mapeamento_risco_hidrologico.geojson` | 283 |
| `setores_perigo_cprm.geojson` | 1 |

Os arquivos foram validados como JSON/FeatureCollection, sem reprojeção ou alteração das geometrias. Isso não constitui validação da precisão, completude ou metodologia das camadas. Os créditos de dados permanecem os registrados no README existente.

## Executar localmente

Para gerar e servir somente a interface:

```bash
node scripts/build-netlify.js
python -m http.server 4173 --directory dist
```

Abra http://localhost:4173. Esse servidor estático não fornece os endpoints de chat e geocodificação do backend.

Para instalar e executar o backend local:

```bash
cd backend
npm ci
```

Copie `.env.example` para `.env`, configure sua chave privadamente e execute `npm start` a partir de `backend/`. O inicializador `start-dev.bat` existente também usa esse diretório.

## Verificações realizadas

- Sintaxe dos seis arquivos JavaScript recuperados, usando `node --check`.
- Parsing das cinco camadas GeoJSON.
- Execução local do build e presença dos arquivos estáticos esperados em `dist/`.
- Verificação de ausência de tokens com o padrão de chave identificado nos arquivos preparados.

Não foram testadas chamadas a DeepSeek/Nominatim nem realizado deploy. As dependências instaladas não foram recuperadas; `npm ci` deve reconstruí-las a partir do lockfile.

## Revisões antes de uso do backend

O servidor recuperado configura `rejectUnauthorized` de modo que a validação TLS é desativada fora de `NODE_ENV=production`. Esse comportamento foi identificado no código original e deve ser corrigido antes de usar o backend local com uma credencial real. O código foi preservado para manter a rastreabilidade da recuperação.

Os endpoints de diagnóstico/status podem chamar o provedor e consumir uso da API. A integração da branch em produção exige revisão separada, inclusive de acesso, limites de uso e custos. Nenhuma configuração de Netlify, domínio ou variável de ambiente foi alterada nesta recuperação.
