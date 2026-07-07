# Arquitetura do Noryth

Este documento descreve as decisões arquiteturais que sustentam o projeto e
que devem ser respeitadas por todas as histórias futuras.

## Princípios

O Noryth é construído sobre cinco pilares:

- **Ports and Adapters (Hexagonal Architecture)** — o domínio expõe *ports*
  (interfaces) e a infraestrutura fornece *adapters* (implementações).
- **Provider Pattern** — toda tecnologia externa é acessada por trás de um
  Provider abstrato.
- **Dependency Injection** — os módulos recebem suas dependências pelo container
  do NestJS, nunca as instanciam diretamente.
- **Domain Events** — mudanças relevantes de domínio são publicadas como eventos.
- **DDD Light** — modelamos o domínio com entidades e serviços de aplicação, sem
  o peso completo de DDD tático.

## Regra de ouro: desacoplamento domínio ↔ infraestrutura

> Nenhum módulo de domínio pode conhecer uma biblioteca externa.

Proibido dentro dos módulos de domínio: `BullMQ`, `Socket.IO`, `Redis`,
`OpenAI`, `AWS`, `MinIO`, `S3`, `Axios` — ou qualquer SDK concreto.

Toda integração passa por um Provider:

```
CharacterModule  ──►  QueueProvider (port)  ──►  BullMQQueueProvider (adapter)
```

Nunca:

```
CharacterModule  ──►  BullMQ
```

Os *ports* vivem em `shared/providers/**/<provider>.provider.ts` como interfaces
mais um `InjectionToken`. Os *adapters* concretos serão criados em histórias
futuras e registrados no container — os módulos de domínio dependem apenas do
token, jamais da implementação.

## Providers previstos

| Provider                  | Responsabilidade                          | Adapter futuro |
| ------------------------- | ----------------------------------------- | -------------- |
| `QueueProvider`           | Enfileiramento de jobs assíncronos        | BullMQ         |
| `AITextProvider`          | Geração de texto por IA                   | OpenAI         |
| `ImageGenerationProvider` | Geração de imagens                        | OpenAI / SDXL  |
| `StorageProvider`         | Armazenamento de arquivos                 | S3 / MinIO     |
| `RealtimeProvider`        | Comunicação em tempo real                 | Socket.IO      |
| `CacheProvider`           | Cache de dados                            | Redis          |

Nesta história apenas as **interfaces** existem — sem implementação.

## Domain Events

`shared/events` fornece a infraestrutura:

- `DomainEvent` — classe base de um evento de domínio.
- `EventDispatcher` — port para publicar eventos.
- `InMemoryEventDispatcher` — adapter simples baseado no `EventEmitter2` do Nest.

Eventos concretos (`CharacterCreated`, `MapGenerated`, …) serão adicionados nas
próximas histórias. Aqui só existe a fundação.

## Estrutura de camadas (backend)

```
modules/            # domínio + aplicação (auth, users, …)
shared/
  config/           # configuração tipada e validada
  providers/        # PORTS das tecnologias externas
  events/           # infraestrutura de Domain Events
  abstractions/     # blocos base (BaseEntity, tokens, …)
  decorators/       # @CurrentUser, @Public, …
  guards/           # JwtAuthGuard
  interceptors/     # serialização / logging
  filters/          # tratamento global de exceções
  utils/            # utilitários puros
```
