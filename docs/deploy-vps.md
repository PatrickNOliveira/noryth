# Deploy do Noryth em VPS (Hostinger)

Deploy simples, sem Kubernetes/Helm/Terraform e sem Docker Compose para
dependências. **PostgreSQL e MinIO são externos** — este projeto nunca os cria.

O deploy é automatizado por [.github/workflows/deploy.yml](../.github/workflows/deploy.yml):
a cada push na branch `main`, o GitHub Actions builda as imagens da API e do Web,
publica no **GitHub Container Registry (GHCR)** e faz deploy na VPS via SSH.

Imagens publicadas:

```
ghcr.io/<owner>/<repo>/noryth-api:latest   e  :<sha>
ghcr.io/<owner>/<repo>/noryth-web:latest   e  :<sha>
```

Containers na VPS: `noryth-api` (porta 3000) e `noryth-web` (8080 → 80).

---

## 1. Instalar Docker na VPS

```bash
# como root (ou com sudo)
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker --version
```

---

## 2. Preparar `/opt/noryth`

Os arquivos de ambiente são criados automaticamente pelo workflow a partir dos
secrets, mas o diretório pode ser preparado antes:

```bash
mkdir -p /opt/noryth
# O deploy escreve aqui:
#   /opt/noryth/api.env
#   /opt/noryth/web.env
```

O conteúdo desses arquivos segue [`.env.production.example`](../.env.production.example)
(seção API → `api.env`, seção WEB → `web.env`).

---

## 3. Gerar chave SSH para o GitHub Actions

Na sua máquina (ou na VPS), gere um par **dedicado ao CI**:

```bash
ssh-keygen -t ed25519 -C "noryth-deploy" -f ~/.ssh/noryth_deploy
```

Autorize a chave pública na VPS (no usuário que fará o deploy):

```bash
ssh-copy-id -i ~/.ssh/noryth_deploy.pub <VPS_USER>@<VPS_HOST>
# ou manualmente: adicione o conteúdo de noryth_deploy.pub em ~/.ssh/authorized_keys na VPS
```

A **chave privada** (`~/.ssh/noryth_deploy`, arquivo inteiro) vai no secret
`VPS_SSH_KEY`.

---

## 4. Cadastrar os secrets no GitHub

Repositório → **Settings → Secrets and variables → Actions → New repository secret**.

| Secret          | Descrição                                                                 |
| --------------- | ------------------------------------------------------------------------- |
| `VPS_HOST`      | IP ou domínio da VPS                                                       |
| `VPS_USER`      | Usuário SSH                                                                |
| `VPS_SSH_KEY`   | Conteúdo da **chave privada** SSH (`~/.ssh/noryth_deploy`)                 |
| `VPS_PORT`      | Porta SSH (default `22`)                                                   |
| `GHCR_USERNAME` | Seu usuário do GitHub (para a VPS puxar as imagens)                        |
| `GHCR_TOKEN`    | Personal Access Token com escopo `read:packages` (pull de imagens no GHCR)|
| `API_ENV_FILE`  | Conteúdo COMPLETO do `api.env` (seção API do `.env.production.example`)    |
| `WEB_ENV_FILE`  | Conteúdo COMPLETO do `web.env` (`REACT_APP_API_URL=...`)                   |

Notas:
- O **push** das imagens no CI usa o `GITHUB_TOKEN` automático (não precisa de secret).
- O `GHCR_TOKEN` é usado apenas na VPS, para **puxar** imagens (necessário se o
  pacote for privado). Gere em **Settings → Developer settings → Personal access
  tokens** com `read:packages`.
- Nunca commite `.env` real nem chaves — tudo vive em GitHub Secrets.

---

## 5. Rodar o deploy

**Automático:** faça push na `main`.

**Manual:** aba **Actions → Deploy → Run workflow** (gatilho `workflow_dispatch`).

O que o workflow faz na VPS (resumo):

1. Escreve `api.env`/`web.env` a partir dos secrets.
2. `docker login ghcr.io` e `docker pull` das imagens `:latest`.
3. Roda as migrations: `docker run --rm --env-file api.env <api> npm run migration:run:prod`.
4. Recria `noryth-api` (`-p 3000:3000`) e `noryth-web` (`-p 8080:80`), ambos com `--restart unless-stopped`.
5. Verifica se os dois containers ficaram `Running` (falha o deploy se não).

### Deploy manual direto na VPS (sem Actions)

Se precisar subir na mão (imagens já publicadas):

```bash
OWNER_REPO=<owner>/<repo>   # em minúsculas
API=ghcr.io/$OWNER_REPO/noryth-api:latest
WEB=ghcr.io/$OWNER_REPO/noryth-web:latest

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
docker pull "$API" && docker pull "$WEB"

docker run --rm --env-file /opt/noryth/api.env "$API" npm run migration:run:prod

docker rm -f noryth-api noryth-web 2>/dev/null || true
docker run -d --name noryth-api --restart unless-stopped --env-file /opt/noryth/api.env -p 3000:3000 "$API"
docker run -d --name noryth-web --restart unless-stopped --env-file /opt/noryth/web.env -p 8080:80 "$WEB"
```

---

## 6. Migrations

O schema é gerenciado **exclusivamente por migrations** (nunca `synchronize`).
Em produção elas **não** rodam no boot da API — são um passo explícito do deploy:

```bash
docker run --rm --env-file /opt/noryth/api.env \
  ghcr.io/<owner>/<repo>/noryth-api:latest \
  npm run migration:run:prod
```

Esse script roda o CLI do TypeORM sobre o código compilado
(`dist/shared/config/data-source.js`), com `tsconfig-paths` resolvendo os
aliases `@shared`/`@modules` em runtime.

---

## 7. Logs, status e reinício

```bash
docker ps                      # containers ativos
docker logs -f noryth-api      # logs da API
docker logs -f noryth-web      # logs do Web
docker restart noryth-api      # reiniciar API
docker restart noryth-web      # reiniciar Web
docker inspect -f '{{.State.Running}}' noryth-api
```

---

## 8. Proxy reverso (exemplos — não configurado automaticamente)

Mapeie os domínios para os containers locais. Escolha **Nginx** ou **Caddy**.

Alvo:

```
app.noryth.com -> localhost:8080   (web)
api.noryth.com -> localhost:3000   (api)
```

### Caddy (HTTPS automático)

`/etc/caddy/Caddyfile`:

```caddyfile
app.noryth.com {
    reverse_proxy localhost:8080
}

api.noryth.com {
    reverse_proxy localhost:3000
}
```

```bash
systemctl reload caddy
```

### Nginx

`/etc/nginx/sites-available/noryth.conf`:

```nginx
server {
    listen 80;
    server_name app.noryth.com;
    location / { proxy_pass http://localhost:8080; proxy_set_header Host $host; }
}

server {
    listen 80;
    server_name api.noryth.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/noryth.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
# HTTPS: use certbot (Let's Encrypt) para emitir os certificados.
```

Depois de definir os domínios, lembre de ajustar nos env:
- `api.env` → `WEB_ORIGIN=https://app.noryth.com` (CORS)
- `web.env` → `REACT_APP_API_URL=https://api.noryth.com/api`

E redeploy (ou `docker restart`) para aplicar.

---

## Notas de segurança

- `.env` real e chaves **nunca** são commitados nem entram nas imagens
  (garantido pelo [`.dockerignore`](../.dockerignore)).
- Segredos ficam **apenas** em GitHub Secrets; o workflow os injeta em runtime.
- `api.env`/`web.env` na VPS ficam com permissão `600`.
