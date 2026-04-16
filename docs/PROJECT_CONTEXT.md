# 📋 Gallery — Contexto do Projeto

> **Última atualização**: 16 de Abril de 2026
> **Repositório**: gallery (relampago29/gallery)
> **Domínio**: momentos.work

---

## 🏗 Tech Stack

| Camada            | Tecnologia                                                                              |
| ----------------- | --------------------------------------------------------------------------------------- |
| **Framework**     | Next.js 15.4 (App Router, Turbopack dev)                                                |
| **Linguagem**     | TypeScript 5 (strict)                                                                   |
| **UI**            | React 19.1, Tailwind CSS 4 + DaisyUI 5, Framer Motion, GSAP, OGL                        |
| **i18n**          | `next-intl` 4.3 (locales: `pt`, `en`; default: `pt`; prefixo: `always`)                 |
| **Backend**       | Next.js API Routes + Firebase Cloud Functions v2 (Node 20, `europe-west1`)              |
| **Base de Dados** | Cloud Firestore                                                                         |
| **Armazenamento** | Firebase Storage (masters → variants pipeline)                                          |
| **Autenticação**  | Firebase Auth (anónimo para público; claim `admin` para administradores)                |
| **Email**         | Resend SDK                                                                              |
| **Testes**        | Vitest + Testing Library + jsdom                                                        |
| **Deploy**        | Vercel (com `maxDuration: 60` para rotas de upload) + Firebase Hosting (`europe-west1`) |

---

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── layout.tsx              # Root HTML (Geist fonts, dark theme)
│   ├── middleware.ts           # i18n routing + auth redirects
│   ├── [locale]/
│   │   ├── layout.tsx          # NextIntlClientProvider + CartProvider
│   │   ├── page.tsx            # Home
│   │   ├── admin/              # Painel de administração
│   │   ├── dashboard/          # Dashboard do utilizador
│   │   ├── events/             # Eventos públicos + detalhe + encomendas
│   │   ├── sessions/           # Sessões privadas + detalhe + encomendas
│   │   ├── portofolio/         # Portfólio público
│   │   ├── login/              # Login
│   │   └── verify-pending/     # Verificação de email pendente
│   └── api/                    # 17 grupos de API routes
├── components/                 # admin, cart, hero, highlights, portfolio, sessions, shared, storage, ui
├── lib/
│   ├── firebase/
│   │   ├── admin.ts            # Admin SDK singleton (Auth, Firestore, Storage, Bucket)
│   │   ├── client.ts           # Client SDK (session persistence, suporte emulador)
│   │   ├── ensureAuth.ts       # Helper de auth anónimo
│   │   └── sessionExpiry.ts
│   ├── publicPhotos.ts         # Upload e gestão de fotos públicas
│   ├── categories.ts           # Gestão de categorias
│   ├── highlights.ts           # Gestão de destaques
│   ├── compressImage.ts        # Compressão client-side
│   ├── sessions/               # Lógica de sessões
│   ├── admin/                  # Lógica admin
│   ├── emails/                 # Templates de email (Resend)
│   └── utils/                  # Utilitários
├── i18n/                       # routing, request, navigation, provider
├── locales/pt/, en/            # Ficheiros de tradução (common.json)
├── styles/globals.css
functions/                      # Firebase Cloud Functions (pacote separado)
```

---

## 🔑 Páginas Admin

| Caminho               | Propósito                         |
| --------------------- | --------------------------------- |
| `admin/`              | Dashboard admin                   |
| `admin/public/list`   | Listar fotos do portfólio público |
| `admin/public/upload` | Upload de fotos para portfólio    |
| `admin/categories/`   | Gerir categorias                  |
| `admin/events/`       | Gerir eventos                     |
| `admin/sessions/`     | Gerir sessões privadas            |
| `admin/highlights/`   | Gerir destaques                   |
| `admin/trail/`        | Gerir imagens de trail            |
| `admin/agenda/`       | Calendário/agenda                 |
| `admin/users/`        | Gestão de utilizadores            |
| `admin/payments/`     | Gestão de pagamentos              |
| `admin/settings/`     | Configurações do site             |

---

## 🌐 API Routes (`src/app/api/`)

| Rota              | Propósito                                       |
| ----------------- | ----------------------------------------------- |
| `admin/`          | Operações exclusivas de admin                   |
| `auth/`           | Endpoints de autenticação                       |
| `upload/`         | Upload de fotos (timeout Vercel 60s)            |
| `public-photos/`  | CRUD de fotos públicas                          |
| `categories/`     | Gestão de categorias                            |
| `highlights/`     | Gestão de destaques                             |
| `events/`         | Gestão de eventos                               |
| `events/upload/`  | Upload de fotos de eventos (timeout Vercel 60s) |
| `event-orders/`   | Encomendas de fotos de eventos                  |
| `session-photos/` | Fotos de sessões privadas                       |
| `session-orders/` | Encomendas de fotos de sessões                  |
| `trail-images/`   | Gestão de imagens trail                         |
| `agenda/`         | Dados do calendário                             |
| `contact/`        | Formulário de contacto (Resend)                 |
| `metrics/`        | Analytics/métricas                              |
| `settings/`       | API de configurações                            |
| `storage/`        | Utilitários de storage                          |
| `users/`          | Gestão de utilizadores                          |

---

## 🔥 Firebase Services

### Firestore Collections

| Collection              | Acesso                                                  |
| ----------------------- | ------------------------------------------------------- |
| `public_photos`         | Leitura pública (published=true), escrita via Admin SDK |
| `categories`            | Leitura aberta                                          |
| `highlights`            | Leitura aberta                                          |
| `events` + sub `photos` | Eventos published legíveis                              |
| `event_orders`          | Legível pelo utilizador dono                            |
| `sessions` + `photos/`  | Totalmente bloqueado (acesso só via Admin SDK)          |

> **Decisão arquitectural**: Zero escritas do cliente — todas as mutações vão via API Routes → Admin SDK.

### Storage Paths

| Caminho                                                                                            | Leitura    | Escrita                   |
| -------------------------------------------------------------------------------------------------- | ---------- | ------------------------- |
| `masters/public/`, `masters/highlights/`, `masters/sessions/`, `masters/trail/`, `masters/events/` | ❌         | Admin                     |
| `categories/`                                                                                      | ✅ Público | Admin                     |
| `variants/public/`, `variants/events/`                                                             | ✅ Público | ❌ (gerado por Functions) |
| `variants/sessions/`                                                                               | ❌         | ❌                        |

### Cloud Functions (6 funções, v2, europe-west1, 540s timeout, 1GiB RAM)

1. **`onPublicMasterUpload`** — Storage trigger: gera variantes JPG/WebP/AVIF a 640/960/1600px, atualiza Firestore
2. **`onPublicPhotoDeleted`** — Firestore trigger: limpa storage ao apagar foto
3. **`onEventMasterUpload`** — Storage trigger: gera variantes para fotos de eventos
4. **`onEventPhotoDeleted`** — Firestore trigger: limpa storage de eventos
5. **`downloadSessionOrderZip`** — HTTP: stream de ZIP com fotos de encomenda de sessão
6. **`downloadEventOrderZip`** — HTTP: stream de ZIP com fotos de encomenda de evento

**Processamento de imagem**: sharp (JPG quality 82, WebP quality 82, AVIF quality 60)

---

## 📸 Pipeline de Upload de Fotos Públicas

### Fluxo (corrigido em Abril 2026)

```
1. Cliente seleciona ficheiros
2. API POST /api/public-photos/create → cria doc Firestore (status: "processing")
3. Upload do ficheiro para Firebase Storage (masters/public/{photoId}.{ext})
4. Storage trigger dispara Cloud Function onPublicMasterUpload
5. Function encontra o doc por masterPath query
6. Function gera 9 variantes (3 tamanhos × 3 formatos)
7. Function atualiza doc para status: "ready", published: true
```

**Importante**: O documento Firestore é criado **ANTES** do upload para Storage, garantindo que a Cloud Function encontra sempre o documento. A Cloud Function tem try/catch que marca `status: "error"` em caso de falha.

---

## 🔐 Arquitectura de Autenticação

- **Cliente público**: Sign-in anónimo automático (via `ensureAuth.ts`)
- **Admin**: Claim `admin` nos tokens Firebase Auth (definido via `scripts/grant-admin.js`)
- **Servidor**: Todas as escritas Firestore/Storage via Admin SDK — regras Firestore bloqueiam escritas do cliente
- **Safari fix**: Proxy custom no middleware para evitar problemas cross-origin com `identitytoolkit.googleapis.com`

---

## 🌍 i18n

- **Biblioteca**: `next-intl` v4
- **Locales**: `pt` (default), `en`
- **Prefixo**: `always` (URLs sempre incluem locale: `/pt/...`, `/en/...`)
- **Middleware**: Intercepta todas as rotas não-API, não-estáticas
- **Mensagens**: Um ficheiro `common.json` por locale

---

## 🚀 Deploy

### Vercel (`vercel.json`)

- Rotas de upload com `maxDuration: 60` segundos
- Deploy standard Next.js

### Firebase (`firebase.json`)

- Hosting com frameworksBackend em `europe-west1`
- Emuladores: Functions (5001), Firestore (8080), Storage (9199)

---

## ⚙️ Variáveis de Ambiente

### Servidor (Admin SDK)

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`
- `FIREBASE_STORAGE_BUCKET`
- `GOOGLE_APPLICATION_CREDENTIALS` ou `FIREBASE_SERVICE_ACCOUNT_BASE64`
- `RESEND_API_KEY`

### Cliente

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_USE_EMULATORS` (boolean)

---

## ⚠️ Notas e Observações

1. **Typo no diretório**: `portofolio` (falta um 'l' — deveria ser `portfolio`)
2. **Service account JSON** no root do repo — não deve ser committed em version control (adicionar ao `.gitignore`)
3. **`revalidate = 0`** no layout do locale desactiva ISR globalmente — pode impactar performance em produção
4. **Sem ficheiro `.env.example`** — novos developers não têm referência das env vars necessárias

---

## 🐛 Bugs Corrigidos (Abril 2026)

### Race Condition no Upload de Fotos Públicas

**Problema**: O ficheiro era enviado para Storage **antes** do documento Firestore ser criado. A Cloud Function disparava imediatamente, não encontrava o documento, e criava um segundo documento como fallback. O documento original ficava preso em `"processing"` para sempre.

**Correção**:

1. Invertida a ordem: documento Firestore criado antes do upload para Storage
2. `photoId` usado como ID do documento (em vez de auto-ID) para que o fallback funcione
3. Adicionado try/catch na Cloud Function que marca `status: "error"` em caso de falha

**Ficheiros alterados**:

- `src/lib/publicPhotos.ts` — ordem invertida
- `src/app/api/public-photos/create/route.ts` — aceita `photoId` como ID do documento
- `functions/src/index.ts` — try/catch + `markError()`
