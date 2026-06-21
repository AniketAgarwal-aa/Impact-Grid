# ImpactGrid (ImpactSensei v5.1) - Exhaustive Project Documentation

> [!IMPORTANT]
> This is the ultimate, literal reverse-engineering documentation for the ImpactGrid repository. It leaves no calculation, variable, or structure behind. Use this as your primary reference for onboarding, auditing, or extending the codebase. It reflects the latest updates including the Resend API migration and v5.1 enterprise tables.

---

## 1. CORE PURPOSE & CHOSEN TECH STACK

### Core Purpose
ImpactGrid (codenamed ImpactSensei v5.1) is an enterprise impact prediction platform. It solves "scope creep" by mathematically quantifying the downstream consequences of changing project requirements. When a user requests a change (e.g., adding a feature, refactoring a module), the system calculates exactly how that single change ripples through the project's **Cost**, **Time**, **Effort**, and **Risk** metrics, preventing uncalculated project bloat by enforcing a quantitative approval workflow.

### Complete Chosen Tech Stack
**Frontend Ecosystem (Presentation & State):**
- **React 18 & Vite**: Core SPA framework and HMR build tool.
- **TypeScript**: Enforces strict typing (`src/types/`).
- **TailwindCSS**: Utility-first CSS (`tailwind.config.ts`).
- **Radix UI**: Headless accessible primitives (e.g., `@radix-ui/react-dialog`, `@radix-ui/react-tabs`).
- **Zustand**: Global state management (`authStore.ts`, `currencyStore.ts`, `themeStore.ts`, `notificationStore.ts`).
- **TanStack React Query**: Asynchronous server-state management.
- **React Hook Form & Zod**: Schema-based form validation.
- **Recharts**: Data visualization for matrix grids.
- **Lucide React**: Iconography.

**Backend Ecosystem (Logic & Persistence):**
- **Python 3.x & FastAPI (v0.104.1)**: Asynchronous REST API framework.
- **Uvicorn**: ASGI web server.
- **SQLAlchemy (v2.0.23)**: Object-Relational Mapper (ORM) defining all models.
- **Alembic (v1.13.0)**: Database migration tool (`alembic.ini`).
- **SQLite (Native) / PostgreSQL Ready** (`psycopg2-binary`): Relational data persistence (`impact_sensei.db`).
- **Pydantic (v2.4.2)**: Request/Response validation (`schemas.py`).
- **Requests (v2.31.0)**: HTTP library for third-party integrations (e.g., Resend API).
- **Passlib & Python-JOSE**: Password hashing (bcrypt) and JWT generation.
- **APScheduler (v3.10.4)**: Background cron jobs (e.g., daily audit log cleanup).
- **WebSockets (v12.0)**: Real-time bidirectional UI updates (`websocket_manager.py`).
- **VaderSentiment (v3.3.2)**: NLP sentiment analysis for analytics.
- **PyOTP / qrcode**: 2FA / TOTP generation.

---

## 2. LITERAL REPOSITORY STRUCTURE & COMPONENT MAP

### Visual Repository Tree
```markdown
impact-sim/
├── backend/
│   ├── app/
│   │   ├── routers/             # API Endpoints (admin, analysis, auth, change_requests, etc.)
│   │   ├── utils/               # Utilities
│   │   │   ├── audit.py         # Appends to AuditLog table
│   │   │   └── email.py         # Resend API logic & terminal fallback
│   │   ├── __init__.py
│   │   ├── auth.py              # JWT generation, verification, and hashing
│   │   ├── calculators.py       # 🧠 The core math engine and static adjacency maps
│   │   ├── constants.py         # Global backend variables
│   │   ├── currency.py          # Live exchange rate fetcher (USD to INR)
│   │   ├── database.py          # SQLAlchemy SessionLocal and Base declarative mapping
│   │   ├── dependencies.py      # FastAPI Depends injected functions (e.g., get_current_user)
│   │   ├── main.py              # Bootstrapper, CORS, IP Whitelisting, Rate Limiter
│   │   ├── models.py            # 📊 All 26+ SQLAlchemy ORM table definitions
│   │   ├── real_ip.py           # Extracts client IP bypassing proxies
│   │   ├── schemas.py           # Pydantic validation models
│   │   └── websocket_manager.py # WebSocket connection pooling class
│   ├── alembic/                 # Alembic migration revisions
│   ├── requirements.txt         # Python dependencies
│   └── impact_sensei.db         # The literal database file
├── src/
│   ├── components/              # UI building blocks
│   ├── constants/               # Frontend variables
│   ├── contexts/                # React Contexts
│   ├── hooks/                   # Custom hooks (e.g., useAuth)
│   ├── pages/                   # Route-level views
│   ├── services/                # API wrappers (`api.ts`, `websocket.ts`)
│   ├── stores/                  # Zustand stores (`authStore.ts`, `currencyStore.ts`)
│   ├── types/                   # TS interfaces
│   ├── utils/                   # Frontend helpers
│   ├── App.tsx                  # React Router mapping
│   ├── index.css                # Tailwind directives
│   └── main.tsx                 # DOM render entry
├── package.json                 # Node dependencies
├── vite.config.ts               # Vite configuration
└── tailwind.config.ts           # Tailwind theme tokens
```

### Component Breakdown
- **`backend/app/main.py`**: The heart of the server. Instantiates FastAPI, runs `init_db()`, hooks up APScheduler for 2 AM audit log cleanup, maps CORS, enforces a 100 req/min in-memory rate limiter, blocks unauthorized IPs (`IpWhitelist`), and mounts all routers.
- **`backend/app/utils/email.py`**: Handles sending emails (verification, approval, reset). Uses `os.getenv` for `RESEND_API_KEY`. If the key exists, it `requests.post()` to `https://api.resend.com/emails`. If missing, it gracefully intercepts and `print()`s the email to the terminal to prevent local dev crashes.
- **`src/stores/`**: Uses Zustand. `authStore.ts` holds JWT tokens and user metadata. `currencyStore.ts` holds conversion rates. `themeStore.ts` manages dark/light modes.

---

## 3. THE CALCULATION ENGINE: EXACT MATH & METRICS (THE "HOW")

This happens inside **`backend/app/calculators.py`**. The engine does *not* recursively traverse a graph (to avoid infinite loops). It uses static adjacency mapping and linear matrix formulas.

### A. Static Base Weights
The engine converts string inputs into mathematical floats:
- **Complexity**: `very_low`: 0.5, `low`: 1, `medium`: 2, `high`: 3, `very_high`: 4
- **Change Type**: `addition`: 1.3, `modification`: 1.0, `removal`: 0.8, `refactor`: 1.1, `optimization`: 0.9
- **Priority**: `low`: 0.8, `medium`: 1.0, `high`: 1.4, `critical`: 1.8, `emergency`: 2.0
- **Stage (Project Lifecycle)**: `early`: 0.7, `mid`: 1.0, `late`: 1.5

### B. Auto-Complexity Assignment (`auto_complexity()`)
If complexity isn't explicitly set, it parses the textual description:
- **`very_low`**: Text contains `"typo"`, `"spelling"`, `"rename"` AND `< 2 modules` affected.
- **`very_high`**: `≥ 5 modules` affected OR (`≥ 3 modules` AND hits `security`, `payment`, `infrastructure`, or `database`).
- **`high`**: `change_type` is `refactor/addition` AND `≥ 3 modules` OR hits critical infrastructure.

### C. The Core Impact Formulas
1. **Base Score Calculation**:
   `Base Score = (Complexity * 0.4) + (ChangeType * 0.25) + (Priority * 0.2) + (Stage * 0.15)`

2. **Module Factor**:
   Retrieves hardcoded complexities for each affected module (e.g., `payment: 1.7`, `database: 1.6`, `frontend: 1.0`).
   `Average Module Weight = sum(weights) / len(weights)`
   `Count Factor = 1 + (len(modules) * 0.1)`
   `Module Factor = Average Module Weight * Count Factor`

3. **Impact Score**:
   `Impact Score = Base Score * Module Factor`

4. **Change Size & Multiplier Mapping**:
   - `Impact Score < 1.5` ➔ Size: `"Small"`, Multiplier: `1.05`
   - `Impact Score < 2.5` ➔ Size: `"Medium"`, Multiplier: `1.15`
   - `Impact Score < 3.5` ➔ Size: `"Large"`, Multiplier: `1.30`
   - `Impact Score >= 3.5` ➔ Size: `"Very Large"`, Multiplier: `1.50`

### D. Detailed Metric Breakdowns (`_detailed_impacts`)

**1. Time Impact (Days)**
- `base_days = 8 * (Complexity Weight / 2)`
- `time_impact = max(1, round(base_days * (multiplier - 1) * (team_size / 5) * 2.0))`
- *Time Breakdown*: 
  - Development: `50% of time_impact`
  - Testing: `25% of time_impact`
  - Deployment: `15% of time_impact`
  - Review: `7% of time_impact`
  - Documentation: `max(1, 3% of time_impact)`

**2. Cost Impact (Currency)**
- `daily_rate = total_budget / timeline_days`
- `cost_labor = time_impact * daily_rate`
- `cost_infra = cost_labor * 0.15` (15% surcharge)
- `cost_third_party = cost_labor * 0.10` (10% surcharge)
- `cost_contingency = cost_labor * 0.20` (If Impact Score > 2.5, else `0.10`)
- `total_cost = cost_labor + cost_infra + cost_third_party + cost_contingency`

**3. Effort Impact (Hours/People)**
- `effort_total = max(1, time_impact * team_size)`
- *Seniority Breakdown*: Senior (`30%`), Mid (`50%`), Junior (`20%`)

**4. Risk Impact (`_detailed_risk`)**
All scores capped at `100`.
- `r_schedule = (impact_score * 15) + (stage * 15)`
- `r_budget = (impact_score * 12) + (priority * 20)`
- `r_quality = (complexity * 15) + (affected_modules_count * 5)`
- `r_security = 60` if modules touch security/auth/payment, else `10 + (impact_score * 5)`
- `r_technical = complexity * 20`
- `overall_risk_score = (r_schedule*0.25) + (r_budget*0.25) + (r_quality*0.20) + (r_security*0.15) + (r_technical*0.15)`
- *Risk Level Map*: `<30` (low), `<60` (medium), `<80` (high), `≥80` (critical).

**5. Dependency Mapping (The "Graph")**
- Uses a static adjacency map (`DEPENDENCY_CHAIN_MAP`): e.g., `authentication ➔ database ➔ api ➔ backend ➔ frontend ➔ reports`.
- The engine iterates through the affected modules, pulls their predefined downstream neighbor, and truncates the chain (`chain[:6]`) to create a literal string like: `"authentication → database → api"` to return to the UI.

---

## 4. DATA ENTITIES & SCHEMAS (`backend/app/models.py`)

The application maps 26+ tables using SQLAlchemy to support Enterprise Multi-Tenancy.

### A. Core Tenant & Project Models
- **`Company`**: `id`, `name`, `slug`, `subscription_tier`, `max_projects`, `max_users`, `max_storage_mb`, `settings` (JSON).
- **`User`**: `company_id` (FK), `email`, `password_hash`, `role` (admin/project_manager/client), `is_verified`.
- **`Project`**: `company_id` (FK), `name`, `team_size` (Int), `budget` (Numeric), `cost_per_day` (Numeric), `initial_duration` (Int), `stage` (Str), `currency` (Str), `start_date`, `end_date`.
- **`ProjectAssignment` / `ProjectClient`**: Junction tables for RBAC mapping.

### B. Requirements & Engine Models
- **`Requirement`**: `project_id` (FK), `title`, `description`, `complexity`, `dependency_level`, `priority`, `estimated_hours`.
- **`RequirementDependency`**: The DAG DB mapping table. `requirement_id` (FK), `depends_on_id` (FK), `dependency_type` (`"blocked_by"`).
- **`ChangeRequest`**: Tracks workflow. `requirement_id` (FK), `change_type`, `priority`, `complexity`, `affected_modules` (Text/JSON), `description`, `status` (`draft`, `analyzed`, `submitted`, `approved`, `rejected`), `approved_by` (FK).
- **`ImpactAnalysis`**: The massive calculation output table. Fields:
  - FK: `change_request_id`
  - Cost metrics (Numeric 15,2): `cost_original`, `cost_new`, `cost_labor`, `cost_infrastructure`, `cost_third_party`, `cost_contingency`, `cost_training`, `cost_documentation`.
  - Time metrics (Int): `time_original`, `time_new`, `time_development`, `time_testing`, `time_deployment`, `time_review`.
  - Risk metrics (Int): `risk_score`, `risk_schedule`, `risk_budget`, `risk_quality`, `risk_security`, `risk_technical`.
  - Quality metrics (Int): `quality_impact`, `performance_impact`, `maintainability_impact`.
  - JSON Blobs: `affected_components`, `recommendations`, `dependency_chain`.

### C. Enterprise v5.1 Tables
- **`AuditLog`**: Logs every action (`user_id`, `action`, `entity_type`, `old_values`, `new_values`).
- **`EmailQueue`**: Stores offline emails for background processing.
- **`WebhookConfig` & `WebhookDelivery`**: Maps outbound Jira/Slack hooks.
- **`TFASecret`**: Stores TOTP secrets and backup codes for 2FA.
- **`RbacPermission`**: Custom dynamic RBAC permissions matrix.
- **`SlaConfig`**: Defines SLA SLA timers for approvals based on risk level.
- **`ScheduledReport` & `ReportTemplate`**: Automated PDF/CSV PDF generation configs.
- **`IpWhitelist`**: Allowed CIDR blocks for API access.

---

## 5. END-TO-END WORKING FLOW (A to Z)

Trace of a simulated requirements change lifecycle passing through the tech stack:

1. **Triggering the Initial Change (UI/Frontend)**: 
   A Client views a requirement in the React application. They open a modal (Radix UI `Dialog`) and fill out a React Hook Form governed by a Zod schema. They specify the `change_type` (e.g., "addition"), `description`, and select `affected_modules`.

2. **API Request (Routing)**: 
   The frontend triggers an API call via `src/services/api.ts` utilizing `axios` or native `fetch`. It POSTs to `/api/analyze` with the `AnalysisRequest` Pydantic payload.
   *Security Note*: `main.py` intercepts this request, verifies the IP isn't blacklisted, limits the rate, and `dependencies.py` extracts the user's JWT to verify their `role`.

3. **Pre-Processing (`routers/analysis.py`)**: 
   The router extracts the payload. If the complexity wasn't set, it invokes `ImpactCalculator.auto_complexity()`. It creates a new `ChangeRequest` record in the database with the `status` set to `"analyzed"`.

4. **The Calculation Engine executes**: 
   The route passes the context dictionaries to `ImpactCalculator.calculate()`. The engine executes the exact math detailed in Section 3: determining the `Base Score`, fetching the `Module Factor`, scaling the `Impact Score`, generating Cost/Time/Effort fractions, and appending six predefined text `recommendations` based on the derived `risk_level` (e.g., `"🚨 CRITICAL: Admin approval required"`).

5. **Data Persistence & Returning to UI**: 
   The route stores the massive dictionary into the `ImpactAnalysis` DB table. It converts the data to JSON and returns it to the React frontend.
   React Query caches the result. Zustand triggers a state update, causing Recharts to render the matrix grids (Cost vs Time charts, Risk radar charts).

6. **Submission Phase**:
   The Client reviews the visual grid and clicks "Submit". The frontend POSTs to `/api/change-requests/{cr_id}/submit`. The database `status` updates to `"submitted"`. `log_audit()` records the action.

7. **Approval & Email Dispatch (`routers/change_requests.py` & `utils/email.py`)**:
   A Project Manager logs in, views the submitted request, and hits POST `/api/change-requests/{cr_id}/approve` with a comment.
   The `status` changes to `"approved"`. A `Notification` table record is created.
   The `send_decision_email()` function is triggered. It looks for `os.getenv("RESEND_API_KEY")`.
   - **If Key Exists**: It sends a JSON payload containing the stylized HTML approval email via `requests.post()` to `https://api.resend.com/emails`.
   - **If Key is Missing (Local Dev)**: It bypasses requests, gracefully formats the email subject and HTML body, and `print()`s it directly to the terminal, avoiding application crashes while allowing developers to verify email logic.
