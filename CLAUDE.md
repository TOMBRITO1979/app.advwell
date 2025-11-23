# CLAUDE.md - AdvWell Technical Reference

Technical guide for Claude Code when working with this repository.

## Project Overview

AdvWell is a multitenant SaaS for Brazilian law firms with DataJud CNJ integration.

**Live URLs:**
- Frontend: https://app.advwell.pro
- Backend API: https://api.advwell.pro

**Current Versions:**
- Backend: v52-user-profile - User profile management with photo upload
- Frontend: v67-buttons-mobile - Complete mobile button optimization (Contas a Pagar, Campanhas, Config SMTP, IA)
- Database: PostgreSQL 16

**Key Features:**
- Multi-grade DataJud synchronization (G1, G2, G3)
- AI-powered case summarization (OpenAI GPT, Google Gemini)
- Email campaigns with pre-built templates
- Accounts payable with recurring bills
- Agenda/schedule with Google Meet integration
- Financial management (income/expense tracking)
- Document management (S3 uploads + external links)
- Case parts management with conditional fields
- CSV import/export for clients and cases
- Company settings with PDF integration
- Role-based access control (SUPER_ADMIN, ADMIN, USER)

## Chatwoot Integration (JoyInChat-AdvWell)

This system is integrated with **JoyInChat-AdvWell** (a customized Chatwoot installation) for automatic SSO and user synchronization.

### Integration Endpoints

**Base URL:** `https://api.advwell.pro/api/integration`
**Authentication:** Header `X-API-Key: {company.apiKey}`

All integration endpoints are **already implemented** in `backend/src/controllers/integration.controller.ts`:

1. **POST /sync-user** - Create or update user
   - Body: `{ name, email, password?, role? }`
   - Response: `{ user, created: boolean, temporaryPassword? }`
   - Creates Company + User if new, or updates existing user
   - If password not provided, generates secure random password

2. **POST /update-password** - Synchronize password changes
   - Body: `{ email, newPassword }`
   - Response: `{ message, email }`
   - Updates password for user in company (matched by API Key)

3. **POST /sso-token** - Generate JWT token for Single Sign-On
   - Body: `{ email }`
   - Response: `{ token, user }`
   - Returns JWT token for automatic login
   - Frontend receives token via URL parameter: `?sso_token=JWT_HERE`

### How It Works

**When a new Account is created in Chatwoot:**
1. Chatwoot calls `POST /sync-user` with admin user data
2. AdvTom creates a new Company (tied to API Key)
3. AdvTom creates first User with role ADMIN
4. API Key is stored in Chatwoot's `accounts.advtom_api_key`
5. Company ID stored in `accounts.advtom_company_id`

**When a user logs into Chatwoot:**
1. Chatwoot authenticates user
2. Chatwoot calls `POST /sso-token` with user email
3. AdvTom generates JWT token
4. Chatwoot embeds AdvTom in iframe: `https://app.advwell.pro?sso_token=TOKEN`
5. AdvTom frontend detects token and logs in automatically

**When password is reset in Chatwoot:**
1. Chatwoot updates user password
2. Chatwoot calls `POST /update-password`
3. AdvTom syncs password
4. Both systems maintain same credentials

### Role Mapping

| Chatwoot Role | AdvTom Role |
|---------------|-------------|
| administrator | ADMIN       |
| agent         | USER        |

### Frontend SSO Implementation

The frontend (`frontend/src/App.tsx`) automatically handles SSO tokens:

```typescript
// Check for SSO token in URL
const urlParams = new URLSearchParams(window.location.search);
const ssoToken = urlParams.get('sso_token');

if (ssoToken) {
  localStorage.setItem('token', ssoToken);
  // Redirect to dashboard
}
```

**Location:** `frontend/src/App.tsx` (already implemented)

### Security

- **API Key**: Each Company has unique UUID-based API Key
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **HTTPS Only**: All API calls require SSL
- **JWT Expiration**: Tokens expire based on JWT_SECRET configuration
- **Password Hashing**: bcrypt with factor 10

### Generating API Keys

**For existing companies:**
```sql
UPDATE companies
SET "apiKey" = gen_random_uuid()::text
WHERE email = 'admin@company.com';
```

**For new companies:**
API Key is automatically generated during company creation via integration endpoint.

### Testing Integration

**1. Test user sync:**
```bash
curl -X POST https://api.advwell.pro/api/integration/sync-user \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "ADMIN"
  }'
```

**2. Test SSO token:**
```bash
curl -X POST https://api.advwell.pro/api/integration/sso-token \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{ "email": "test@example.com" }'
```

**3. Test in browser:**
```
https://app.advwell.pro?sso_token=PASTE_TOKEN_HERE
```

### Troubleshooting

**Check API Key:**
```sql
SELECT id, name, email, "apiKey" FROM companies WHERE email = 'admin@company.com';
```

**Logs:**
```bash
docker service logs advtom_backend -f | grep -i integration
```

**Common Issues:**
- 401 Unauthorized: Invalid or missing API Key
- 404 Not Found: User doesn't exist in company
- 409 Conflict: Email already exists in different company

## Technology Stack

### Backend
- Node.js + Express + TypeScript
- PostgreSQL 16 + Prisma ORM
- JWT Authentication
- AWS S3 for document storage
- Nodemailer (SMTP)
- node-cron for scheduled tasks
- PDFKit for PDF generation
- Axios for external API calls

### Frontend
- React 18 + TypeScript + Vite
- TailwindCSS for styling
- Zustand for state management (not React Context API)
- React Router for routing
- Axios for API calls

### Infrastructure
- Docker Swarm for orchestration
- Traefik for reverse proxy + SSL
- PostgreSQL 16 database
- Nginx for frontend serving

## Development Commands

### Backend Development
```bash
cd backend
npm install
npm run dev                    # Start dev server with hot reload
npm run build                  # Compile TypeScript
npm start                      # Run compiled code
npm run prisma:generate        # Generate Prisma client
npm run prisma:migrate         # Run migrations
npm run prisma:studio          # Open Prisma Studio GUI
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev                    # Start Vite dev server (port 5173)
npm run build                  # Build for production
npm run preview                # Preview production build
```

### Testing & Verification
```bash
# Database verification
./check_database.sh            # Quick database check
./check_complete_database.sh   # Complete database inspection
./verify_data.sh               # Verify data integrity (if exists)
./verify_all_users.sh          # Check all users in database (if exists)

# Service logs and monitoring
./check_logs.sh                # Backend logs
./check_frontend_logs.sh       # Frontend logs
./check_all_logs.sh            # All service logs
./check_new_logs.sh            # Recent logs only
./check_services.sh            # Service status

# API and feature testing
node test_api.js               # Test API endpoints
node test_api_complete.js      # Comprehensive API testing
node test_login.js             # Test authentication
node test_all_logins.js        # Test multiple user logins
node test_backend.js           # Backend functionality tests
node test_case_parts.js        # Case parts CRUD testing
node test_users_management.js  # User management testing
node test_sync_ultimo_andamento.js  # DataJud sync testing
./test_complete_flow.sh        # End-to-end flow test
./test_sync_fix.sh             # Test synchronization fix
./test_api_informar_cliente.sh # Test informarCliente field

# Data creation and seeding
node create_test_data.js       # Create test data
node create_complete_data.js   # Create complete dataset
node create_admin_user.js      # Create admin user
node create_superadmin.js      # Create super admin
node adicionar_partes_processo.js  # Add case parts

# User management scripts
./update_to_superadmin.sh      # Promote user to SUPER_ADMIN
./fix_pedro_role.sh            # Fix specific user roles
node fix_master_user.js        # Fix master user account
node update_master_password.js # Update master user password

# Backup and restore
./criar_backup.sh              # Create complete system backup
```

### Deployment
```bash
./deploy_expect.sh             # Automated deployment script
docker stack deploy -c docker-compose.yml advtom  # Manual deployment
docker stack ps advtom         # Check service status
docker service logs advtom_backend -f   # View backend logs

# Update specific service to new image version
docker service update --image tomautomations/advwell-backend:NEW_VERSION advtom_backend
docker service update --image tomautomations/advwell-frontend:NEW_VERSION advtom_frontend
```

## Architecture

### Multitenant Design

The system implements **row-level multitenancy** where all tenants share the same database but data is isolated by `companyId`:

- Every data model (except User and Company) has a `companyId` foreign key
- The `validateTenant` middleware enforces tenant isolation (backend/src/middleware/tenant.ts:5)
- Super Admins bypass tenant validation and can access all companies
- Regular users can only access data from their company

### Authentication Flow

1. **Registration** (auth.routes.ts): Creates a new Company and Admin user atomically
2. **Login** (auth.controller.ts:45): Returns JWT token with user role and companyId
3. **Token Storage**: Frontend stores JWT in localStorage
4. **Request Authentication**: `auth` middleware validates JWT and attaches user to request
5. **Tenant Validation**: `validateTenant` middleware ensures data isolation

### User Roles

- **SUPER_ADMIN**: Manages companies, bypasses tenant restrictions
- **ADMIN**: Manages their company and its users
- **USER**: Basic access with permission-based restrictions

Roles are enforced in backend/src/middleware/auth.ts and checked via `req.user.role`.

### Permission System

The system has a fine-grained permission model (backend/prisma/schema.prisma):
- Each User can have multiple Permissions
- Permissions are resource-based (e.g., "clients", "cases", "settings")
- Each permission has three flags: `canView`, `canEdit`, `canDelete`
- Currently permissions are in the schema but not actively enforced in controllers (role-based access is primary)
- Future enhancement: Add permission checks in controllers for USER role

### DataJud Integration

DataJud is Brazil's unified court data system. Integration lives in backend/src/services/datajud.service.ts:

- **Automatic Sync**: Cron job runs daily at 2 AM (backend/src/index.ts:63)
- **Manual Sync**: Available via API endpoint for individual cases
- **Tribunal Support**: TJRJ, TJSP, TJMG, TRF1-5
- **Search Strategy**: Tries all tribunals sequentially until match found
- **Movement Updates**: Deletes old movements and replaces with fresh data

The cron job syncs all ACTIVE cases by:
1. Fetching case from DataJud API
2. Deleting existing movements
3. Creating new movements
4. Updating `lastSyncedAt` timestamp

### State Management

Frontend uses **Zustand** (not Context API) for global state:

- **AuthContext**: Actually a Zustand store (frontend/src/contexts/AuthContext.tsx:29)
- Pattern: `create<StateInterface>((set) => ({ ... }))`
- Access via: `const { user, login, logout } = useAuth()`

### Database Schema

Key relationships (backend/prisma/schema.prisma):
- `Company` → has many `User`, `Client`, `Case`, `SMTPConfig`, `EmailCampaign`, `AIConfig`
- `User` → belongs to `Company`, has many `Permission`, `ScheduleEvent`, `AccountPayable`
- `Client` → belongs to `Company`, has many `Case`, `ScheduleEvent`, `Document`
- `Case` → belongs to `Company` and `Client`, has many `CaseMovement`, `CaseDocument`, `CasePart`, `ScheduleEvent`
- `AIConfig` → belongs to `Company` (one-to-one)
- `SMTPConfig` → belongs to `Company` (one-to-one)
- `EmailCampaign` → has many `CampaignRecipient`

**New Tables (v50+):**
- `AIConfig` - AI provider configuration per company
- `SMTPConfig` - Email server configuration per company
- `EmailCampaign` - Email campaigns
- `CampaignRecipient` - Campaign recipient tracking
- `ScheduleEvent` - Agenda/calendar events
- `AccountPayable` - Bills and recurring payments

All relations use `onDelete: Cascade` for automatic cleanup.

### API Routes Structure

All routes are under `/api` prefix (backend/src/routes/index.ts):
- `/api/auth/*` - Authentication (login, register, password reset)
- `/api/users/*` - User management
- `/api/companies/*` - Company management (SUPER_ADMIN only)
- `/api/clients/*` - Client management
- `/api/cases/*` - Case management and DataJud sync
- `/api/financial/*` - Financial transaction management (income/expense tracking)
- `/api/documents/*` - Document management (uploads and external links)
- `/api/schedule/*` - Agenda/schedule events
- `/api/accounts-payable/*` - Bills and recurring payments
- `/api/smtp-config/*` - SMTP configuration (ADMIN+)
- `/api/campaigns/*` - Email campaigns
- `/api/ai-config/*` - AI provider configuration (ADMIN+)
- `/api/integration/*` - External integrations (Chatwoot SSO)
- `/api/dashboard/*` - Dashboard statistics

Routes are protected by `authenticateToken` and `validateTenant` middlewares.

### File Uploads

Documents are stored in AWS S3 (backend/src/utils/s3.ts):
- **Upload handling:** multer middleware with memory storage
- **Folder structure (v20+):** `{admin-email-sanitized}/documents/{uuid}.{ext}`
  - Example: `admin-at-company.com/documents/f62c06d9-4231-43cd-bdc8-4c89c365e5f7.pdf`
  - Admin email fetched from first ADMIN user (company creator)
  - Email sanitized: `@` → `-at-`, special chars removed, lowercase
- **Legacy structure (v19 and earlier):** `company-{uuid}/documents/` (still accessible)
- **Storage:** Presigned URLs for secure access
- **Metadata:** Stored in `Document` table with fileKey, fileUrl, fileSize, fileType
- **File types:** PDF, Word, Excel, PowerPoint, images, compressed files (50MB limit)
- **Admin protection:** Admin email cannot be modified (user.controller.ts:154-157)

### Financial Module

Income and expense tracking (backend/src/controllers/financial.controller.ts):
- Track INCOME/EXPENSE transactions linked to clients and cases
- Auto-calculate balance (total income - total expenses)
- Filter by type, client, case, date range
- Export to PDF and CSV

**API:** `/api/financial` (GET, POST, PUT, DELETE), `/api/financial/summary`, `/api/financial/export/{pdf|csv}`

### Company Settings Module

Configure company information (backend/src/controllers/company.controller.ts):
- Update name, email, phone, address, logo
- Data included in PDF report headers
- ADMIN+ only

**API:** `/api/companies/own` (GET, PUT), `/api/companies` (SUPER_ADMIN CRUD)

**⚠️ Route Order:** Literal paths (`/own`) BEFORE parameterized routes (`/:id`)

### CSV Import/Export Module

Bulk operations for clients and cases:
- Export/Import clients and cases via CSV
- Line-by-line validation with error reporting
- Supports date formats (DD/MM/YYYY, YYYY-MM-DD)
- Currency parsing (R$ 1.000,00)
- UTF-8 BOM for Excel compatibility

**API:** `/api/clients/export/csv`, `/api/clients/import/csv`, `/api/cases/export/csv`, `/api/cases/import/csv`

**Dependencies:** csv-parse, multer

### Document Management Module

Store documents for clients/cases (backend/src/controllers/document.controller.ts):
- S3 uploads + external links (Google Drive, Google Docs, Minio, Other)
- Autocomplete search by client/case
- Presigned URLs with 1-hour expiration

**API:** `/api/documents` (GET, POST, PUT, DELETE), `/api/documents/search`

**Storage Types:** upload | link
**External Types:** google_drive | google_docs | minio | other

### AI Integration System (v50+)

AdvWell includes AI-powered case summarization using multiple providers (`backend/src/services/ai/`):

**Supported Providers:**
- **OpenAI**: GPT-4, GPT-4o, GPT-4o-mini
- **Google Gemini**: Gemini 1.5 Pro, Gemini 1.5 Flash
- **Future-ready**: Anthropic Claude, Groq (infrastructure in place)

**How It Works:**
1. Admin configures AI provider in `/ai-config` page
2. API key encrypted with AES-256-CBC (stored in `AIConfig` table)
3. Auto-summarization runs after DataJud sync (if `autoSummarize` enabled)
4. Summary stored in `Case.aiSummary` field
5. Manual summarization available via "Gerar Resumo" button

**Configuration:**
- **API:** `/api/ai-config` (GET, POST, PUT, DELETE, POST `/test-connection`)
- **Encryption:** Uses `ENCRYPTION_KEY` environment variable
- **Security:** API keys never exposed in API responses
- **Table:** `AIConfig` with provider, model, apiKey (encrypted), autoSummarize fields

**Code Locations:**
- Service: `backend/src/services/ai/ai.service.ts`
- Providers: `backend/src/services/ai/providers/` (factory pattern)
- Prompts: `backend/src/services/ai/prompts.ts`
- Controller: `backend/src/controllers/ai-config.controller.ts`
- Frontend: `frontend/src/pages/AIConfig.tsx`
- Encryption: `backend/src/utils/encryption.ts` (AES-256-CBC with random IV)

### Email Campaign System (v51+)

Send bulk email campaigns to clients with tracking (`backend/src/controllers/campaign.controller.ts`):

**Features:**
- Per-company SMTP configuration (Gmail, custom SMTP)
- Pre-built templates (legal notices, updates, etc.)
- Recipient status tracking (pending, sent, failed)
- Campaign statistics (total sent, failed count)
- Rich HTML email editor

**Workflow:**
1. Configure SMTP in `/smtp-settings` (encrypted password storage)
2. Create campaign in `/campaigns`
3. Select template or write custom HTML
4. Add recipients (manual or bulk)
5. Send immediately or schedule
6. Track delivery status per recipient

**Configuration:**
- **API:** `/api/smtp-config`, `/api/campaigns` (GET, POST, PUT, DELETE, POST `/send/:id`)
- **Tables:** `SMTPConfig`, `EmailCampaign`, `CampaignRecipient`
- **Encryption:** SMTP passwords encrypted with AES-256-CBC
- **Security:** Password never returned in API responses

**Code Locations:**
- Service: `backend/src/services/campaign.service.ts`
- Controllers: `backend/src/controllers/campaign.controller.ts`, `smtp-config.controller.ts`
- Frontend: `frontend/src/pages/Campaigns.tsx` (if exists)

### Schedule/Agenda System

Calendar and event management for legal proceedings:

**Event Types:** COMPROMISSO, TAREFA, PRAZO, AUDIENCIA, GOOGLE_MEET
**Features:** Google Meet link generation, client/case association
**API:** `/api/schedule` (GET, POST, PUT, DELETE)
**Table:** `ScheduleEvent`

### Accounts Payable Module

Bills and recurring payments management:

**Features:**
- Recurring bills (15 days, monthly, semi-annual, annual)
- Supplier management
- Status tracking (PENDING, PAID, OVERDUE, CANCELLED)
- Category organization
**API:** `/api/accounts-payable` (GET, POST, PUT, DELETE)
**Table:** `AccountPayable` with recurrence support

## Important Patterns

### Making Database Queries

Always use the Prisma client singleton from `backend/src/utils/prisma.ts`:
```typescript
import prisma from '../utils/prisma';
```

For tenant-scoped queries, always filter by `companyId`:
```typescript
const clients = await prisma.client.findMany({
  where: { companyId: req.user.companyId }
});
```

### Adding New Protected Routes

1. Create controller in `backend/src/controllers/`
2. Create route file in `backend/src/routes/`
3. Apply middleware: `router.use(authenticateToken, validateTenant)`
4. Register route in `backend/src/routes/index.ts`

### Frontend API Calls

Use the configured axios instance from `frontend/src/services/api.ts`:
```typescript
import api from '../services/api';
const response = await api.get('/endpoint');
```

This instance automatically includes JWT token in headers and redirects to `/login` on 401 errors.

### Implementing Autocomplete Search

For autocomplete functionality with large datasets:

**Frontend Pattern:**
```typescript
// State management
const [searchText, setSearchText] = useState('');
const [filteredResults, setFilteredResults] = useState<Item[]>([]);
const [showSuggestions, setShowSuggestions] = useState(false);

// Filter items as user types
useEffect(() => {
  if (searchText) {
    const filtered = items.filter(item =>
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (item.identifier && item.identifier.includes(searchText))
    );
    setFilteredResults(filtered);
  } else {
    setFilteredResults(items);
  }
}, [searchText, items]);

// Render autocomplete dropdown
{showSuggestions && filteredResults.length > 0 && (
  <div className="absolute z-10 w-full mt-1 bg-white border shadow-lg max-h-60 overflow-y-auto">
    {filteredResults.map((item) => (
      <div onClick={() => handleSelect(item)} className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
        {item.name}
      </div>
    ))}
  </div>
)}
```

**Best Practices:**
- Load all items once (use `limit: 1000` in initial API call)
- Filter client-side for instant response
- Use `position: relative` on parent container for dropdown positioning
- Add `z-index: 10` to ensure dropdown appears above other elements
- Implement keyboard navigation for accessibility (optional enhancement)

### Implementing File Exports

**PDF Export (Backend):**
```typescript
import PDFDocument from 'pdfkit';

export const exportPDF = async (req: AuthRequest, res: Response) => {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');

  doc.pipe(res);

  // Add content
  doc.fontSize(20).text('Report Title', { align: 'center' });
  doc.fontSize(10).text(`Date: ${new Date().toLocaleDateString('pt-BR')}`);

  // Add data
  data.forEach((item, index) => {
    doc.text(`${index + 1}. ${item.description}`);
    if ((index + 1) % 10 === 0) doc.addPage(); // Pagination
  });

  doc.end();
};
```

**CSV Export (Backend):**
```typescript
export const exportCSV = async (req: AuthRequest, res: Response) => {
  const csvHeader = 'Column1,Column2,Column3\n';
  const csvRows = data.map(item => {
    const col1 = `"${item.name}"`;
    const col2 = item.value;
    return `${col1},${col2}`;
  }).join('\n');

  const csv = csvHeader + csvRows;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
  res.send('\ufeff' + csv); // BOM for Excel UTF-8 recognition
};
```

**Frontend Export Call:**
```typescript
const handleExport = async (format: 'pdf' | 'csv') => {
  const response = await api.get(`/endpoint/export/${format}`, {
    params: filters,
    responseType: 'blob'
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `report_${new Date().toISOString().split('T')[0]}.${format}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};
```

### Email Templates

Modern responsive HTML emails (`backend/src/utils/email.ts`):
- `sendPasswordResetEmail(email, resetToken)` - Password reset
- `sendWelcomeEmail(email, name)` - Welcome email

**Features:** Inline CSS, responsive tables, compatible with Gmail/Outlook/Apple Mail
**Config:** SMTP settings in `docker-compose.yml` (Gmail SMTP)
**Best Practices:** Use HTML tables for layout, inline CSS only, max 600px width

### Mobile Responsiveness

Mobile-first approach (`frontend/src/components/Layout.tsx`, `frontend/src/styles/index.css`):
- Responsive layout: Sticky header, slide-in sidebar, collapsible on desktop
- Touch-friendly elements: `min-h-[44px]` for buttons/inputs
- iOS-specific: 16px font prevents auto-zoom
- ResponsiveTable component for horizontal scroll
- Breakpoints: sm (640px), md (768px), lg (1024px)

### Case Parts Management

Add parties to legal cases (`backend/src/routes/case-part.routes.ts`):
- Types: AUTOR (plaintiff), REU (defendant), REPRESENTANTE_LEGAL
- Common fields: name, cpfCnpj, phone, address, rg, birthDate
- AUTOR-specific: email, civilStatus, profession
- Table view with color-coded badges, edit modal

**API:** `/api/cases/:caseId/parts` (GET, POST, PUT, DELETE)

### Encryption Infrastructure

Sensitive data encryption using `backend/src/utils/encryption.ts`:

**Algorithm:** AES-256-CBC with random IV per encryption
**Use Cases:** AI API keys, SMTP passwords
**Environment:** `ENCRYPTION_KEY` must be 32 bytes (64 hex chars)

**Pattern:**
```typescript
import { encrypt, decrypt } from '../utils/encryption';

// Encrypting sensitive data before storage
const encryptedKey = encrypt(apiKey);
await prisma.aiConfig.create({
  data: { apiKey: encryptedKey, ... }
});

// Decrypting for use
const config = await prisma.aiConfig.findUnique(...);
const apiKey = decrypt(config.apiKey);
```

**Security Notes:**
- Each encryption generates new random IV (stored with ciphertext)
- Encrypted values never returned in API responses
- Production warning if ENCRYPTION_KEY not set
- IV prepended to ciphertext (format: `iv:encryptedData`)

### Middleware Chain Order

Backend routes follow this middleware chain (backend/src/routes/*.routes.ts):
1. **Rate Limiter** (global, 100 req/15min per IP)
2. **CORS** (allows frontend origin)
3. **Helmet** (security headers)
4. **authenticate** - Validates JWT, attaches user to `req.user`
5. **validateTenant** - Checks companyId and company active status (bypassed for SUPER_ADMIN)
6. **requireRole/requireAdmin/requireSuperAdmin** - Optional role-based access control

Example protected route:
```typescript
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateTenant } from '../middleware/tenant';

router.use(authenticate, validateTenant);
router.delete('/:id', requireAdmin, controller.delete);
```

## URL Configuration for Distribution

When distributing to new environments, update these locations:

1. **docker-compose.yml**: Change `API_URL`, `FRONTEND_URL`, `VITE_API_URL`, and Traefik host rules
2. **Rebuild Frontend**: `docker build --build-arg VITE_API_URL=https://NEW_API_URL/api -t tomautomations/advwell-frontend:v1-advwell frontend/`
3. **Deploy**: Run `./deploy_expect.sh` after updating server hostname

**Critical**: The frontend MUST be rebuilt because Vite bakes the API URL into the bundle at build time via `import.meta.env.VITE_API_URL` (frontend/src/services/api.ts:4).

**Migration Example (advtom.com → advwell.pro):**
```bash
# Update docker-compose.yml URLs
# Then rebuild frontend with new URL
docker build --no-cache --build-arg VITE_API_URL=https://api.advwell.pro/api \
  -t tomautomations/advwell-frontend:v1-advwell frontend/
docker push tomautomations/advwell-frontend:v1-advwell
# Update service
docker service update --image tomautomations/advwell-frontend:v1-advwell advtom_frontend
```

### Build Arguments Explained

- `VITE_API_URL`: Must include `/api` suffix (e.g., `https://api.advwell.pro/api`)
- Frontend Dockerfile uses ARG to inject this at build time
- Backend doesn't need rebuild for URL changes (uses runtime environment variables)
- Use `--no-cache` flag when changing URLs to prevent Docker from using cached layers

## Environment Variables

Critical variables in docker-compose.yml:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for signing JWT tokens
- `ENCRYPTION_KEY` - Secret for encrypting API keys and passwords (AES-256-CBC)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` - S3 configuration
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` - Email configuration (default system-wide)
- `DATAJUD_API_KEY` - CNJ DataJud API access
- `API_URL`, `FRONTEND_URL` - Service URLs for CORS and email links

## Common Tasks

### Creating a Super Admin

```bash
docker exec -it $(docker ps -q -f name=advtom_backend) sh
npx prisma studio
# In Prisma Studio UI, edit user and set role to SUPER_ADMIN
```

### Running Prisma Migrations in Production

```bash
# Access running backend container
docker exec -it $(docker ps -q -f name=advtom_backend) sh

# Generate Prisma client (after schema changes)
npx prisma generate

# Run pending migrations
npx prisma migrate deploy

# (Optional) Create a new migration locally first
# cd backend
# npx prisma migrate dev --name descriptive_name
```

### Troubleshooting Database Connection

```bash
# Check if database is running
docker service ps advtom_postgres

# Test database connection from backend
docker exec -it $(docker ps -q -f name=advtom_backend) sh
# Inside container:
npx prisma db pull  # Will fail if DB unreachable
```

### Database Backup & System Restore

**Quick Database Backup:**
```bash
docker exec $(docker ps -q -f name=advtom_postgres) pg_dump -U postgres advtom > backup.sql
```

**Complete System Backup:** Use `./criar_backup.sh` script
- Creates: database dump, code archives, docker-compose.yml, Docker images
- Location: `/root/advtom/backups/YYYYMMDD_HHMMSS_description/`
- Latest: `/root/advtom/backups/20251104_223732_v20_email_s3_structure/`

**Restore:**
```bash
# Automated (recommended)
/path/to/backup/restore.sh

# Manual
docker stack rm advtom && sleep 15
docker load -i backup/frontend_image.tar
docker load -i backup/backend_image.tar
cp backup/docker-compose.yml /root/advtom/
docker stack deploy -c docker-compose.yml advtom && sleep 40
docker exec -i $(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom < backup/database_backup.sql
```

### Viewing Logs in Production

```bash
docker service logs advtom_backend -f
docker service logs advtom_frontend -f
docker service logs advtom_postgres -f
```

### Updating Production

1. Make code changes locally
2. Rebuild and push Docker images (if using custom registry)
3. Run `./deploy_expect.sh` or `docker stack deploy -c docker-compose.yml advtom`
4. Docker Swarm performs rolling update automatically

## Troubleshooting

### Common Issues

**Frontend can't connect to backend:**
- Check if backend is running: `docker service ps advtom_backend`
- Verify API URL in frontend build: Check `VITE_API_URL` was set correctly at build time
- Test backend directly: `curl -k https://api.advwell.pro/health`
- Check Traefik routing: `docker service logs traefik_traefik -f`

**Database connection errors:**
- Verify PostgreSQL is running: `docker service ps advtom_postgres`
- Check DATABASE_URL in backend environment
- Test connection: `docker exec -it $(docker ps -q -f name=advtom_backend) npx prisma db pull`

**Case parts not saving/loading:**
- Ensure you're on v1-advwell or later (includes the fix)
- Check backend logs for errors: `./check_logs.sh`
- Verify CasePart table exists: `./check_complete_database.sh`

**DataJud sync not working:**
- Check DATAJUD_API_KEY is valid in docker-compose.yml
- Backend logs will show sync errors at 2 AM daily
- Manually test sync via UI "Sincronizar" button
- Verify case process number format is correct

**SSL certificate issues:**
- Certificates auto-renew via Let's Encrypt (Traefik handles this)
- Check Traefik logs: `docker service logs traefik_traefik -f`
- Ensure DNS is pointing to the server before deployment
- Certificates stored in Traefik volume

**Migrations failing:**
- Always run `npx prisma generate` after schema changes
- For production: Use `npx prisma migrate deploy` (doesn't prompt)
- For development: Use `npx prisma migrate dev --name description`
- If stuck: Check `_prisma_migrations` table in database

**File upload failures:**
- Verify AWS credentials in docker-compose.yml
- Check S3_BUCKET_NAME exists and is accessible
- Test S3 connection from backend container
- Check file size limits in backend/src/middleware/upload.ts

**AI summarization not working:**
- Check if AIConfig exists for company: `SELECT * FROM "AIConfig" WHERE "companyId" = 'xxx';`
- Verify API key is properly encrypted and stored
- Test connection via UI "Testar Conexão" button
- Check `ENCRYPTION_KEY` environment variable is set
- Review backend logs for AI service errors: `docker service logs advtom_backend -f | grep -i "ai"`
- Verify provider and model are correctly selected

**Email campaigns not sending:**
- Check SMTPConfig exists for company
- Verify SMTP password is properly encrypted
- Test SMTP connection (send test email from UI)
- Check recipient status in CampaignRecipient table
- Review campaign service logs for errors
- Ensure SMTP host allows connection from server IP

## Security

**6-Phase Security Implementation:**
1. **Input Validation:** express-validator on all endpoints
2. **XSS Protection:** DOMPurify (frontend) + HTML escaping (backend)
3. **Rate Limiting:** 100 req/15min global, 20 req/15min auth endpoints
4. **Password Security:** Bcrypt factor 12 (~100-150ms per hash)
5. **Account Lockout:** 5 failed attempts = 15 minute lockout
6. **Structured Logging:** Winston JSON logs with security events

**Key Features:**
- JWT tokens with expiration
- Helmet.js security headers
- CORS restricted to frontend URL
- HTTPS only (Let's Encrypt via Traefik)
- SQL injection protection (Prisma ORM)
- Complete audit trail with userId, email, IP, timestamp

**Logs:** `docker service logs advtom_backend -f`

## Development Workflow

### Local Development Setup

1. **Start Backend**:
   ```bash
   cd backend
   npm install
   # Create .env with DATABASE_URL, JWT_SECRET, AWS credentials, etc.
   npx prisma generate
   npx prisma migrate dev
   npm run dev  # Runs on port 3000
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm install
   # Create .env with VITE_API_URL=http://localhost:3000/api
   npm run dev  # Runs on port 5173
   ```

3. **Access**: Frontend at http://localhost:5173 → calls backend at http://localhost:3000

### Production Deployment Workflow

1. Test locally
2. Build images: `docker build -t tomautomations/advwell-{backend|frontend}:vXX-feature {backend|frontend}/`
   - Frontend needs: `--build-arg VITE_API_URL=https://api.advwell.pro/api`
3. Push to DockerHub: `docker push tomautomations/advwell-{backend|frontend}:vXX-feature`
4. Update docker-compose.yml with new image versions
5. Create backup: `./criar_backup.sh`
6. Deploy: `./deploy_expect.sh` or `docker stack deploy -c docker-compose.yml advtom`
7. Verify: `curl -k https://api.advwell.pro/health` and check logs
8. Update CLAUDE.md "Current Versions"

**⚠️ Important:** Always update docker-compose.yml and commit it.

### Key Files to Modify

- **Adding new API endpoint**:
  - Controller in `backend/src/controllers/`
  - Route in `backend/src/routes/`
  - Register in `backend/src/routes/index.ts`
- **Adding database table**:
  - Update `backend/prisma/schema.prisma`
  - Run `npx prisma migrate dev --name add_table_name`
- **Adding frontend page**:
  - Create page in `frontend/src/pages/`
  - Add route in `frontend/src/App.tsx`
  - Add navigation in `frontend/src/components/Layout.tsx` (if needed)

## Important Code Locations

### Backend Structure
- **Entry point**: `backend/src/index.ts` - Server initialization, cron jobs, middleware setup
- **Database client**: `backend/src/utils/prisma.ts` - Singleton Prisma client instance
- **Authentication**:
  - Middleware: `backend/src/middleware/auth.ts`
  - Controller: `backend/src/controllers/auth.controller.ts`
- **Tenant isolation**: `backend/src/middleware/tenant.ts` - Enforces row-level multitenancy
- **DataJud integration**: `backend/src/services/datajud.service.ts` - Court system API client
- **File uploads**: `backend/src/utils/s3.ts` - AWS S3 operations
- **AI Integration**:
  - Service: `backend/src/services/ai/ai.service.ts`
  - Providers: `backend/src/services/ai/providers/` (OpenAI, Gemini)
  - Controller: `backend/src/controllers/ai-config.controller.ts`
- **Email Campaigns**:
  - Service: `backend/src/services/campaign.service.ts`
  - Controllers: `backend/src/controllers/campaign.controller.ts`, `smtp-config.controller.ts`
- **Security & Logging**:
  - Encryption: `backend/src/utils/encryption.ts` (AES-256-CBC)
  - Logger: `backend/src/utils/logger.ts` (Winston)
  - Sanitization: `backend/src/utils/sanitize.ts` (DOMPurify)
  - Validation: `backend/src/middleware/validation.ts` (express-validator)

### Frontend Structure
- **Entry point**: `frontend/src/main.tsx` - App initialization
- **Routing**: `frontend/src/App.tsx` - All route definitions
- **API client**: `frontend/src/services/api.ts` - Configured Axios instance with JWT interceptor
- **Auth store**: `frontend/src/contexts/AuthContext.tsx` - Zustand store (not React Context!)
- **Layout**: `frontend/src/components/Layout.tsx` - Main layout with navigation
- **Key pages**:
  - Cases: `frontend/src/pages/Cases.tsx` - Includes case parts management
  - Financial: `frontend/src/pages/Financial.tsx` - Income/expense tracking
  - Settings: `frontend/src/pages/Settings.tsx` - Company configuration
  - AI Config: `frontend/src/pages/AIConfig.tsx` - AI provider setup
  - Schedule: `frontend/src/pages/Schedule.tsx` - Agenda/calendar

### Database
- **Schema**: `backend/prisma/schema.prisma` - Complete database schema
- **Manual migrations**: `backend/migrations_manual/` - SQL scripts for complex migrations
- **Key tables**: Company, User, Client, Case, CasePart, CaseMovement, FinancialTransaction, AIConfig, SMTPConfig, EmailCampaign, ScheduleEvent, AccountPayable

### Configuration
- **Production**: `docker-compose.yml` - All environment variables and service configs
- **Backend dev**: `backend/.env` (create from environment variables in docker-compose.yml)
- **Frontend dev**: `frontend/.env` (set VITE_API_URL=http://localhost:3000/api)

## Quick Reference

### Quick Diagnostics
```bash
# Check if system is healthy
curl -k https://api.advwell.pro/health

# Check running services
docker stack ps advtom

# Quick log check for errors
docker service logs advtom_backend --tail 50 | grep -i error

# Verify database connection
docker exec $(docker ps -q -f name=advtom_backend) npx prisma db pull

# Check current deployed versions
docker service inspect advtom_backend --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}'
docker service inspect advtom_frontend --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}'
```

### Common Code Patterns

**Backend Controller Pattern:**
```typescript
import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';

export const getItems = async (req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      where: { companyId: req.user.companyId }  // Always filter by tenant
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};
```

**Frontend API Call Pattern:**
```typescript
import api from '../services/api';

const fetchItems = async () => {
  try {
    const response = await api.get('/items');
    setItems(response.data);
  } catch (error) {
    toast.error('Failed to fetch items');
    console.error(error);
  }
};
```
