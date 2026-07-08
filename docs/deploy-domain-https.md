# Domínio próprio + HTTPS (Nginx + Certbot) na VPS

Coloca o Noryth atrás de um domínio com HTTPS, mantendo o deploy simples
(GitHub Actions + SSH). **Postgres e MinIO não são tocados.** Sem Docker
Compose, sem Kubernetes.

Arquitetura:

```
Internet
  │  80/443
  ▼
Nginx (VPS)
  ├── noryth.io, www.noryth.io  ──►  127.0.0.1:8080  (container noryth-web)
  ├── api.noryth.io             ──►  127.0.0.1:3000  (container noryth-api)
  └── assets.noryth.io          ──►  127.0.0.1:9000  (MinIO — object storage)
```

Os containers passam a bindar **apenas em `127.0.0.1`** — só o Nginx fica
público (80/443). O MinIO continua igual; o Nginx apenas o expõe por HTTPS em
`assets.noryth.io` (resolve o *mixed content* de imagens).

> **Ordem recomendada:** suba primeiro em **HTTP** (`ENABLE_HTTPS=false`),
> confirme que o DNS propagou, e só então ligue `ENABLE_HTTPS=true`. Ligar HTTPS
> antes do DNS apontar faz o Certbot falhar. (O script não derruba o deploy
> nesse caso — mantém HTTP — mas o certificado não sai.)

---

## 1. DNS na GoDaddy (manual)

No painel do domínio `noryth.io` → **DNS → Manage Zones**, crie:

| Tipo  | Nome     | Valor              | TTL     |
| ----- | -------- | ------------------ | ------- |
| A     | `@`      | `2.25.165.38`      | 600     |
| A     | `api`    | `2.25.165.38`      | 600     |
| A     | `assets` | `2.25.165.38`      | 600     |
| CNAME | `www`    | `noryth.io`        | 600     |

> Troque `2.25.165.38` pelo IP atual da sua VPS. (No painel da GoDaddy o CNAME
> `www` às vezes aceita `@` — se não, use `noryth.io`.)

### Testar propagação

```bash
nslookup noryth.io
nslookup api.noryth.io
nslookup assets.noryth.io
nslookup www.noryth.io
# Os A devem retornar o IP da VPS. Pode levar de minutos a algumas horas.
```

---

## 2. Portas abertas na VPS / firewall Hostinger

Garanta que estejam **abertas (TCP)**:

| Porta | Uso                 |
| ----- | ------------------- |
| 22    | SSH (deploy)        |
| 80    | HTTP + ACME (Certbot) |
| 443   | HTTPS               |

As portas 3000 e 8080 **não** precisam estar abertas publicamente — os
containers ficam em `127.0.0.1` e só o Nginx as acessa.

Se usar `ufw` na VPS:

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
```

---

## 3. Secrets e Variables no GitHub

**Settings → Secrets and variables → Actions.**

### Variables (aba *Variables* — não são sensíveis)

| Variable        | Valor              | Default no workflow |
| --------------- | ------------------ | ------------------- |
| `APP_DOMAIN`    | `noryth.io`        | `noryth.io`         |
| `API_DOMAIN`    | `api.noryth.io`    | `api.noryth.io`     |
| `ASSETS_DOMAIN` | `assets.noryth.io` | `assets.noryth.io`  |
| `ENABLE_HTTPS`  | `false` → `true`   | `false`             |

> Como há defaults no workflow, `APP_DOMAIN`/`API_DOMAIN`/`ASSETS_DOMAIN` são
> opcionais se você usar exatamente esses domínios. `ENABLE_HTTPS` é a chave do
> processo: comece com `false`, depois mude para `true`.

### Secrets (aba *Secrets*)

Além dos já existentes (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT`,
`GHCR_USERNAME`, `GHCR_TOKEN`, `API_ENV_FILE`, `WEB_ENV_FILE`), adicione:

| Secret              | Valor                                  |
| ------------------- | -------------------------------------- |
| `LETSENCRYPT_EMAIL` | e-mail para o Let's Encrypt (avisos/expiração) |

Nos env files (`API_ENV_FILE` / `WEB_ENV_FILE`), use os valores de produção:

```env
# API_ENV_FILE
WEB_ORIGIN=https://noryth.io,https://www.noryth.io
# Endpoint INTERNO (API -> MinIO). Não é o que o navegador vê.
MINIO_ENDPOINT=172.17.0.1
MINIO_PORT=9000
MINIO_BUCKET=noryth-assets
MINIO_USE_SSL=false
# URL PÚBLICA (HTTPS) devolvida ao navegador. O bucket é anexado automaticamente.
MINIO_PUBLIC_URL=https://assets.noryth.io
# ...demais variáveis (DATABASE_*, JWT_SECRET, MINIO_ACCESS_KEY/SECRET_KEY)

# WEB_ENV_FILE
REACT_APP_API_URL=https://api.noryth.io/api
```

> **Front (CRA):** a variável é `REACT_APP_API_URL`, injetada em runtime
> (`window._env_`) — em produção aponte para `https://api.noryth.io/api`.
>
> **Backend (CORS):** `WEB_ORIGIN` aceita lista separada por vírgula. Libere
> `https://noryth.io` e `https://www.noryth.io`.
>
> **Assets/MinIO (mixed content):** veja a seção
> [MinIO e assets por HTTPS](#5-minio-e-assets-por-https).

---

## 4. Fluxo de deploy

### Passo 1 — HTTP primeiro (sem HTTPS)

1. `ENABLE_HTTPS = false` (ou ausente).
2. Faça push na `main` (ou **Actions → Deploy → Run workflow**).
3. O deploy sobe os containers em localhost e configura o Nginx em **HTTP**.
4. Confirme o DNS (seção 1) e teste:

   ```bash
   curl -I http://noryth.io
   curl -I http://api.noryth.io/api
   ```

### Passo 2 — Habilitar HTTPS

1. Com o DNS já apontando para a VPS, defina a variable `ENABLE_HTTPS = true`.
2. Garanta que o secret `LETSENCRYPT_EMAIL` existe.
3. Rode o deploy de novo (push ou *Run workflow*).
4. O script obtém o certificado (apex + www + api + **assets**) via Certbot
   (webroot) e passa a servir HTTPS com redirect 80 → 443.

O processo é **idempotente**: rodar o deploy várias vezes não duplica config nem
recria certificado à toa (`--keep-until-expiring`). Se o certificado já existe
mas ainda não cobre `assets.noryth.io`, o `--expand` adiciona o domínio ao
certificado existente. A renovação é automática (timer do Certbot) e recarrega
o Nginx via `--deploy-hook`.

> Quando `ENABLE_HTTPS=true` e o certificado **não** pode ser emitido (DNS não
> propagou, portas fechadas), o script **falha de forma clara** e o deploy quebra
> — de propósito, para você ver o problema. Por isso, só ligue `ENABLE_HTTPS=true`
> depois de confirmar o DNS de **todos** os domínios (incl. `assets`).

---

## 5. MinIO e assets por HTTPS

O front em `https://noryth.io` não pode carregar imagens de
`http://<ip>:9000/...` — o navegador bloqueia por **mixed content**. A solução é
servir o MinIO por HTTPS através do Nginx, em `assets.noryth.io`.

O que muda:

- **DNS:** registro `A assets -> IP` (seção 1).
- **Nginx:** o script adiciona `assets.noryth.io -> http://127.0.0.1:9000`
  (com `client_max_body_size 100m` e `proxy_buffering/off` para uploads/streaming),
  e inclui `assets` no certificado.
- **Backend:** a URL pública das imagens é controlada por **`MINIO_PUBLIC_URL`**.

Distinção importante (já separada no código):

| Variável           | Papel                                             | Valor de produção            |
| ------------------ | ------------------------------------------------- | ---------------------------- |
| `MINIO_ENDPOINT`/`MINIO_PORT` | Endpoint **interno** — a API lê/grava no MinIO (S3) | host interno, ex. `172.17.0.1:9000` |
| `MINIO_PUBLIC_URL` | URL **pública** devolvida ao navegador            | `https://assets.noryth.io`   |

A URL final é montada como `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/<path>` — o bucket
é anexado automaticamente, então **não** inclua o bucket em `MINIO_PUBLIC_URL`:

```
https://assets.noryth.io/noryth-assets/campaigns/<id>/cover/cover.png
```

> **Imagens já existentes:** `coverImageUrl` foi salvo no banco como URL absoluta
> (`http://<ip>:9000/...`). Trocar `MINIO_PUBLIC_URL` só afeta **novos** uploads;
> as campanhas antigas continuam com a URL http. Isso mexe em dados existentes,
> então **não** faço automaticamente — se quiser, eu preparo um `UPDATE` pontual
> (com sua confirmação) para reescrever as URLs antigas para `https://assets...`.

---

## 6. Verificação na VPS

```bash
docker ps                       # noryth-api e noryth-web rodando (em 127.0.0.1)
systemctl status nginx          # nginx ativo
nginx -t                        # config válida
certbot certificates            # deve listar os 4 domínios (apex, www, api, assets)
curl -I https://noryth.io       # 200/301 do web
curl -I https://api.noryth.io/api
curl -I https://assets.noryth.io/noryth-assets/  # MinIO via HTTPS
curl -I http://noryth.io        # deve redirecionar (301) para https quando HTTPS on
```

Config gerada pelo script: `/etc/nginx/sites-available/noryth.conf`
(symlink em `/etc/nginx/sites-enabled/noryth.conf`).

---

## 7. Rodar o setup do Nginx manualmente (opcional)

O deploy já roda o script, mas você pode executá-lo direto na VPS:

```bash
sudo APP_DOMAIN=noryth.io API_DOMAIN=api.noryth.io ASSETS_DOMAIN=assets.noryth.io \
     ENABLE_HTTPS=true LETSENCRYPT_EMAIL=voce@email.com \
     bash /opt/noryth/scripts/vps/setup-nginx-https.sh
```

Sem `ENABLE_HTTPS=true`, ele apenas (re)configura o proxy HTTP.

---

## 8. Troubleshooting

- **Certbot falhou / "challenge failed":** DNS ainda não propagou (confira
  `assets` também) ou 80/443 fechadas. Confirme `nslookup` e o firewall, e rode
  o deploy de novo com `ENABLE_HTTPS=true`.
- **Imagem ainda em `http://<ip>:9000`:** `MINIO_PUBLIC_URL` não foi atualizado
  no `api.env`, ou é uma campanha antiga (URL salva no banco antes da mudança —
  ver seção 5).
- **`assets.noryth.io` dá 502/timeout:** MinIO não está escutando em
  `127.0.0.1:9000`, ou o Nginx não recarregou. `curl -I http://127.0.0.1:9000`
  na VPS e `docker ps`/serviço do MinIO.
- **502 Bad Gateway (web/api):** o container correspondente não está de pé —
  `docker ps` / `docker logs -f noryth-api`.
- **CORS bloqueado no navegador:** confira `WEB_ORIGIN` no `api.env` (precisa
  conter a origem exata, com `https://`).
- **Front chamando `localhost`:** confira `REACT_APP_API_URL` no `web.env` e
  recrie o container web (o valor é injetado no start).
