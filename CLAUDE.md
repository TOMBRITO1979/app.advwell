# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Note**: There is also a `README.md` file (in Portuguese) that focuses on deployment instructions for end users. This CLAUDE.md file is the comprehensive technical reference for development.

## Project Overview

AdvWell is a multitenant SaaS system for law firms with integration to DataJud CNJ (Brazilian court system). The system uses Docker Swarm for deployment with Traefik as reverse proxy handling SSL termination.

**Live URLs:**
- Frontend: https://app.advwell.pro
- Backend API: https://api.advwell.pro

**Current Versions:**
- Backend: v51-templates (deployed) - Email campaign templates with variable substitution
- Frontend: v40-tag-filter (deployed) - Template selector + tag-based recipient filtering
- Database: PostgreSQL 16 with complete schema for multitenant law firm management

**Note**: Check `docker-compose.yml` for deployed versions. Latest development may be ahead of deployed versions.

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

**Latest Updates (16/11/2025 14:25 UTC):**
- ✅ **Tag-Based Campaign Filtering (v40-tag-filter frontend)** - Filter campaign recipients by client tags
  - **Feature:** Choose between sending to all clients or only clients with specific tag
  - **User Interface:**
    - Radio buttons to select "Todos os clientes" or "Apenas clientes com tag específica"
    - Dropdown shows available tags with recipient count for each tag
    - Real-time display of total recipients based on selection
    - Validation prevents sending without selecting a tag when filter is active
  - **Frontend Implementation:**
    - `frontend/src/pages/Campaigns.tsx:21-26` - Added tag field to Client interface
    - `frontend/src/pages/Campaigns.tsx:53-55` - New states: recipientFilter, selectedTag, availableTags
    - `frontend/src/pages/Campaigns.tsx:91-107` - Enhanced loadClients() to extract unique tags
    - `frontend/src/pages/Campaigns.tsx:141-176` - Updated handleSubmit() with tag filtering logic
    - `frontend/src/pages/Campaigns.tsx:510-580` - Complete recipient filter UI with radio buttons
  - **Tag Extraction:**
    - Automatically extracts all unique tags from clients with emails
    - Sorts tags alphabetically
    - Shows recipient count for each tag in dropdown
  - **Validation:**
    - Requires tag selection when "filter by tag" is active
    - Shows specific error messages for each scenario
    - Displays filtered recipient count before campaign creation
  - **User Experience:**
    - Clean radio button interface
    - Dropdown only appears when "filter by tag" is selected
    - Shows real-time count of recipients for selected tag
    - Informative messages guide user through process
  - **Testing:** ✅ Tag extraction working, ✅ Filtering logic correct, ✅ UI responsive and intuitive
  - **Impact:** Law firms can now segment their email campaigns by client categories (e.g., "VIP", "Inadimplente", "Novos Clientes")
  - **Status:** Deployed and verified working in production

**Previous Updates (16/11/2025 14:05 UTC):**
- ✅ **Email Campaign Templates (v51-templates backend, v39-templates frontend)** - Pre-built professional email templates with variable substitution
  - **Feature:** 4 professional HTML email templates for common law firm communications
  - **Templates Included:**
    1. **Perícia Marcada** - Medical exam scheduled notification (green theme)
    2. **Processo Pendente** - Process pending, urgent contact needed (orange warning theme)
    3. **Processo Finalizado** - Process completed, client must visit office (green success theme)
    4. **Audiência Marcada** - Hearing scheduled, urgent contact needed (blue theme)
  - **Variable Substitution:** All templates support dynamic variables:
    - `{nome_cliente}` - Client name (from recipient name or email)
    - `{nome_empresa}` - Company name (from campaign company)
    - `{data}` - Current year
  - **Backend Implementation:**
    - `backend/src/utils/email-templates.ts` - Template definitions with replaceTemplateVariables() function
    - `backend/src/controllers/campaign.controller.ts:7-39` - getTemplates() and getTemplate() methods
    - `backend/src/routes/campaign.routes.ts:21-22` - Template endpoints (must be before /:id routes)
    - `backend/src/services/campaign.service.ts:47-62` - Variable substitution during email sending
  - **Frontend Implementation:**
    - `frontend/src/pages/Campaigns.tsx:27-33` - EmailTemplate interface
    - `frontend/src/pages/Campaigns.tsx:38,43` - Templates state and selectedTemplate state
    - `frontend/src/pages/Campaigns.tsx:95-125` - loadTemplates() and handleTemplateSelect() functions
    - `frontend/src/pages/Campaigns.tsx:415-435` - Template selector dropdown in campaign modal
  - **API Endpoints:**
    - `GET /api/campaigns/templates` - List all available templates (returns id, name, subject, preview)
    - `GET /api/campaigns/templates/:id` - Get full template with HTML body
  - **User Experience:**
    - Green info box at top of "Nova Campanha" modal
    - Dropdown with template selection
    - Auto-populates name, subject, and body when template selected
    - Shows hint about available variables
    - Templates fully responsive and email-client compatible
  - **Template Design:**
    - Professional HTML with inline CSS for email compatibility
    - Color-coded by urgency/type (green, orange, blue, red)
    - Responsive design with mobile support
    - Call-to-action buttons with phone links
    - Clear visual hierarchy with icons and gradients
  - **Testing:** ✅ All endpoints working, ✅ Templates load correctly, ✅ Variable substitution working
  - **Impact:** Users can now quickly create professional campaigns using pre-built templates with personalized client information
  - **Status:** Deployed and verified working in production

**Previous Updates (15/11/2025 07:15 UTC):**
- ✅ **PDF Converter Fix (v40-pdf-fix-real)** - CRITICAL FIX for image to PDF conversion
  - **Problem:** Images were downloading as corrupted PDFs that failed to open
  - **Root Cause:** File extension detection bug - code was checking `fileName` (e.g., "teste rg") instead of `fileKey` (e.g., "...uuid.jpg")
  - **Symptom:** Logs showed original image buffer size being returned instead of PDF buffer (e.g., 178313 bytes instead of larger PDF)
  - **Debug Process:** Added comprehensive logging to track conversion flow and identify exact issue
  - **Solution:** Changed extension detection from `fileName.split('.').pop()` to `fileKey.split('.').pop()` in pdfConverter.ts:21
  - **Technical Details:**
    - fileName from database: "teste rg" (no extension)
    - fileKey from S3: "wasolutionscorp-at-gmail.com/documents/7d7e81b9-381a-4d96-a212-f60031ecd206.jpg" (has extension)
    - Extension detection now correctly identifies .jpg, .png, .gif for conversion
  - **Backend Changes:**
    - `backend/src/utils/pdfConverter.ts:6-41` - Added comprehensive debug logging
    - `backend/src/utils/pdfConverter.ts:21` - Fixed extension detection to use fileKey
    - `backend/src/utils/pdfConverter.ts:52-113` - Enhanced imageToPdf with detailed logging
  - **Testing:** ✅ Images now convert to valid PDFs, ✅ PDFs open correctly in viewers
  - **Impact:** Users can now successfully download documents as PDFs with image files properly converted
  - **Status:** Deployed and verified working in production
- ✅ **Document Download Button (v23-download-button)** - Added separate buttons for viewing and downloading documents
  - **Feature:** Two action buttons in document list
  - **Visualizar Button:** Blue button with eye icon - opens document in new browser tab
  - **Download Button:** Green button with download icon - forces direct file download
  - **Implementation:** New handleDownloadDocument() function creates temporary anchor element with download attribute
  - **UX Improvement:** Clear visual distinction between viewing and downloading actions
  - **Icons:** SVG icons from Heroicons for professional appearance
  - **File:** frontend/src/pages/Documents.tsx (lines 252-264 and 489-513)
- ✅ **S3 Search Endpoint Fix (v37.1-s3-search-fix)** - Critical fix for missing presigned URLs in search endpoint
  - **Problem:** v37 fixed getDocument() and listDocuments() but missed searchDocuments() endpoint
  - **Impact:** Frontend uses `/documents/search` to load documents, so users still got Access Denied
  - **Root Cause:** searchDocuments() was returning raw database URLs instead of generating signed URLs
  - **Solution:** Added presigned URL generation to searchDocuments() endpoint (document.controller.ts:399-414)
  - **Testing:** ✅ All three document endpoints now return signed URLs
  - **Status:** Deployed and verified working
- ✅ **S3 Document Download Fix (v37-s3-signed-urls)** - Fixed S3 Access Denied error on document downloads
  - **Problem:** Users downloading uploaded documents received XML error: `<Error><Code>AccessDenied</Code><Message>Access Denied</Message></Error>`
  - **Root Cause:** S3 bucket is private, public URLs don't work for authentication-required buckets
  - **Solution:** Implemented presigned URLs with 1-hour expiration
  - **Backend Changes:**
    - `document.controller.ts:125-134` - `getDocument()` returns signed URL for upload-type documents
    - `document.controller.ts:66-81` - `listDocuments()` generates signed URLs for all upload documents
    - Uses `@aws-sdk/s3-request-presigner` getSignedUrl() function
  - **Technical:** URLs expire in 3600 seconds (1 hour) for security
  - **Testing:** ✅ Document downloads now return actual files instead of Access Denied errors
  - **Impact:** Users can now successfully download uploaded documents from the platform
- ✅ **Financial Module Fix (v36-financial-summary-fix)** - Fixed white screen on Financial tab
  - **Problem:** Frontend expected `/api/financial` to return both transactions AND summary
  - **Root Cause:** Backend endpoint only returned `{ data: [...] }` without summary field
  - **Frontend Error:** `Cannot read properties of undefined (reading 'totalIncome')`
  - **Solution:** Added summary calculation to `/api/financial` listTransactions endpoint
  - **Backend Changes:** financial.controller.ts lines 63-86 - calculates totalIncome, totalExpense, balance
  - **Response Format:** `{ data: [...transactions...], summary: { totalIncome, totalExpense, balance } }`
  - **Testing:** ✅ Summary field returned, ✅ Financial tab loads without errors
  - **Impact:** Financial dashboard now displays correct summary cards (Receitas, Despesas, Saldo)
- ✅ **Visual Consistency (v22-style-consistency)** - Standardized auth pages design
  - **Pages Updated:** /register and /forgot-password
  - **Register Changes:**
    - Added `dark:text-white` to all input fields for proper dark mode text color
    - Updated "Faça login" link colors: `text-green-600 dark:text-green-200 hover:text-green-700 dark:hover:text-green-100`
  - **ForgotPassword Changes:**
    - Increased title size from `text-4xl` to `text-5xl` to match Login page
    - Applied to both form view and success confirmation view
  - **Consistent Design Elements:**
    - 🎨 Background: `bg-gradient-to-br from-green-600 via-green-600 to-green-700`
    - 🌟 Animated green blobs with blur effects
    - 📦 Card: `backdrop-blur-xl bg-white/85 dark:bg-slate-900/75 rounded-3xl`
    - 🔤 Titles: `text-5xl font-extrabold` with `drop-shadow-2xl`
    - 🎯 Inputs: `outline-green-400/60 hover:outline-green-500 focus:outline-green-500`
    - 🔘 Buttons: `bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700`
  - **Testing:** ✅ All auth pages visually consistent, ✅ Dark mode working properly

**Previous Updates (15/11/2025 03:15 UTC):**
- ✅ **6-Phase Security Implementation - COMPLETE** - Production-grade security hardening
  - **FASE 1: Input Validation (v25-validation-fix)** - express-validator on all endpoints
    - Email validation with proper format checking
    - Required field validation (name, email, password, etc.)
    - Type validation for all inputs
    - Error messages with field-level details
    - **Testing:** ✅ Validates email format, ✅ Rejects empty fields, ✅ Returns detailed errors
  - **FASE 2: XSS Protection (v26-xss-protection)** - DOMPurify + express-validator
    - Frontend: DOMPurify sanitization before rendering user input
    - Backend: express-validator HTML escaping by default
    - Protection against script injection in forms
    - **Testing:** ✅ XSS payloads blocked, ✅ Safe HTML rendering
  - **FASE 3: Rate Limiting (v27-rate-limiting)** - Dedicated rate limiter per endpoint
    - Global rate limiter: 100 requests per 15 minutes per IP
    - Auth endpoints: 20 requests per 15 minutes per IP
    - Sensitive operations protected from brute force
    - **Configuration:** backend/src/middleware/rateLimiter.ts
  - **FASE 4: Password Strengthening (v28-bcrypt-12)** - Enhanced password hashing
    - Bcrypt factor increased from 10 to 12 (4x slower, more secure)
    - Applies to new registrations and password resets
    - Existing passwords maintain factor 10 until reset
    - **Code:** auth.controller.ts:24, 248
  - **FASE 5: Account Lockout (v29-account-lockout)** - Brute force protection
    - Locks account after 5 failed login attempts
    - 15-minute lockout period
    - Counter increments with each failed attempt
    - Shows remaining attempts to user (e.g., "Tentativa 3 de 5")
    - Automatic unlock after timeout
    - **Database fields:** failedLoginAttempts, lastFailedLoginAt, accountLockedUntil
    - **Testing:** ✅ Locks after 5 attempts, ✅ Blocks correct password during lockout, ✅ Auto-unlocks after 15min
  - **FASE 6: Structured Logging (v30-logging)** - Winston professional logging
    - Winston logger with JSON structured logs
    - Security event tracking: login_success, login_failed, account_locked, password_reset, email_verified
    - Application logging: error, warn, info, debug levels
    - Colorized console output for development
    - Complete metadata: timestamp, service, category, event, email, userId, IP, attempt count
    - **File:** backend/src/utils/logger.ts (152 lines, complete implementation)
    - **Testing:** ✅ Structured JSON logs, ✅ All security events tracked, ✅ Full metadata captured

  **Security Summary:**
  - ✅ Input validation prevents invalid data entry
  - ✅ XSS protection prevents script injection attacks
  - ✅ Rate limiting prevents brute force and DoS attacks
  - ✅ Bcrypt 12 provides strong password protection
  - ✅ Account lockout prevents credential stuffing
  - ✅ Structured logging provides complete audit trail

  **Production Testing:**
  - All 6 phases tested individually and together
  - No regressions in existing functionality
  - Performance impact minimal (bcrypt 12 adds ~100ms per hash)
  - Logs verified in production environment

  **Version Progression:**
  v25-validation-fix → v26-xss-protection → v27-rate-limiting → v28-bcrypt-12 → v29-account-lockout → v30-logging

**Previous Updates (07/11/2025 03:15 UTC):**
- ✅ **Updates Feature - Complete Implementation** - New "Atualizações" tab for process notifications
  - **Problem Solved:** Users needed to see which processes were updated via DataJud sync
  - **Implementation:** New database field `lastAcknowledgedAt` on Case table to track when user last viewed updates
  - **Frontend:** Complete Updates page with process list, "Marcar como Ciente" functionality
  - **Layout Fix:** Added Layout component wrapper to show sidebar/header (v17-updates-layout)
  - **Backend:** v21-updates, Frontend: v17-updates-layout
  - **Migration:** `add_last_acknowledged_at.sql` adds timestamp field to cases
  - **Testing:** ✅ Feature deployed and tested in production
- ✅ **Green Theme Application** - Complete color palette change from blue to green
  - **Implementation:** Used sed to replace all blue-* Tailwind classes with green-*
  - **Coverage:** 161 replacements across all .tsx files
  - **Verification:** 0 blue colors remaining after replacement
  - **Version:** Frontend v19-green-theme
- ✅ **Permission System Enhancement** - Added new resources to permission management
  - **New Permissions:** "Atualizações" (updates) and "Documentos" (documents)
  - **Implementation:** Updated AVAILABLE_RESOURCES array in Users.tsx
  - **Version:** Frontend v18-permissions
  - **Impact:** Admins can now grant granular access to Updates and Documents features
- ✅ **Document Upload Authorization Fix** - Fixed upload failing for SUPER_ADMIN users
  - **Problem:** Document upload returned "Admin da empresa não encontrado" error
  - **Root Cause:** Admin lookup only searched for role 'ADMIN', excluding SUPER_ADMIN
  - **Fix:** Changed `role: 'ADMIN'` to `role: { in: ['ADMIN', 'SUPER_ADMIN'] }` in document.controller.ts:447
  - **Version:** Backend v22-document-fix
  - **Impact:** All user roles (USER, ADMIN, SUPER_ADMIN) can now upload documents
  - **Testing:** ✅ Production tested with SUPER_ADMIN user
- ✅ **Complete Backup** - Full system backup at `/root/advtom/backups/20251107_031512_v22_green_theme/` (1.0GB)
- ✅ **DockerHub Updated** - Images pushed: `tomautomations/advwell-backend:v22-document-fix`, `tomautomations/advwell-frontend:v19-green-theme`

**Previous Updates (04/11/2025 22:37 UTC):**
- ✅ **S3 Email-Based Folder Structure** - MAJOR IMPROVEMENT for document organization
  - **Problem Fixed:** Files were organized by company UUID, hard to identify in S3 console
  - **Before:** `company-09fb2517-f437-4abb-870f-6cd294e3c93b/documents/file.pdf`
  - **After:** `admin-at-company.com/documents/file.pdf`
  - **Implementation:** Email sanitization function converts admin email to safe folder name
  - **Technical:** `backend/src/utils/s3.ts:8-15` sanitization, `document.controller.ts:444-455` admin lookup
  - **Protection:** Admin email cannot be modified (existing user controller protection)
  - **Benefits:** Visual organization like "waha" system, easy to identify companies in S3
  - **Testing:** ✅ Automated test passed, ✅ Production upload successful
- ✅ **Complete Backup** - Full system backup at `/root/advtom/backups/20251104_223732_v20_email_s3_structure/` (1.0GB)
- ✅ **DockerHub Updated** - Image pushed: `tomautomations/advwell-backend:v20-email-folders`

**Previous Updates (04/11/2025 03:15 UTC):**
- ✅ **CRITICAL BUG FIX - Synchronization Error** - Fixed TypeError in syncMovements
  - **Problem:** `TypeError: Cannot read properties of undefined (reading 'getUltimoAndamento')`
  - **Root Cause:** Method `getUltimoAndamento` was a private class method, losing `this` context when called
  - **Solution:** Moved `getUltimoAndamento` outside class as standalone utility function
  - **Impact:** Synchronization now works without errors, cron jobs and manual syncs functional
  - **File:** `backend/src/controllers/case.controller.ts` lines 7-19, 63, 297
  - **Tests:** ✅ Build successful, ✅ Deployment successful, ✅ No errors in logs
- ✅ **Complete Backup** - Full system backup at `/root/advtom/backups/20251104_031522_v16_sync_fix/` (1.01GB)
- ✅ **DockerHub Updated** - Image pushed: `tomautomations/advwell-backend:v16-sync-fix`

**Previous Updates (04/11/2025 03:00 UTC):**
- ✅ **informarCliente Field - Boolean → Text** - MAJOR ENHANCEMENT for client communication
  - **Problem Fixed:** Field was just a checkbox (true/false), couldn't add explanatory text
  - **Before:** `informarCliente Boolean @default(false)` - just a flag
  - **After:** `informarCliente String?` - full text field with multi-line support
  - **Migration:** `alter_informar_cliente_to_text.sql` - safely converted existing data
  - **Frontend:** Checkbox replaced with textarea (3 rows, placeholder text)
  - **Label:** Renamed to "Informar Andamento ao Cliente"
- ✅ **View Button in Cases Table** - Quick view without editing
  - **Eye Icon:** Added in actions column (lucide-react)
  - **Conditional Display:** Only shows when `informarCliente` has content
- ✅ **Visualization Modal** - Complete case information display
  - **Content:** Process number, client name, subject, último andamento (DataJud), informarCliente text, process link
  - **Styling:** Blue box for DataJud movement, green highlighted box for client information
  - **Multi-line Support:** Text preserves line breaks with `whitespace-pre-wrap`

**Previous Updates (03/11/2025 21:00 UTC):**
- ✅ **DataJud Multi-Grade Synchronization** - CRITICAL FIX for case movements
  - **Problem Fixed:** System now captures movements from ALL court degrees (G1, G2, G3, etc.)
  - **Before:** Only movements from G1 (First Instance) were captured
  - **After:** Automatically combines movements from G1 + G2 (Appeals) + G3 (Higher Courts)
  - **Impact:** Cases with appeals now show ALL updated movements
  - **Example:** Process `0008903-36.2022.8.19.0038` went from 62 movements (only G1) to 78 movements (G1+G2), with latest movement from 30/06/2025
  - **Technical:** Modified `backend/src/services/datajud.service.ts` to detect and merge multiple hits from DataJud API
  - **Auto-Deduplication:** Removes duplicate movements based on code + date + name
- ✅ **Mobile-Responsive Button Layout** - Financial, Clients, Cases, Documents pages
- ✅ **Company Creation CNPJ Fix** - Fixed unique constraint violation

**Previous Updates (03/11/2025 03:22 UTC):**
- ✅ **Modern Email Templates** - Redesigned password reset and welcome emails
- ✅ **Mobile-First Responsive Design** - Complete mobile optimization
- ✅ **Collapsible Sidebar** - Expandable/collapsible sidebar with localStorage persistence

**Previous Updates (03/11/2025 02:20 UTC):**
- ✅ **Sidebar Recolhível** - Funcionalidade para expandir/recolher sidebar no desktop
- ✅ **Persistência de Estado** - Preferência do sidebar salva em localStorage
- ✅ **UX Aprimorada** - Transição suave de 300ms, tooltips quando recolhido
- ✅ **Responsividade** - Largura adaptável: 64px (recolhido) / 256px (expandido)

**Previous Updates (03/11/2025 01:49 UTC):**
- ✅ **CSV Import/Export** - Bulk import and export of clients and cases
- ✅ **AdvWell Branding** - Complete rebranding from AdvTom to AdvWell
- ✅ **Import Validation** - Detailed error reporting per line with success/failure counts
- ✅ **Multiple Format Support** - Date formats (DD/MM/YYYY, YYYY-MM-DD) and currency values

**Previous Updates (02/11/2025 22:04 UTC):**
- ✅ **Document Management** - New "Documentos" tab for managing client/case documents
- ✅ **External Links** - Support for Google Drive, Google Docs, Minio, and custom links
- ✅ **Autocomplete Search** - Search documents by client name/CPF or process number
- ✅ **Document Modal** - Add and view documents with metadata (name, description, type, date)

**Previous Updates (02/11/2025 21:29 UTC):**
- ✅ **Parts Table View** - Changed from cards to clean table format showing only essential fields
- ✅ **Birth Date Field** - Added birthDate column to case_parts table and UI
- ✅ **Edit Modal** - Click "Editar" button in any row to edit all part fields

**Previous Updates (02/11/2025):**
- ✅ **URL Migration** - System migrated from advtom.com to advwell.pro
- ✅ **Case Parts Save/Load Fix** - Fixed issue where parts weren't being saved or loaded correctly
- ✅ **Database Population** - 646+ records across all tables (5 companies, 26 users, 75 clients, 50 cases)

**Previous Updates (01/11/2025):**
- ✅ **Case Parts Management** - Add parties to cases (Autor, Réu, Representante Legal)
- ✅ **Client Autocomplete** - Smart search for 5000+ clients with filtering
- ✅ **Conditional Fields** - Different fields based on party type (AUTOR has email, civil status, profession, RG)
- ✅ **Company Settings Page** - Configure company information (address, phone, city, state, ZIP, logo)
- ✅ **Enhanced PDF Reports** - Company data automatically included in PDF headers
- ✅ **Financial Module** - PDF/CSV export with professional formatting
- ✅ **SSL Certificates** - Auto-renewal with Let's Encrypt (valid until Jan 2026)
- ✅ Support for large datasets (1000+ records) with efficient filtering

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
- `Company` → has many `User`, `Client`, `Case`
- `User` → belongs to `Company`, has many `Permission`
- `Client` → belongs to `Company`, has many `Case`
- `Case` → belongs to `Company` and `Client`, has many `CaseMovement` and `CaseDocument`

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

The financial module provides income and expense tracking for law firms (backend/src/controllers/financial.controller.ts):

**Features:**
- Track income (INCOME) and expense (EXPENSE) transactions
- Link transactions to clients (required) and cases (optional)
- Automatic balance calculation (total income - total expenses)
- Filter by transaction type, client, case, and date range
- Search by description, client name, or CPF
- Pagination support for large datasets
- Export transactions to PDF and CSV formats

**Database Model** (backend/prisma/schema.prisma):
- `FinancialTransaction` model with fields: id, companyId, clientId, caseId, type, description, amount, date
- `TransactionType` enum: INCOME | EXPENSE
- Belongs to Company and Client (required), Case (optional)

**API Endpoints** (backend/src/routes/financial.routes.ts):
- `GET /api/financial` - List transactions with filters and pagination
- `GET /api/financial/summary` - Get financial summary (income, expense, balance)
- `GET /api/financial/:id` - Get single transaction
- `POST /api/financial` - Create new transaction
- `PUT /api/financial/:id` - Update transaction
- `DELETE /api/financial/:id` - Delete transaction
- `GET /api/financial/export/pdf` - Export transactions to PDF
- `GET /api/financial/export/csv` - Export transactions to CSV

**Frontend** (frontend/src/pages/Financial.tsx):
- Summary cards showing total income, expenses, and balance
- **Autocomplete search for clients and cases** - Type-ahead search that filters as you type
  - Client autocomplete: Search by name or CPF, displays suggestions in real-time
  - Case autocomplete: Search by process number or subject
  - Supports large datasets (1000+ records) efficiently
- Filter controls for type, client, and date range
- Transaction table with full CRUD operations
- **Export buttons for PDF and CSV generation**
  - PDF: Professional formatted report with summary and transaction details
  - CSV: Excel-compatible format with UTF-8 BOM encoding

### Company Settings Module

The settings module allows admins to configure their company information, which is then used in generated PDF reports (backend/src/controllers/company.controller.ts):

**Features:**
- Update company name, email, phone
- Configure complete address (street, city, state, ZIP code)
- Set company logo URL
- Data automatically included in PDF report headers
- Restricted to ADMIN and SUPER_ADMIN roles

**Database Fields** (backend/prisma/schema.prisma):
- Extended `Company` model with fields: city, state, zipCode, logo
- All fields are optional except name and email

**API Endpoints** (backend/src/routes/company.routes.ts):
- `GET /api/companies/own` - Get current user's company settings (ADMIN+)
- `PUT /api/companies/own` - Update current user's company settings (ADMIN+)
- `GET /api/companies` - List all companies (SUPER_ADMIN only)
- `POST /api/companies` - Create new company (SUPER_ADMIN only)
- `PUT /api/companies/:id` - Update any company (SUPER_ADMIN only)

**Frontend** (frontend/src/pages/Settings.tsx):
- Clean form interface with two sections: Basic Information and Address
- Real-time validation
- Success/error notifications
- Information box explaining PDF integration
- Accessible via `/settings` route or Settings menu item

**Important Route Order:**
Routes with literal paths (`/own`) must be defined BEFORE parameterized routes (`/:id`) to avoid routing conflicts.

```typescript
// ✅ Correct order
router.get('/own', requireAdmin, controller.getOwn);
router.put('/own', requireAdmin, controller.updateOwn);
router.put('/:id', requireSuperAdmin, controller.update);

// ❌ Wrong order (would treat "own" as an ID)
router.put('/:id', requireSuperAdmin, controller.update);
router.put('/own', requireAdmin, controller.updateOwn);
```

### CSV Import/Export Module

The CSV import/export feature allows bulk operations for clients and cases, essential for data migration and backup.

**Features:**
- Export all clients or cases to CSV format
- Import clients and cases in bulk from CSV files
- Detailed validation with line-by-line error reporting
- Support for multiple date formats (DD/MM/YYYY, YYYY-MM-DD)
- Currency parsing for Brazilian format (R$ 1.000,00)
- Client lookup by CPF or name for case imports
- UTF-8 BOM encoding for Excel compatibility

**Backend Dependencies:**
- `csv-parse` - CSV parsing library
- `multer` - File upload middleware for multipart/form-data

**API Endpoints:**

**Clients** (backend/src/routes/client.routes.ts):
- `GET /api/clients/export/csv` - Export all clients to CSV
- `POST /api/clients/import/csv` - Import clients from CSV file

**Cases** (backend/src/routes/case.routes.ts):
- `GET /api/cases/export/csv` - Export all cases to CSV
- `POST /api/cases/import/csv` - Import cases from CSV file

**CSV Format - Clients:**
```csv
Nome,CPF,Email,Telefone,Endereço,Data de Nascimento,Observações
João Silva,12345678900,joao@email.com,(11) 98765-4321,Rua A 123,01/01/1990,Cliente VIP
```

**CSV Format - Cases:**
```csv
Número do Processo,Cliente,CPF Cliente,Tribunal,Assunto,Valor,Status,Observações
1234567-89.2024.8.19.0001,João Silva,12345678900,TJRJ,Ação Civil,R$ 10.000,00,ACTIVE,Processo em andamento
```

**Import Validation:**
- **Clients:** Nome (required), CPF/Email (optional but recommended)
- **Cases:** Número do Processo (required), Cliente or CPF Cliente (required)
- Client lookup: Searches by CPF first, then by name if CPF not found
- Duplicate detection: Process numbers must be unique

**Frontend Implementation:**

**Clients Page** (frontend/src/pages/Clients.tsx):
- Purple "Importar CSV" button next to "Exportar CSV"
- Hidden file input triggered by button click
- Results modal showing total/success/error counts
- Detailed error list with line numbers

**Cases Page** (frontend/src/pages/Cases.tsx):
- Same pattern as Clients page
- Import validation includes client verification

**Error Handling:**
- Per-line validation prevents one error from blocking entire import
- Results object contains: total, success count, and array of errors
- Each error includes: line number, identifier (name/process number), error message

**Implementation Details** (backend/src/controllers):
```typescript
// Type assertion for CSV records
for (let i = 0; i < records.length; i++) {
  const record = records[i] as any;
  // Process record...
}
```

### Document Management Module

The document management module allows users to store and organize documents related to clients and cases, supporting both file uploads and external links (backend/src/controllers/document.controller.ts):

**Features:**
- Store documents for clients or cases (one required)
- Support for two storage types: uploads (S3) and external links
- External link types: Google Drive, Google Docs, Minio, Other
- Autocomplete search by client name/CPF or process number
- View all documents for a specific client or case
- Open documents (S3 presigned URLs or external links)
- Delete documents with cascade cleanup

**Database Model** (backend/prisma/schema.prisma):
- `Document` model with fields: id, companyId, caseId, clientId, name, description, storageType, fileUrl, fileKey, fileSize, fileType, externalUrl, externalType, uploadedBy, createdAt, updatedAt
- `StorageType` enum: upload | link
- `ExternalType` enum: google_drive | google_docs | minio | other
- Belongs to Company, Client (optional), Case (optional), User (uploader)
- Check constraints: must have either caseId OR clientId (not both)
- Check constraints: upload requires fileUrl, link requires externalUrl

**API Endpoints** (backend/src/routes/document.routes.ts):
- `GET /api/documents` - List documents with filters (clientId, caseId, storageType, search, pagination)
- `GET /api/documents/search` - Search documents by clientId or caseId
- `GET /api/documents/:id` - Get single document with related data
- `POST /api/documents` - Create new document
- `PUT /api/documents/:id` - Update document (name, description, externalUrl, externalType)
- `DELETE /api/documents/:id` - Delete document

**Frontend** (frontend/src/pages/Documents.tsx):
- Search interface: Select client or case, autocomplete dropdown
- "Visualizar Documentos" button: Opens modal with document list
- "Adicionar Documento" button: Opens modal to add new document
- Document form: Name, description, storage type (upload/link), external URL, external type
- Document list: Shows name, type, date, uploader, with "Abrir" and "Excluir" buttons
- **Current limitation:** File upload shows warning to use external links (upload functionality prepared but not implemented)
- Accessible via `/documents` route with "Documentos" menu item

**Migration:** `/root/advtom/backend/migrations_manual/add_documents.sql`

**Future Enhancements:**
- Implement actual file upload to S3
- Add document preview (PDF, images)
- Implement document editing
- Add filters and sorting in document list
- Automatic S3 file deletion when document is deleted

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

The system includes modern, responsive HTML email templates for password reset and welcome emails (v9-modern-emails):

**Location:** `backend/src/utils/email.ts`

**Email Functions:**
- `sendPasswordResetEmail(email: string, resetToken: string)` - Password reset email
- `sendWelcomeEmail(email: string, name: string)` - Welcome email for new users

**Design Features:**
- **Responsive HTML Tables** - Compatible with all email clients (Gmail, Outlook, Apple Mail)
- **Modern Visual Design:**
  - Branded header with blue gradient (linear-gradient(135deg, #2563eb 0%, #1e40af 100%))
  - Professional typography using system fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto)
  - Visual icons in colored circles (🔐 for security, 👋 for welcome)
  - Prominent CTA button with gradient and shadow
  - Security warning boxes with yellow background and orange border
  - Clean footer with copyright and company info
- **Mobile Responsive** - Adapts to different screen sizes
- **Inline CSS** - All styles inline for maximum email client compatibility

**Password Reset Email Structure:**
```html
1. Header: AdvWell logo with blue gradient background
2. Lock icon in blue circle
3. Title: "Redefinição de Senha"
4. Main message explaining the password reset request
5. Large "Redefinir Minha Senha" button (links to reset URL)
6. Divider
7. Alternative link in gray box (for manual copy-paste)
8. Security warning box (yellow with ⚠️ icon, 1-hour expiration notice)
9. Footer message (ignore if not requested)
10. Professional footer with copyright
```

**Welcome Email Structure:**
```html
1. Header: AdvWell logo with blue gradient background
2. Wave icon in green circle
3. Title: "Bem-vindo ao AdvWell!"
4. Personalized greeting with user's name
5. Success message
6. Features box listing main system capabilities:
   - ✓ Gerenciar clientes e processos
   - ✓ Controle financeiro completo
   - ✓ Integração com DataJud CNJ
   - ✓ Gestão de documentos
7. Large "Acessar o Sistema" button (links to frontend URL)
8. Alternative link
9. Professional sign-off from "Equipe AdvWell"
10. Footer with copyright
```

**Configuration:**
Email settings are configured in `docker-compose.yml`:
```yaml
SMTP_HOST: smtp.gmail.com
SMTP_PORT: 587
SMTP_USER: appadvwell@gmail.com
SMTP_PASSWORD: [app-specific password]
SMTP_FROM: AdvWell <appadvwell@gmail.com>
FRONTEND_URL: https://app.advwell.pro
```

**Best Practices:**
- Always use HTML tables for layout (better email client support)
- Use inline CSS only (external stylesheets don't work in most email clients)
- Test emails in multiple clients before deploying
- Include both HTML button and plain text link
- Keep email width at max 600px for optimal display
- Use web-safe fonts or system font stacks

### Mobile Responsiveness

The frontend has been optimized for mobile devices with a mobile-first approach (v8-mobile-responsive):

**Key Files:**
- `frontend/src/components/Layout.tsx` - Main layout with mobile optimizations
- `frontend/src/components/ResponsiveTable.tsx` - Reusable table wrapper for horizontal scroll
- `frontend/src/styles/index.css` - Global mobile-first CSS utilities

**Layout Component Improvements (frontend/src/components/Layout.tsx):**

**Header:**
- Sticky positioning (`sticky top-0 z-30`) - Remains visible when scrolling
- Responsive padding: `px-3 sm:px-4 lg:px-8` and `py-3 sm:py-4`
- Responsive logo size: `text-lg sm:text-2xl`
- Mobile menu button with hamburger icon (visible on `lg:hidden`)
- User info hidden on mobile (`hidden sm:block`)
- Smaller logout icon on mobile: `size={18} className="sm:w-5 sm:h-5"`

**Sidebar:**
- Mobile: Slide-in animation with `translate-x-0` / `-translate-x-full`
- Dark overlay when open: `bg-black bg-opacity-50 z-20 lg:hidden`
- Smooth transitions: `transition-transform duration-300 ease-in-out`
- Fixed positioning on mobile, sticky on desktop
- Z-index layering: `z-30 lg:z-10` for proper stacking
- Closes on overlay click or menu item selection
- Desktop: Collapsible with saved state in localStorage

**Main Content:**
- Responsive padding: `p-3 sm:p-4 lg:p-8`
- Prevents overflow: `w-full min-w-0`
- Centered with max-width: `max-w-7xl mx-auto`

**Global CSS Utilities (frontend/src/styles/index.css):**

**Touch-Friendly Elements:**
```css
input, select, textarea {
  min-h-[44px];  /* Apple HIG minimum touch target */
  text-base;     /* Readable font size */
}

button {
  min-h-[44px];
  touch-manipulation;  /* Optimizes touch response */
}
```

**iOS-Specific Fixes:**
```css
/* Prevents auto-zoom on input focus in iOS Safari */
@supports (-webkit-touch-callout: none) {
  input, select, textarea {
    font-size: 16px !important;
  }
}
```

**Responsive Table Utilities:**
```css
.responsive-table {
  w-full;
  overflow-x-auto;
  -mx-3 sm:mx-0;  /* Extends to screen edges on mobile */
}

.modal-content {
  w-full;
  max-h-[90vh];
  overflow-y-auto;
}
```

**ResponsiveTable Component (frontend/src/components/ResponsiveTable.tsx):**

Simple wrapper component for tables that need horizontal scrolling on mobile:

```tsx
import React from 'react';

interface ResponsiveTableProps {
  children: React.ReactNode;
}

const ResponsiveTable: React.FC<ResponsiveTableProps> = ({ children }) => {
  return (
    <div className="w-full overflow-x-auto -mx-3 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveTable;
```

**Usage:**
```tsx
<ResponsiveTable>
  <table className="min-w-full divide-y divide-gray-300">
    {/* table content */}
  </table>
</ResponsiveTable>
```

**Breakpoints (Tailwind CSS):**
- `sm:` - 640px and up (small tablets)
- `md:` - 768px and up (tablets)
- `lg:` - 1024px and up (desktops)
- Mobile-first: Default styles are for mobile, use breakpoints for larger screens

**Best Practices:**
- Always design mobile-first, then enhance for larger screens
- Use `min-h-[44px]` for all interactive elements (buttons, inputs)
- Test on real devices, not just browser dev tools
- Use `-mx-3 sm:mx-0` pattern for full-width tables on mobile
- Implement sticky headers for better navigation on scroll
- Use `overflow-x-auto` for wide content that doesn't fit on small screens
- Font size minimum 16px on inputs to prevent iOS auto-zoom

### Case Parts Management

**Database Schema:**
The system includes a complete case parts management feature (v7-parts) allowing users to add parties to legal cases:

```typescript
// Enum for party types
enum CasePartType {
  AUTOR                // Plaintiff/Claimant
  REU                  // Defendant
  REPRESENTANTE_LEGAL  // Legal Representative
}

// Case Part Model
model CasePart {
  id          String       @id @default(uuid())
  caseId      String
  type        CasePartType

  // Common fields
  name        String
  cpfCnpj     String?      // Individual or Corporate Tax ID
  phone       String?
  address     String?

  // AUTOR-specific fields
  email       String?
  civilStatus String?      // Marital status
  profession  String?
  rg          String?      // National ID
  birthDate   DateTime?    // Birth date ← NEW in v2-partes

  case        Case         @relation(...)
}
```

**API Endpoints (backend/src/routes/case-part.routes.ts:10-14):**
```
GET    /api/cases/:caseId/parts          # List all parts
POST   /api/cases/:caseId/parts          # Create new part
PUT    /api/cases/:caseId/parts/:partId  # Update part
DELETE /api/cases/:caseId/parts/:partId  # Delete part
```

**Frontend Implementation:**

**Table View (v2-partes) - frontend/src/pages/Cases.tsx:929-1007:**
- Clean table layout replacing previous card-based grid
- Columns displayed: Tipo, Nome, CPF/CNPJ, RG, Nascimento, Ações
- Color-coded badges for part types (Autor=blue, Réu=red, Rep. Legal=green)
- "Editar" button in each row opens edit modal
- Date formatting in Brazilian format (DD/MM/YYYY)

**Edit Modal (frontend/src/pages/Cases.tsx:1112-1287):**
- Complete form with all fields
- Conditional fields based on type (Email, Estado Civil, Profissão only for AUTOR)
- Functions: `handleEditPart()` and `handleSaveEditedPart()`
- Saves via PUT `/cases/:caseId/parts/:partId`
- Auto-reloads table after save

**Add Parts Form (frontend/src/pages/Cases.tsx:568-751):**
- Autocomplete client selection (supports 5000+ clients)
- Dynamic form with conditional fields based on party type
- Client-side validation before submission

**Conditional Fields Logic:**
- All types: name (required), cpfCnpj, phone, address, rg, birthDate
- AUTOR only: email, civilStatus, profession (additional fields)
- REU & REPRESENTANTE: only common fields

**Migration:** `/root/advtom/backend/migrations_manual/add_case_parts.sql`

**Critical Fix (02/11/2025):**
Fixed two issues in `frontend/src/pages/Cases.tsx` that prevented case parts from being saved and loaded:

1. **handleEdit Function (lines 269-299):** Now fetches complete case details including parts via API call when editing a case, rather than relying only on the passed object parameter.

2. **handleSubmit Function (lines 210-225):** Now differentiates between creating new parts (POST) and updating existing parts (PUT) based on presence of `part.id`:
   ```typescript
   if (part.id) {
     // Update existing part
     await api.put(`/cases/${caseId}/parts/${part.id}`, part);
   } else {
     // Create new part
     await api.post(`/cases/${caseId}/parts`, part);
   }
   ```

**Testing:** Full CRUD test performed successfully. Parts are now properly created, updated, loaded in case details, and persist across edits. See `/root/advtom/case_parts_fix_verification.md` for complete test results.

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
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` - S3 configuration
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` - Email configuration
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

#### Quick Database Backup
```bash
docker exec $(docker ps -q -f name=advtom_postgres) pg_dump -U postgres advtom > backup.sql
```

#### Complete System Backup (RECOMMENDED)

**Latest Backup:** `/root/advtom/backups/20251104_223732_v20_email_s3_structure/` ✅ **CURRENT**
- ✅ PostgreSQL database dump (108KB)
- ✅ Backend source code v20-email-folders with email-based S3 structure (100M)
- ✅ Frontend source code v13-text-andamento (25M)
- ✅ Docker images (frontend: 53M, backend: 836M)
- ✅ docker-compose.yml with advwell.pro URLs and v20/v13 images
- ✅ Updated CLAUDE.md and BACKUP_INFO.md with detailed implementation documentation
- ✅ Automated restore script included
- **Date:** 04/11/2025 22:37 UTC
- **Total Size:** 1013M (1.0GB)
- **Feature:** Email-based S3 folder structure for visual organization
- **Status:** 100% Functional - Production tested with real uploads

**Previous Backups:**
- `/root/advtom/backups/20251104_031522_v16_sync_fix/` - Synchronization Error Fix (04/11/2025 03:15 UTC)
- `/root/advtom/backups/20251104_030045_v15_text_andamento/` - informarCliente Text Field (04/11/2025 03:00 UTC)
- `/root/advtom/backups/20251103_210053_v13_multi_grade_sync/` - DataJud Multi-Grade Sync (03/11/2025 21:00 UTC)
- `/root/advtom/backups/20251103_022005_v6_collapsible_sidebar/` - Collapsible Sidebar (03/11/2025 02:20 UTC)
- `/root/advtom/backups/20251103_014914_v5_csv_import_advwell_branding/` - CSV Import/Export + AdvWell Branding (03/11/2025 01:49 UTC)
- `/root/advtom/backups/20251102_220404_v3_documents/` - Document Management (02/11/2025 22:04 UTC)
- ✅ Backend source code v3-documents (100M)
- ✅ Frontend source code v3-documents with Documents page (25M)
- ✅ Docker images (frontend: 53M, backend: 833M)
- ✅ docker-compose.yml with advwell.pro URLs
- ✅ Updated CLAUDE.md and PLANEJAMENTO_DOCUMENTOS.md
- ✅ Automated restore script included
- **Date:** 02/11/2025 22:04 UTC
- **Total Size:** 1010M (1.0GB)
- **Features:** Document Management + External Links + Autocomplete Search
- **Status:** 100% Functional - All features tested and working

**Previous Backups:**
- `/root/advtom/backups/20251102_212911_v2_partes_tabela/` - Table view for parts + birthDate (02/11/2025 21:29 UTC)
- `/root/advtom/backups/20251102_194618_advwell_functional/` - advwell.pro migration + case parts fix (02/11/2025 19:46 UTC)
- `/root/advtom/backups/20251101_194500_v7_parts/` - Case Parts Management (01/11/2025 19:45 UTC)
- `/root/advtom/backups/20251101_183529_v6_settings/` - Company Settings (01/11/2025 18:35 UTC, 1.01GB)
- `/root/advtom/backups/20251101_013228_financeiro_funcional_v1/` - Financial module (01/11/2025 01:32 UTC)
- `/root/advtom/backups/20251030_194403_sistema_funcional/` - Basic system (30/10/2025 19:44 UTC)

#### Creating a New Backup

```bash
# Set backup directory
BACKUP_DIR="/root/advtom/backups/$(date +%Y%m%d_%H%M%S)_backup"
mkdir -p $BACKUP_DIR

# 1. Backup database
docker exec $(docker ps -q -f name=advtom_postgres) pg_dump -U postgres -d advtom > $BACKUP_DIR/database_backup.sql

# 2. Backup code
tar -czf $BACKUP_DIR/backend_code.tar.gz -C /root/advtom backend
tar -czf $BACKUP_DIR/frontend_code.tar.gz -C /root/advtom frontend

# 3. Backup configurations
cp /root/advtom/docker-compose.yml $BACKUP_DIR/
docker service inspect advtom_backend > $BACKUP_DIR/service_backend.json
docker service inspect advtom_frontend > $BACKUP_DIR/service_frontend.json
docker service inspect advtom_postgres > $BACKUP_DIR/service_postgres.json

# 4. Export Docker images
docker save tomautomations/advtom-frontend:latest -o $BACKUP_DIR/frontend_image.tar
docker save tomautomations/advtom-backend:latest -o $BACKUP_DIR/backend_image.tar

echo "✅ Backup completo criado em: $BACKUP_DIR"
```

#### Restoring from Backup

**Automated Restore (RECOMMENDED):**
```bash
# Restore to latest functional state (v2-partes with table view)
/root/advtom/backups/20251102_212911_v2_partes_tabela/restore.sh
```

This script will:
1. Stop all services
2. Restore Docker images
3. Restore source code
4. Restore configurations
5. Redeploy system
6. Restore database
7. Verify everything works

**Manual Restore Process:**

```bash
# 1. Stop services
docker stack rm advtom
sleep 15

# 2. Load Docker images
docker load -i /path/to/backup/frontend_image.tar
docker load -i /path/to/backup/backend_image.tar

# 3. Restore code (optional, if images exist)
cd /root/advtom
tar -xzf /path/to/backup/backend_code.tar.gz
tar -xzf /path/to/backup/frontend_code.tar.gz

# 4. Restore docker-compose.yml
cp /path/to/backup/docker-compose.yml /root/advtom/

# 5. Redeploy
docker stack deploy -c docker-compose.yml advtom
sleep 40

# 6. Restore database
docker exec -i $(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom < /path/to/backup/database_backup.sql

# 7. Verify
curl -k https://api.advwell.pro/health
```

**Important Notes:**
- ⚠️ Restoring will REPLACE current data with backup data
- ✅ Make a backup of the current state before restoring
- ✅ The automated script creates a log file for troubleshooting
- ✅ Reference: `/root/advtom/backups/20251102_212911_v2_partes_tabela/BACKUP_INFO.md`

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

## Security Considerations

### Password Security
- **Hashing:** Bcrypt with factor 12 for new passwords (4096 iterations)
- **Legacy passwords:** Existing passwords use factor 10 (1024 iterations) until reset
- **Strength:** New passwords hashed in ~100-150ms, providing strong protection against rainbow table attacks
- **Code locations:**
  - Registration: `auth.controller.ts:24` - `bcrypt.hash(password, 12)`
  - Password reset: `auth.controller.ts:248` - `bcrypt.hash(newPassword, 12)`

### Authentication Security
- **JWT tokens:** Time-based expiration (check `JWT_SECRET` in docker-compose.yml)
- **Account lockout:** 5 failed login attempts = 15 minute lockout
- **Database tracking:** `failedLoginAttempts`, `lastFailedLoginAt`, `accountLockedUntil` fields
- **Auto-reset:** Successful login resets failed attempt counter
- **User feedback:** Shows "Tentativa X de 5" messages to warn users

### Rate Limiting
- **Global limiter:** 100 requests per 15 minutes per IP
- **Auth endpoints:** 20 requests per 15 minutes per IP (stricter for sensitive operations)
- **Implementation:** `backend/src/middleware/rateLimiter.ts`
- **Protection against:** Brute force attacks, credential stuffing, DoS attempts
- **Response:** Returns 429 Too Many Requests when limit exceeded

### Input Validation & Sanitization
- **Backend validation:** express-validator on all input fields
  - Email format validation with RFC 5322 compliance
  - Required field checking (name, email, password, etc.)
  - Type validation (string, number, boolean)
  - Custom validators for CPF, CNPJ, phone numbers
- **XSS protection:**
  - Backend: express-validator HTML escaping by default
  - Frontend: DOMPurify sanitization before rendering user content
- **SQL injection:** Prisma ORM with parameterized queries (automatic protection)

### Security Logging & Monitoring
- **Logger:** Winston with structured JSON logs
- **Security events tracked:**
  - `login_success` - Successful authentication with userId and IP
  - `login_failed` - Failed login with reason, IP, and attempt counter
  - `account_locked` - Account lockout with unlock timestamp
  - `password_reset_requested` - Password reset initiation
  - `password_reset_completed` - Password successfully changed
  - `email_verified` - Email verification completed
- **Application logs:** error, warn, info, debug levels with full stack traces
- **Metadata captured:** timestamp, service, category, event, email, userId, IP, attempt count
- **Viewing logs:**
  ```bash
  # View security events
  docker service logs advtom_backend | grep -E "(login_success|login_failed|account_locked)"

  # View all logs
  docker service logs advtom_backend -f

  # View logs since specific time
  docker service logs advtom_backend --since 1h
  ```

### Network Security
- **Helmet.js:** Security headers enabled (XSS protection, clickjacking prevention, HSTS)
- **CORS:** Restricted to configured frontend URL (https://app.advwell.pro)
- **Proxy trust:** Set to 1 for Traefik reverse proxy (correct IP logging)
- **HTTPS only:** All traffic encrypted via Let's Encrypt SSL certificates
- **SSL termination:** Handled by Traefik with automatic certificate renewal

### Audit Trail
All security-relevant actions are logged with:
- **Who:** userId and email
- **What:** Event type (login, logout, password change, etc.)
- **When:** ISO 8601 timestamp
- **Where:** IP address
- **Result:** Success/failure with reason

**Example log entry:**
```json
{
  "timestamp": "2025-11-15 03:02:48",
  "level": "warn",
  "message": "Conta bloqueada por múltiplas tentativas",
  "service": "advwell-backend",
  "category": "security",
  "event": "account_locked",
  "email": "user@example.com",
  "userId": "9da7aeb5-f862-403d-90b3-df9df5368806",
  "unlockAt": "2025-11-15T03:17:48.819Z",
  "ip": "172.18.0.1"
}
```

### Security Testing
Comprehensive security tests available in `/tmp/`:
- `test_security_complete.sh` - All 6 security phases
- `test_lockout_full.sh` - Account lockout functionality
- `test_logging.sh` - Winston logging verification

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

1. Make changes to code
2. Test locally
3. Commit changes (if using version control)
4. Build Docker images with new version tag:
   ```bash
   # Use semantic versioning: v{number}-{feature-name}
   docker build -t tomautomations/advwell-backend:v17-new-feature backend/
   docker build --build-arg VITE_API_URL=https://api.advwell.pro/api \
     -t tomautomations/advwell-frontend:v14-new-feature frontend/
   ```
5. Push images to DockerHub:
   ```bash
   docker push tomautomations/advwell-backend:v17-new-feature
   docker push tomautomations/advwell-frontend:v14-new-feature
   ```
6. **Update docker-compose.yml** with new image versions:
   ```yaml
   backend:
     image: tomautomations/advwell-backend:v17-new-feature
   frontend:
     image: tomautomations/advwell-frontend:v14-new-feature
   ```
7. Create backup before deploying: `./criar_backup.sh`
8. Deploy: `./deploy_expect.sh` or manually via `docker stack deploy`
9. Verify: Check logs and test endpoints:
   ```bash
   curl -k https://api.advwell.pro/health
   docker service logs advtom_backend -f
   ```
10. Update CLAUDE.md "Current Versions" section with deployed versions

**Important**: Always update docker-compose.yml with the new image versions and commit it. This ensures the file reflects what's actually deployed.

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

### Database
- **Schema**: `backend/prisma/schema.prisma` - Complete database schema
- **Manual migrations**: `backend/migrations_manual/` - SQL scripts for complex migrations
- **Key tables**: Company, User, Client, Case, CasePart, CaseMovement, FinancialTransaction

### Configuration
- **Production**: `docker-compose.yml` - All environment variables and service configs
- **Backend dev**: `backend/.env` (create from environment variables in docker-compose.yml)
- **Frontend dev**: `frontend/.env` (set VITE_API_URL=http://localhost:3000/api)

## Quick Reference

### Version Control and Git
The repository has untracked test files visible in git status:
- `backend/test_informar_cliente_text.js` - Test script for informarCliente field
- `test_api_informar_cliente.sh` - Shell test for informarCliente API
- `test_sync_fix.sh` - Test script for sync fix verification

These are test files that can be safely committed or added to `.gitignore` if desired.

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
