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
  └── api.noryth.io             ──►  127.0.0.1:3000  (container noryth-api)
```

Os containers passam a bindar **apenas em `127.0.0.1`** — só o Nginx fica
público (80/443).

> **Ordem recomendada:** suba primeiro em **HTTP** (`ENABLE_HTTPS=false`),
> confirme que o DNS propagou, e só então ligue `ENABLE_HTTPS=true`. Ligar HTTPS
> antes do DNS apontar faz o Certbot falhar. (O script não derruba o deploy
> nesse caso — mantém HTTP — mas o certificado não sai.)

---

## 1. DNS na GoDaddy (manual)

No painel do domínio `noryth.io` → **DNS → Manage Zones**, crie:

| Tipo  | Nome  | Valor              | TTL     |
| ----- | ----- | ------------------ | ------- |
| A     | `@`   | `2.25.165.38`      | 600     |
| A     | `api` | `2.25.165.38`      | 600     |
| CNAME | `www` | `noryth.io`        | 600     |

> Troque `2.25.165.38` pelo IP atual da sua VPS. (No painel da GoDaddy o CNAME
> `www` às vezes aceita `@` — se não, use `noryth.io`.)

### Testar propagação

```bash
nslookup noryth.io
nslookup api.noryth.io
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

| Variable       | Valor              | Default no workflow |
| -------------- | ------------------ | ------------------- |
| `APP_DOMAIN`   | `noryth.io`        | `noryth.io`         |
| `API_DOMAIN`   | `api.noryth.io`    | `api.noryth.io`     |
| `ENABLE_HTTPS` | `false` → `true`   | `false`             |

> Como há defaults no workflow, `APP_DOMAIN`/`API_DOMAIN` são opcionais se você
> usar exatamente `noryth.io`. `ENABLE_HTTPS` é a chave do processo: comece com
> `false`, depois mude para `true`.

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
# ...demais variáveis (DATABASE_*, JWT_SECRET, MINIO_*)

# WEB_ENV_FILE
REACT_APP_API_URL=https://api.noryth.io/api
```

> **Front (CRA):** a variável é `REACT_APP_API_URL`, injetada em runtime
> (`window._env_`) — em produção aponte para `https://api.noryth.io/api`.
>
> **Backend (CORS):** `WEB_ORIGIN` aceita lista separada por vírgula. Libere
> `https://noryth.io` e `https://www.noryth.io`.

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
4. O script obtém o certificado (apex + www + api) via Certbot (webroot) e passa
   a servir HTTPS com redirect 80 → 443.

O processo é **idempotente**: rodar o deploy várias vezes não duplica config nem
recria certificado à toa (`--keep-until-expiring`). A renovação é automática
(timer do Certbot) e recarrega o Nginx via `--deploy-hook`.

---

## 5. Verificação na VPS

```bash
docker ps                       # noryth-api e noryth-web rodando (em 127.0.0.1)
systemctl status nginx          # nginx ativo
nginx -t                        # config válida
certbot certificates            # certificados emitidos e validade
curl -I https://noryth.io       # 200/301 do web
curl -I https://api.noryth.io/api
curl -I http://noryth.io        # deve redirecionar (301) para https quando HTTPS on
```

Config gerada pelo script: `/etc/nginx/sites-available/noryth.conf`
(symlink em `/etc/nginx/sites-enabled/noryth.conf`).

---

## 6. Rodar o setup do Nginx manualmente (opcional)

O deploy já roda o script, mas você pode executá-lo direto na VPS:

```bash
sudo APP_DOMAIN=noryth.io API_DOMAIN=api.noryth.io ENABLE_HTTPS=true \
     LETSENCRYPT_EMAIL=voce@email.com \
     bash /opt/noryth/scripts/vps/setup-nginx-https.sh
```

Sem `ENABLE_HTTPS=true`, ele apenas (re)configura o proxy HTTP.

---

## 7. Troubleshooting

- **Certbot falhou / "challenge failed":** DNS ainda não propagou ou 80/443
  fechadas. Confirme `nslookup` e o firewall, e rode o deploy de novo com
  `ENABLE_HTTPS=true`.
- **502 Bad Gateway:** o container correspondente não está de pé —
  `docker ps` / `docker logs -f noryth-api`.
- **CORS bloqueado no navegador:** confira `WEB_ORIGIN` no `api.env` (precisa
  conter a origem exata, com `https://`).
- **Front chamando `localhost`:** confira `REACT_APP_API_URL` no `web.env` e
  recrie o container web (o valor é injetado no start).
