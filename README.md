# Noryth

Plataforma para gerenciamento de **mesas de RPG presenciais**.

Esta é a **História 01 — Fundação do Projeto**. O objetivo aqui é uma base
sólida, escalável e desacoplada. **Nenhuma regra de negócio de RPG** é
implementada — apenas estrutura, autenticação, tema e a infraestrutura de
Providers e Domain Events sobre a qual as próximas histórias serão construídas.

---

## Sumário

- [Estrutura do projeto](#estrutura-do-projeto)
- [Arquitetura utilizada](#arquitetura-utilizada)
- [Filosofia de Providers](#filosofia-de-providers)
- [Regra de desacoplamento domínio ↔ infraestrutura](#regra-de-desacoplamento-domínio--infraestrutura)
- [Domain Events](#domain-events)
- [Pré-requisitos](#pré-requisitos)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Como rodar o Backend](#como-rodar-o-backend)
- [Como rodar o Frontend](#como-rodar-o-frontend)
- [API de autenticação](#api-de-autenticação)

---

## Estrutura do projeto

Monorepo com workspaces do npm:

```
noryth/
├── apps/
│   ├── api/                 # Backend NestJS
│   │   └── src/
│   │       ├── modules/     # Domínio (auth, users, …)
│   │       │   ├── auth/
│   │       │   └── users/
│   │       └── shared/
│   │           ├── config/          # Configuração tipada + database
│   │           ├── providers/       # PORTS das tecnologias externas
│   │           │   ├── queue/
│   │           │   ├── ai/
│   │           │   ├── image-generation/
│   │           │   ├── storage/
│   │           │   ├── realtime/
│   │           │   └── cache/
│   │           ├── events/          # Infra de Domain Events
│   │           ├── abstractions/    # BaseEntity, …
│   │           ├── decorators/      # @CurrentUser, @Public
│   │           ├── guards/          # JwtAuthGuard
│   │           ├── interceptors/    # LoggingInterceptor
│   │           ├── filters/         # AllExceptionsFilter
│   │           └── utils/           # hash, …
│   └── web/                 # Frontend React (Create React App)
│       └── src/
│           ├── assets/
│           ├── components/  # UI reutilizável (só consome o Theme)
│           ├── contexts/    # AuthProvider
│           ├── hooks/       # useAuth, useThemeMode, …
│           ├── layouts/     # AuthLayout, AppLayout
│           ├── pages/       # Login, Register, Dashboard
│           ├── routes/      # Guards + tabela de rotas
│           ├── services/    # Cliente Axios único + serviços
│           ├── store/       # Redux Toolkit + Persist (auth, theme, ui)
│           ├── styles/
│           ├── theme/       # Design Tokens + temas claro/escuro
│           ├── types/
│           └── utils/       # Schemas Zod, …
├── docs/
│   └── architecture.md
└── README.md
```

---

## Arquitetura utilizada

O Noryth segue cinco princípios (detalhados em [`docs/architecture.md`](docs/architecture.md)):

- **Ports and Adapters (Hexagonal)** — o domínio define *ports* (interfaces); a
  infraestrutura fornece *adapters* (implementações).
- **Provider Pattern** — toda tecnologia externa vive atrás de um Provider.
- **Dependency Injection** — dependências entram pelo container do NestJS.
- **Domain Events** — mudanças relevantes são publicadas como eventos.
- **DDD Light** — entidades + serviços de aplicação, sem excesso cerimonial.

No frontend, o mesmo espírito de desacoplamento aparece: nenhuma tela chama
`fetch` diretamente (tudo passa pelo cliente Axios) e nenhum componente usa CSS
hardcoded (tudo consome os Design Tokens via `styled-components`).

---

## Filosofia de Providers

Módulos de domínio **nunca** conhecem uma biblioteca externa. Eles dependem de
um *port* (interface + token de injeção); a implementação concreta é ligada ao
token no `ProvidersModule`.

```
CharacterModule  ──►  QueueProvider (port)  ──►  BullMQQueueProvider (adapter)
```

Ports já criados (somente interfaces nesta história):

| Provider                  | Adapter futuro | Token                       |
| ------------------------- | -------------- | --------------------------- |
| `QueueProvider`           | BullMQ         | `QUEUE_PROVIDER`            |
| `AITextProvider`          | OpenAI         | `AI_TEXT_PROVIDER`          |
| `ImageGenerationProvider` | OpenAI/SDXL    | `IMAGE_GENERATION_PROVIDER` |
| `StorageProvider`         | S3/MinIO       | `STORAGE_PROVIDER`          |
| `RealtimeProvider`        | Socket.IO      | `REALTIME_PROVIDER`         |
| `CacheProvider`           | Redis          | `CACHE_PROVIDER`            |

As implementações concretas chegam em histórias futuras — aqui só existem os
contratos.

---

## Regra de desacoplamento domínio ↔ infraestrutura

> **Nenhum módulo de domínio pode importar uma biblioteca externa.**

Proibido dentro de `modules/**`: `BullMQ`, `Socket.IO`, `Redis`, `OpenAI`,
`AWS`, `MinIO`, `S3`, `Axios` — ou qualquer SDK concreto.

Exemplo correto:

```
CharacterModule ──► QueueProvider
```

Exemplo proibido:

```
CharacterModule ──► BullMQ
```

Até a persistência segue a regra: `UsersService` depende de `UsersRepository`
(port), não do `Repository` do TypeORM diretamente — o adapter TypeORM é o único
lugar que conhece o ORM.

---

## Domain Events

`shared/events` fornece a fundação:

- `DomainEvent` — classe base imutável de um evento.
- `EventDispatcher` — *port* para publicar eventos (`EVENT_DISPATCHER`).
- `InMemoryEventDispatcher` — adapter padrão sobre o `EventEmitter2` do Nest.

Nenhum evento concreto (`CharacterCreated`, `MapGenerated`, …) existe ainda —
apenas a infraestrutura por onde eles fluirão.

---

## Pré-requisitos

- **Node.js** ≥ 20
- **PostgreSQL** ≥ 14 em execução

Instale as dependências de todo o monorepo a partir da raiz:

```bash
npm install
```

---

## Variáveis de ambiente

### Backend (`apps/api/.env`)

Copie o exemplo e ajuste:

```bash
cp apps/api/.env.example apps/api/.env
```

| Variável               | Descrição                                             | Exemplo                 |
| ---------------------- | ----------------------------------------------------- | ----------------------- |
| `NODE_ENV`             | Ambiente de execução                                  | `development`           |
| `PORT`                 | Porta da API                                          | `3333`                  |
| `DATABASE_HOST`        | Host do PostgreSQL                                    | `localhost`             |
| `DATABASE_PORT`        | Porta do PostgreSQL                                   | `5432`                  |
| `DATABASE_USER`        | Usuário do banco                                      | `noryth`                |
| `DATABASE_PASSWORD`    | Senha do banco                                        | `noryth`                |
| `DATABASE_NAME`        | Nome do banco                                         | `noryth`                |
| `JWT_SECRET`           | Segredo de assinatura do JWT                          | `change-me`             |
| `JWT_EXPIRES_IN`       | Validade do token                                     | `7d`                    |
| `WEB_ORIGIN`           | Origem liberada no CORS (frontend)                    | `http://localhost:3000` |

> **`synchronize` está permanentemente desligado.** O schema evolui
> **exclusivamente por migrations** — ver a seção
> [Migrations](#migrations-banco-de-dados).

### Frontend (`apps/web/.env`)

```bash
cp apps/web/.env.example apps/web/.env
```

| Variável             | Descrição                | Exemplo                      |
| -------------------- | ------------------------ | ---------------------------- |
| `REACT_APP_API_URL`  | URL base da API          | `http://localhost:3333/api`  |

---

## Design System — "O Livro do Mestre"

Toda a UI nasce de um Design System centralizado em
[`apps/web/src/components/ui`](apps/web/src/components/ui). A identidade é a de
um **caderno de campanha / grimório**: pergaminho, couro, bronze de vela e tinta
— elegante, minimalista, premium; **nunca** um painel administrativo nem um
videogame medieval.

**Regras**

- **Design Tokens são a única fonte da verdade** (`theme/tokens.ts` + `theme/themes.ts`):
  `colors`, `spacing`, `radius`, `typography`, `shadow`, `opacity`, `transitions`,
  `zIndex`. Nenhum componente usa cor/valor hardcoded — tudo consome o `theme`.
- **Mobile First**, sempre. Alvos de toque ≥ 44–48px, sem scroll horizontal,
  breakpoints a partir de 360px. Desktop é adaptação, nunca o contrário.
- **Importe do barrel:** `import { Button, Card, Modal } from '../components/ui'`.
- **Sub-identidade por módulo:** `withModuleAccent(theme, 'atlas' | 'heraldry' | 'sheet' | 'arcane')`
  troca só `primary`/`accent` via `ThemeProvider` aninhado — mapas puxam para
  verdigris, facções para heráldica, etc., mantendo a mesma linguagem base.

**Componentes disponíveis**

Ações — `Button`, `IconButton` · Formulário — `FormField`, `Input`, `Textarea`,
`Select`, `Checkbox`, `Switch` · Superfícies — `Card`, `Section`,
`PageContainer`, `Header`, `Divider`, `Badge`, `Avatar`, `EmptyState` ·
Feedback — `Alert`, `Toast`/`useToast`, `Spinner`, `Loading`, `Skeleton`,
`Tooltip` · Overlays/nav — `Modal`, `Drawer`, `Dropdown`, `Tabs`, `Accordion`.

Duas famílias tipográficas de leitura + display: **Cinzel** (títulos gravados),
**EB Garamond** (headings/citações) e **Inter** (conteúdo/UI).

---

## Rodar tudo de uma vez

A partir da raiz, sobe backend e frontend simultaneamente (logs prefixados por
`api`/`web`, e `Ctrl+C` derruba os dois juntos):

```bash
npm run dev
```

> Requer o PostgreSQL no ar para a API iniciar (ela aplica as migrations no boot).

## Como rodar o Backend

```bash
# a partir da raiz do monorepo
npm run api:dev
# ou dentro de apps/api
npm run start:dev
```

A API sobe em `http://localhost:3333/api`. No boot, as **migrations pendentes
são aplicadas automaticamente** (`migrationsRun: true`) — o banco precisa estar
no ar e a role de conexão precisa poder criar a extensão `uuid-ossp` (a migration
inicial faz `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`).

### Migrations (banco de dados)

O schema é gerenciado **100% por migrations** — `synchronize` nunca é usado, em
nenhum ambiente. Os arquivos ficam em `apps/api/src/migrations/`.

| Comando (dentro de `apps/api`)                      | O que faz                                                             |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| `npm run migration:run`                             | Aplica as migrations pendentes.                                      |
| `npm run migration:revert`                          | Desfaz a última migration aplicada.                                  |
| `npm run migration:generate -- src/migrations/Nome` | Gera uma migration a partir do diff entidades × banco (**exige DB**).|
| `npm run migration:create -- src/migrations/Nome`   | Cria uma migration vazia para escrever à mão (não exige DB).         |

A migration inicial já incluída — `CreateUsersTable` — cria a tabela `users`
(uuid + timestamps de auditoria + índice único de e-mail). Como as migrations
rodam no boot, normalmente basta subir a API; use `migration:run` quando quiser
aplicá-las manualmente sem iniciar o servidor.

---

## Como rodar o Frontend

```bash
# a partir da raiz do monorepo
npm run web:dev
# ou dentro de apps/web
npm start
```

A aplicação abre em `http://localhost:3000`.

- Sem autenticação → redireciona para `/login`.
- Autenticado → redireciona para `/dashboard`.
- Tema claro/escuro alternável e **persistido**; sem preferência salva, usa a
  do sistema operacional.

---

## API de autenticação

Prefixo global: `/api`.

### `POST /api/auth/register`

```json
{ "name": "Patrick", "email": "patrick@email.com", "password": "12345678" }
```

Resposta:

```json
{
  "accessToken": "…",
  "user": { "id": "…", "name": "Patrick", "email": "patrick@email.com" }
}
```

### `POST /api/auth/login`

```json
{ "email": "patrick@email.com", "password": "12345678" }
```

Resposta: igual ao register.

### `GET /api/auth/me` *(protegida)*

Header: `Authorization: Bearer <accessToken>`

```json
{ "id": "…", "name": "Patrick", "email": "patrick@email.com" }
```

> O `passwordHash` **nunca** é retornado — a API expõe apenas `id`, `name` e
> `email` do usuário.
