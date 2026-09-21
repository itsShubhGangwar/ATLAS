# ATLAS — API Engineering Workbench

ATLAS is a production-style API engineering workbench inspired by the core architectural philosophy of HELIOS, built on the modern MERN stack with deterministic analysis and governance engines (without AI).

## ATLAS Architecture

The core processing pipeline designed for ATLAS:

```text
       OpenAPI YAML/JSON (v2.0, v3.0, v3.1)
                        ↓
                 OpenAPI Parser
                        ↓
        Canonical API Model (Single Source of Truth)
     ┌──────────────┬──────────────┬──────────────┐
     ↓              ↓              ↓              ↓
 Knowledge     Governance       API Diff      TypeScript
   Graph         Engine          Engine      SDK Generator
(React Flow)  (Deterministic)  (AST Drift)   (Type-Safe)
```

The **Canonical API Model** serves as the single source of truth across all modules. Every downstream capability consumes `CanonicalApiModel` directly:
- The **Knowledge Graph Builder** derives nodes, edges, and topologies purely from the model.
- The **Governance Engine** evaluates security, compliance, and best-practice rules deterministically.
- The **API Diff Engine** compares two versions of canonical models to detect contract drift and breaking changes.
- The **TypeScript SDK Generator** synthesizes type-safe, zero-dependency client libraries.

---

## Directory Structure

```text
ATLAS/
│
├── client/                     # React + Vite + TypeScript Frontend
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── graph/          # React Flow custom nodes (Spec, Endpoint, Schema, Security, Tag) & Inspector
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── hooks/              # Custom React hooks
│   │   ├── pages/              # Views (Overview, Explorer, Graph, Governance, Diff, SDK, Settings)
│   │   ├── services/           # API communication layer (Health, Specs, Graph, Governance, Diff, SDK)
│   │   ├── types/              # TypeScript client definitions & AST types
│   │   ├── App.tsx             # Main shell layout and state manager
│   │   ├── index.css           # Tailwind CSS directives and theme styling
│   │   └── main.tsx            # React application entry point
│   ├── index.html              # HTML shell
│   ├── package.json            # Client dependencies and Vite scripts
│   ├── postcss.config.js       # PostCSS configuration
│   ├── tailwind.config.js      # Tailwind theme configuration
│   ├── tsconfig.json           # Frontend TypeScript compiler settings
│   └── vite.config.ts          # Vite build config with /api proxy to port 5000
│
├── server/                     # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/             # Environment and MongoDB connection manager (db.ts)
│   │   ├── controllers/        # Express route controllers (health, specs, graph, governance, diff, sdk)
│   │   ├── middleware/         # Middleware for validation, error handling, auth
│   │   ├── models/             # Mongoose database models (Project, Version, Spec)
│   │   ├── routes/             # Express API routers (health, specs, graph, governance, diff, sdk)
│   │   ├── services/           # Core domain engines
│   │   │   ├── parser/         # Ingests & converts OpenAPI specs into Canonical Model
│   │   │   │   ├── __tests__/  # Parser unit tests (8 test cases)
│   │   │   │   └── fixtures/   # sample-openapi.yaml test fixture
│   │   │   ├── graph/          # Knowledge Graph engine (Phase 3)
│   │   │   │   ├── __tests__/  # Graph Builder unit tests (15 test cases)
│   │   │   │   ├── graph.builder.ts
│   │   │   │   ├── graph.service.ts
│   │   │   │   └── graph.types.ts
│   │   │   ├── governance/     # Deterministic security & governance engine (Phase 4)
│   │   │   │   ├── __tests__/  # Governance rule tests (10 test cases)
│   │   │   │   ├── governance.rules.ts
│   │   │   │   ├── governance.engine.ts
│   │   │   │   ├── governance.service.ts
│   │   │   │   └── governance.types.ts
│   │   │   ├── diff/           # API contract diff & breaking change engine (Phase 4)
│   │   │   │   ├── __tests__/  # Diff engine tests (10 test cases)
│   │   │   │   ├── fixtures/   # sample-openapi-v2.yaml fixture
│   │   │   │   ├── diff.engine.ts
│   │   │   │   ├── diff.service.ts
│   │   │   │   └── diff.types.ts
│   │   │   └── sdk/            # TypeScript SDK generator (Phase 4)
│   │   │       ├── __tests__/  # SDK generator tests (6 test cases)
│   │   │       ├── typescript.generator.ts
│   │   │       ├── sdk.service.ts
│   │   │       └── sdk.types.ts
│   │   ├── types/              # TypeScript backend interfaces & canonical contracts
│   │   ├── utils/              # Shared backend utility functions
│   │   └── server.ts           # Express HTTP server bootstrap & route mounting
│   ├── .env                    # Active backend environment variables
│   ├── .env.example            # Environment template
│   ├── package.json            # Backend dependencies and execution scripts
│   └── tsconfig.json           # Backend TypeScript compiler settings
│
├── .gitignore                  # Git ignore rules
├── package.json                # Root workspace orchestration scripts
└── README.md                   # Project documentation
```

---

## Phase 4 — API Intelligence Capabilities

### 1. Security & Governance Rule Engine
- **Deterministic Rules (Zero AI)**:
  1. `gov-public-endpoint`: Flags endpoints missing security requirements.
  2. `gov-missing-operation-id`: Detects endpoints without explicit `operationId`.
  3. `gov-missing-response-description`: Ensures all HTTP responses document their intent.
  4. `gov-unbounded-pagination`: Flags `limit`/`pageSize` parameters without `maximum` constraints.
  5. `gov-sensitive-fields`: Scans schemas for unmasked sensitive fields (`password`, `secret`, `token`, `api_key`, `ssn`, `private_key`).
  6. `gov-http-basic-auth`: Detects insecure plain HTTP Basic authentication schemes.
  7. `gov-missing-api-metadata`: Validates presence and quality of title, description, and semantic version.
  8. `gov-empty-schema-description`: Detects schemas missing descriptive documentation.
- **Score (0–100)**: Transparent deductions based on severity:
  - Critical: -25 pts
  - High: -15 pts
  - Medium: -8 pts
  - Low: -3 pts
  - Info: 0 pts
- **API Endpoint**: `POST /api/governance/analyze` (accepts `{ canonicalModel }`, `{ spec }`, or uploaded file).

### 2. API Diff & Breaking Change Engine
- **AST Comparison**: Compares base (`v1`) and new (`v2`) `CanonicalApiModel` representations.
- **Change Classifications**:
  - **Breaking**: Endpoint removal, required parameter additions, property removals or type modifications, response code removals, security scheme removals.
  - **Non-Breaking**: Endpoint additions, optional parameter additions, optional property additions, new responses, new security schemes.
  - **Info**: Metadata modifications (title, version, description, summaries).
- **API Endpoint**: `POST /api/diff/compare` (accepts `{ baseModel, newModel }`, `{ baseSpec, newSpec }`, or multipart file uploads).

### 3. TypeScript SDK Generator
- **Type-Safe Code Synthesis**:
  - `types.ts`: TypeScript interfaces for all schemas, request bodies, and query/path/header parameters.
  - `client.ts`: Standalone, zero-dependency `fetch`-based HTTP client class with path parameter interpolation, query parameter encoding, Bearer & header auth, and custom error handling (`ApiClientError`).
  - `index.ts`: Unified export module for seamless import in consumer applications.
- **API Endpoint**: `POST /api/sdk/typescript` (accepts `{ canonicalModel, options }` or `{ spec, options }`).

---

## Running ATLAS Locally

### 1. Install Dependencies
From the project root:
```bash
npm run install:all
```

### 2. Run Backend Unit & Integration Tests (All 8 Test Suites)
```bash
cd server
npm test
```
Executes **82 automated tests** across Parser, Graph, Governance, Diff, SDK, Auth, Project Management, and Full E2E Integration test suites.

### 3. Start Frontend and Backend
From the project root:
```bash
npm run dev
```
- Backend runs at: `http://localhost:5000`
- Frontend runs at: `http://localhost:5173`

---

## Phase 5 — Productization & Persistence

ATLAS includes full stateful multi-project persistence, contract versioning, and user-isolated workspaces:
- **Authentication & Security**: User registration and login using salted `bcryptjs` passwords and signed JWT tokens with 7-day expiration. Complete user data isolation where non-owners cannot view or mutate other users' projects or versions.
- **Contract Versioning**: Every uploaded OpenAPI specification parses into a strongly typed `CanonicalApiModel` persisted in MongoDB alongside spec metadata and schema counts.
- **Saved Analysis**: Governance audits and Diff comparisons are computed directly against persisted canonical models (zero reparsing) and stored for historical audit trails.
- **Dashboard Metrics**: Real-time aggregated portfolio statistics (total projects, total versions, total endpoints, schemas count, recent governance score, and recent audit activity).

---

## Complete API Endpoints Reference

### Authentication
| Method | Path | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account & return JWT | No |
| `POST` | `/api/auth/login` | Authenticate user & return JWT | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes (Bearer) |

### Projects & Versions
| Method | Path | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/projects` | List projects owned by current user | Yes (Bearer) |
| `POST` | `/api/projects` | Create a new project workspace | Yes (Bearer) |
| `GET` | `/api/projects/:id` | Get project details by ID | Yes (Bearer) |
| `PATCH` | `/api/projects/:id` | Update project name / description | Yes (Bearer) |
| `DELETE` | `/api/projects/:id` | Cascade delete project and all versions/reports | Yes (Bearer) |
| `GET` | `/api/projects/:id/versions` | List version summaries for a project | Yes (Bearer) |
| `POST` | `/api/projects/:id/versions` | Upload & parse spec into a new ApiVersion | Yes (Bearer) |
| `GET` | `/api/projects/:id/versions/:vId` | Get full ApiVersion details + CanonicalModel | Yes (Bearer) |
| `DELETE` | `/api/projects/:id/versions/:vId` | Delete a single API version | Yes (Bearer) |
| `POST` | `/api/projects/:id/versions/:vId/governance` | Run & save governance report on version | Yes (Bearer) |
| `GET` | `/api/projects/:id/versions/:vId/governance` | Get latest saved governance report | Yes (Bearer) |
| `POST` | `/api/projects/:id/diff` | Compare two persisted versions & save report | Yes (Bearer) |
| `GET` | `/api/projects/:id/diff` | List saved diff reports for project | Yes (Bearer) |
| `GET` | `/api/projects/dashboard/metrics` | Retrieve aggregated portfolio metrics | Yes (Bearer) |

### Standalone Intelligence Engines (Phases 2–4)
| Method | Path | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | Service uptime and subsystem health probe | No |
| `POST` | `/api/specs/parse` | Parses OpenAPI YAML/JSON into Canonical API Model | No |
| `POST` | `/api/graph/build` | Generates graph nodes, edges, and layout stats | No |
| `POST` | `/api/governance/analyze` | Executes 8 governance rules & generates score | No |
| `POST` | `/api/diff/compare` | Compares two specifications & flags breaking changes | No |
| `POST` | `/api/sdk/typescript` | Synthesizes 3-file TypeScript client SDK | No |