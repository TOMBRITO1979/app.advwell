--
-- PostgreSQL database dump
--

\restrict FTepCpsgxV7CmQLtzZw8WS7iOYa9xb7W05PRwqHa1eIUJwTinmHlGkgtBjJ1FSC

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AIProvider; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AIProvider" AS ENUM (
    'openai',
    'gemini',
    'anthropic',
    'groq'
);


ALTER TYPE public."AIProvider" OWNER TO postgres;

--
-- Name: AccountPayableStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AccountPayableStatus" AS ENUM (
    'PENDING',
    'PAID',
    'OVERDUE',
    'CANCELLED'
);


ALTER TYPE public."AccountPayableStatus" OWNER TO postgres;

--
-- Name: CampaignStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CampaignStatus" AS ENUM (
    'draft',
    'sending',
    'completed',
    'failed',
    'cancelled'
);


ALTER TYPE public."CampaignStatus" OWNER TO postgres;

--
-- Name: CasePartType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CasePartType" AS ENUM (
    'AUTOR',
    'REU',
    'REPRESENTANTE_LEGAL'
);


ALTER TYPE public."CasePartType" OWNER TO postgres;

--
-- Name: CaseStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CaseStatus" AS ENUM (
    'ACTIVE',
    'ARCHIVED',
    'FINISHED'
);


ALTER TYPE public."CaseStatus" OWNER TO postgres;

--
-- Name: ExternalType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ExternalType" AS ENUM (
    'google_drive',
    'google_docs',
    'minio',
    'other'
);


ALTER TYPE public."ExternalType" OWNER TO postgres;

--
-- Name: PersonType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PersonType" AS ENUM (
    'FISICA',
    'JURIDICA'
);


ALTER TYPE public."PersonType" OWNER TO postgres;

--
-- Name: Priority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Priority" AS ENUM (
    'BAIXA',
    'MEDIA',
    'ALTA',
    'URGENTE'
);


ALTER TYPE public."Priority" OWNER TO postgres;

--
-- Name: RecipientStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RecipientStatus" AS ENUM (
    'pending',
    'sent',
    'failed'
);


ALTER TYPE public."RecipientStatus" OWNER TO postgres;

--
-- Name: RecurrencePeriod; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RecurrencePeriod" AS ENUM (
    'DAYS_15',
    'DAYS_30',
    'MONTHS_6',
    'YEAR_1'
);


ALTER TYPE public."RecurrencePeriod" OWNER TO postgres;

--
-- Name: ScheduleEventType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ScheduleEventType" AS ENUM (
    'COMPROMISSO',
    'TAREFA',
    'PRAZO',
    'AUDIENCIA',
    'GOOGLE_MEET'
);


ALTER TYPE public."ScheduleEventType" OWNER TO postgres;

--
-- Name: StorageType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."StorageType" AS ENUM (
    'upload',
    'link'
);


ALTER TYPE public."StorageType" OWNER TO postgres;

--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TransactionType" AS ENUM (
    'INCOME',
    'EXPENSE'
);


ALTER TYPE public."TransactionType" OWNER TO postgres;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserRole" AS ENUM (
    'SUPER_ADMIN',
    'ADMIN',
    'USER'
);


ALTER TYPE public."UserRole" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: accounts_payable; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts_payable (
    id text NOT NULL,
    "companyId" text NOT NULL,
    supplier text NOT NULL,
    description text NOT NULL,
    amount double precision NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "paidDate" timestamp(3) without time zone,
    status public."AccountPayableStatus" DEFAULT 'PENDING'::public."AccountPayableStatus" NOT NULL,
    category text,
    notes text,
    "createdBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isRecurring" boolean DEFAULT false,
    "recurrencePeriod" public."RecurrencePeriod",
    "parentId" text
);


ALTER TABLE public.accounts_payable OWNER TO postgres;

--
-- Name: TABLE accounts_payable; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.accounts_payable IS 'Tabela de contas a pagar';


--
-- Name: COLUMN accounts_payable.supplier; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accounts_payable.supplier IS 'Fornecedor/Credor';


--
-- Name: COLUMN accounts_payable.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accounts_payable.description IS 'Descrição da conta';


--
-- Name: COLUMN accounts_payable.amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accounts_payable.amount IS 'Valor da conta';


--
-- Name: COLUMN accounts_payable."dueDate"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accounts_payable."dueDate" IS 'Data de vencimento';


--
-- Name: COLUMN accounts_payable."paidDate"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accounts_payable."paidDate" IS 'Data de pagamento (quando pago)';


--
-- Name: COLUMN accounts_payable.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accounts_payable.status IS 'Status: PENDING, PAID, OVERDUE, CANCELLED';


--
-- Name: COLUMN accounts_payable.category; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accounts_payable.category IS 'Categoria (ex: Aluguel, Salários, Fornecedores)';


--
-- Name: COLUMN accounts_payable."isRecurring"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accounts_payable."isRecurring" IS 'Indica se a conta é recorrente';


--
-- Name: COLUMN accounts_payable."recurrencePeriod"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accounts_payable."recurrencePeriod" IS 'Período de recorrência: DAYS_15, DAYS_30, MONTHS_6, YEAR_1';


--
-- Name: COLUMN accounts_payable."parentId"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.accounts_payable."parentId" IS 'ID da conta original que gerou esta recorrência';


--
-- Name: ai_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_configs (
    id text NOT NULL,
    "companyId" text NOT NULL,
    provider public."AIProvider" NOT NULL,
    "apiKey" text NOT NULL,
    model text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "autoSummarize" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.ai_configs OWNER TO postgres;

--
-- Name: campaign_recipients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaign_recipients (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "campaignId" text NOT NULL,
    "recipientEmail" character varying(255) NOT NULL,
    "recipientName" character varying(255),
    status public."RecipientStatus" DEFAULT 'pending'::public."RecipientStatus",
    "sentAt" timestamp without time zone,
    "errorMessage" text,
    "createdAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.campaign_recipients OWNER TO postgres;

--
-- Name: TABLE campaign_recipients; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.campaign_recipients IS 'Destinatários individuais de cada campanha com rastreamento de status';


--
-- Name: COLUMN campaign_recipients.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.campaign_recipients.status IS 'Status: pending, sent, failed';


--
-- Name: COLUMN campaign_recipients."errorMessage"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.campaign_recipients."errorMessage" IS 'Mensagem de erro caso o envio falhe';


--
-- Name: case_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.case_documents (
    id text NOT NULL,
    "caseId" text NOT NULL,
    name text NOT NULL,
    "s3Key" text NOT NULL,
    "s3Url" text NOT NULL,
    "fileSize" integer NOT NULL,
    "mimeType" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.case_documents OWNER TO postgres;

--
-- Name: case_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.case_movements (
    id text NOT NULL,
    "caseId" text NOT NULL,
    "movementCode" integer NOT NULL,
    "movementName" text NOT NULL,
    "movementDate" timestamp(3) without time zone NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.case_movements OWNER TO postgres;

--
-- Name: case_parts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.case_parts (
    id text NOT NULL,
    "caseId" text NOT NULL,
    type public."CasePartType" NOT NULL,
    name text NOT NULL,
    "cpfCnpj" text,
    phone text,
    address text,
    email text,
    "civilStatus" text,
    profession text,
    rg text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "birthDate" timestamp(3) without time zone
);


ALTER TABLE public.case_parts OWNER TO postgres;

--
-- Name: cases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cases (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "clientId" text NOT NULL,
    "processNumber" text NOT NULL,
    court text NOT NULL,
    subject text NOT NULL,
    value double precision,
    status public."CaseStatus" DEFAULT 'ACTIVE'::public."CaseStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lastSyncedAt" timestamp(3) without time zone,
    "ultimoAndamento" text,
    "informarCliente" text,
    "linkProcesso" text,
    "lastAcknowledgedAt" timestamp(3) without time zone,
    "aiSummary" text
);


ALTER TABLE public.cases OWNER TO postgres;

--
-- Name: COLUMN cases."ultimoAndamento"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.cases."ultimoAndamento" IS 'Último movimento do processo, atualizado automaticamente pela API DataJud';


--
-- Name: COLUMN cases."informarCliente"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.cases."informarCliente" IS 'Texto explicativo do andamento do processo para informar ao cliente';


--
-- Name: COLUMN cases."linkProcesso"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.cases."linkProcesso" IS 'Link ou URL do processo no site do tribunal';


--
-- Name: COLUMN cases."lastAcknowledgedAt"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.cases."lastAcknowledgedAt" IS 'Última vez que o advogado marcou como "ciente" das atualizações do processo';


--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id text NOT NULL,
    "companyId" text NOT NULL,
    name text NOT NULL,
    cpf text,
    rg text,
    email text,
    phone text,
    address text,
    city text,
    state text,
    "zipCode" text,
    notes text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "birthDate" timestamp(3) without time zone,
    "maritalStatus" text,
    profession text,
    tag character varying(255),
    "personType" public."PersonType" DEFAULT 'FISICA'::public."PersonType" NOT NULL,
    "representativeName" text,
    "representativeCpf" text
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: COLUMN clients.tag; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.tag IS 'Tag ou categoria do cliente para organização';


--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id text NOT NULL,
    name text NOT NULL,
    cnpj text,
    email text NOT NULL,
    phone text,
    address text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    city text,
    state text,
    "zipCode" text,
    logo text,
    "apiKey" text
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: COLUMN companies.city; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.companies.city IS 'Cidade da empresa';


--
-- Name: COLUMN companies.state; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.companies.state IS 'Estado da empresa (UF)';


--
-- Name: COLUMN companies."zipCode"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.companies."zipCode" IS 'CEP da empresa';


--
-- Name: COLUMN companies.logo; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.companies.logo IS 'URL do logo da empresa';


--
-- Name: COLUMN companies."apiKey"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.companies."apiKey" IS 'API Key for external integrations (Chatwoot, webhooks, etc). Should be a UUID or secure random string.';


--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "caseId" text,
    "clientId" text,
    name text NOT NULL,
    description text,
    "storageType" public."StorageType" NOT NULL,
    "fileUrl" text,
    "fileKey" text,
    "fileSize" integer,
    "fileType" text,
    "externalUrl" text,
    "externalType" public."ExternalType",
    "uploadedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT check_case_or_client CHECK (((("caseId" IS NOT NULL) AND ("clientId" IS NULL)) OR (("caseId" IS NULL) AND ("clientId" IS NOT NULL)))),
    CONSTRAINT check_storage_fields CHECK (((("storageType" = 'upload'::public."StorageType") AND ("fileUrl" IS NOT NULL)) OR (("storageType" = 'link'::public."StorageType") AND ("externalUrl" IS NOT NULL))))
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: email_campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_campaigns (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "companyId" text NOT NULL,
    name character varying(255) NOT NULL,
    subject character varying(500) NOT NULL,
    body text NOT NULL,
    status public."CampaignStatus" DEFAULT 'draft'::public."CampaignStatus",
    "totalRecipients" integer DEFAULT 0,
    "sentCount" integer DEFAULT 0,
    "failedCount" integer DEFAULT 0,
    "scheduledAt" timestamp without time zone,
    "sentAt" timestamp without time zone,
    "createdBy" text,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.email_campaigns OWNER TO postgres;

--
-- Name: TABLE email_campaigns; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.email_campaigns IS 'Campanhas de email em massa criadas pelas empresas';


--
-- Name: COLUMN email_campaigns.body; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.email_campaigns.body IS 'Conteúdo HTML do email';


--
-- Name: COLUMN email_campaigns.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.email_campaigns.status IS 'Status: draft, sending, completed, failed, cancelled';


--
-- Name: COLUMN email_campaigns."totalRecipients"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.email_campaigns."totalRecipients" IS 'Total de destinatários da campanha';


--
-- Name: COLUMN email_campaigns."sentCount"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.email_campaigns."sentCount" IS 'Quantidade de emails enviados com sucesso';


--
-- Name: COLUMN email_campaigns."failedCount"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.email_campaigns."failedCount" IS 'Quantidade de emails que falharam';


--
-- Name: event_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_assignments (
    id text NOT NULL,
    "eventId" text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.event_assignments OWNER TO postgres;

--
-- Name: financial_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.financial_transactions (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "clientId" text NOT NULL,
    "caseId" text,
    type public."TransactionType" NOT NULL,
    description text NOT NULL,
    amount double precision NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.financial_transactions OWNER TO postgres;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id text NOT NULL,
    "userId" text NOT NULL,
    resource text NOT NULL,
    "canView" boolean DEFAULT false NOT NULL,
    "canEdit" boolean DEFAULT false NOT NULL,
    "canDelete" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: schedule_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schedule_events (
    id text NOT NULL,
    "companyId" text NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    type public."ScheduleEventType" DEFAULT 'COMPROMISSO'::public."ScheduleEventType" NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "clientId" text,
    "caseId" text,
    completed boolean DEFAULT false NOT NULL,
    "createdBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "googleMeetLink" text,
    priority public."Priority" DEFAULT 'MEDIA'::public."Priority" NOT NULL
);


ALTER TABLE public.schedule_events OWNER TO postgres;

--
-- Name: TABLE schedule_events; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.schedule_events IS 'Tabela de eventos da agenda (compromissos, tarefas, prazos)';


--
-- Name: COLUMN schedule_events.title; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.schedule_events.title IS 'Título do evento';


--
-- Name: COLUMN schedule_events.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.schedule_events.description IS 'Descrição detalhada do evento';


--
-- Name: COLUMN schedule_events.type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.schedule_events.type IS 'Tipo de evento (COMPROMISSO, TAREFA, PRAZO, AUDIENCIA)';


--
-- Name: COLUMN schedule_events.date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.schedule_events.date IS 'Data e hora do evento';


--
-- Name: COLUMN schedule_events."endDate"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.schedule_events."endDate" IS 'Data e hora de término do evento (opcional)';


--
-- Name: COLUMN schedule_events.completed; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.schedule_events.completed IS 'Se o evento foi concluído (para tarefas)';


--
-- Name: COLUMN schedule_events."createdBy"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.schedule_events."createdBy" IS 'Usuário que criou o evento';


--
-- Name: COLUMN schedule_events."googleMeetLink"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.schedule_events."googleMeetLink" IS 'Link do Google Calendar para criar reunião com Google Meet';


--
-- Name: smtp_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.smtp_configs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "companyId" text NOT NULL,
    host character varying(255) NOT NULL,
    port integer NOT NULL,
    "user" character varying(255) NOT NULL,
    password text NOT NULL,
    "fromEmail" character varying(255) NOT NULL,
    "fromName" character varying(255),
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.smtp_configs OWNER TO postgres;

--
-- Name: TABLE smtp_configs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.smtp_configs IS 'Configurações SMTP por empresa para envio de campanhas';


--
-- Name: COLUMN smtp_configs.password; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.smtp_configs.password IS 'Senha SMTP criptografada com AES-256';


--
-- Name: COLUMN smtp_configs."isActive"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.smtp_configs."isActive" IS 'Indica se a configuração está ativa e pode ser usada';


--
-- Name: system_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_config (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.system_config OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id text NOT NULL,
    "companyId" text,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role public."UserRole" DEFAULT 'USER'::public."UserRole" NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "resetToken" text,
    "resetTokenExpiry" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    "emailVerificationToken" text,
    "emailVerificationExpiry" timestamp(3) without time zone,
    "failedLoginAttempts" integer DEFAULT 0,
    "lastFailedLoginAt" timestamp without time zone,
    "accountLockedUntil" timestamp without time zone,
    phone text,
    mobile text,
    "birthDate" timestamp(3) without time zone,
    "profilePhoto" text,
    "profilePhotoUrl" text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: COLUMN users."emailVerified"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users."emailVerified" IS 'Indica se o email do usuário foi verificado';


--
-- Name: COLUMN users."emailVerificationToken"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users."emailVerificationToken" IS 'Token de verificação de email';


--
-- Name: COLUMN users."emailVerificationExpiry"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users."emailVerificationExpiry" IS 'Data de expiração do token de verificação';


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
9148d6c0-0763-4f73-9d20-8cc75af7c50f	49e432e78531f871e5b3e73f586e4c8c1dfa5672d951526e8c937e1c5e4a57da	2025-10-30 01:49:36.952776+00	20241030000000_init	\N	\N	2025-10-30 01:49:36.903416+00	1
36a9acd6-295a-4841-be18-70f2dec14df5	f8f922e3393a4bac4d35e01b2234e83745520b2658539ca5689af4af9bde9667	2025-10-31 03:24:33.937196+00	20251031032427_add_client_fields	\N	\N	2025-10-31 03:24:33.9328+00	1
e8d844a4-f041-49c5-b740-a3a71f96fbfa	3a0fac930283750462068774ce9e8dff3feff64db739fc7ab32eb0fa03540b7c	2025-11-21 16:07:26.054733+00	20250121000000_add_ai_config	\N	\N	2025-11-21 16:07:26.054733+00	1
a8332886-d3c8-457a-84e3-9d152492d4c8	1efd36f010a1515c410fc336f53a5eb0a1b7cb790dcdbdaa7f6618eede1bfe91	2025-11-21 16:22:57.640599+00	20250121010000_add_ai_summary_to_cases	\N	\N	2025-11-21 16:22:57.640599+00	1
ea7ca387-9062-4527-b272-c0d1eafe9b32		2025-11-22 18:53:39.729469+00	20250122000000_add_person_type	\N	\N	2025-11-22 18:53:39.729469+00	1
ec5ba8bc-fe30-48a7-bb63-36cafa050f8a	20250122000000_add_user_profile_fields	2025-11-22 22:32:33.933623+00	20250122000000_add_user_profile_fields	\N	\N	2025-11-22 22:32:33.933623+00	1
\.


--
-- Data for Name: accounts_payable; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accounts_payable (id, "companyId", supplier, description, amount, "dueDate", "paidDate", status, category, notes, "createdBy", "createdAt", "updatedAt", "isRecurring", "recurrencePeriod", "parentId") FROM stdin;
2ebfe666-f252-4c9c-82d7-3d70c51d1ecb	4eef674f-b389-4757-bc9e-e950092eec89	Funcionários	Folha de pagamento - Teste	8500	2025-11-21 04:19:07	\N	PENDING	Salários	\N	9508bb44-2e01-4d08-9d29-f251a3574cd0	2025-11-16 04:19:07.074	2025-11-16 04:19:07.074	f	\N	\N
5688c88f-2866-4899-a356-9d674e83a87a	4eef674f-b389-4757-bc9e-e950092eec89	Papelaria XYZ	Material de escritório	450	2025-12-16 04:19:07	\N	PENDING	Fornecedores	\N	9508bb44-2e01-4d08-9d29-f251a3574cd0	2025-11-16 04:19:07.107	2025-11-16 04:19:07.107	f	\N	\N
dfbdd398-fef6-49bc-9551-ce809a6b49b4	4eef674f-b389-4757-bc9e-e950092eec89	Imobiliária Teste Ltda	Aluguel do escritório - ATUALIZADO	3800	2025-12-01 04:19:07	2025-11-16 04:19:07	PAID	Aluguel	Conta de teste	9508bb44-2e01-4d08-9d29-f251a3574cd0	2025-11-16 04:19:07.037	2025-11-16 04:19:07.233	f	\N	\N
71dae0fa-8595-4870-9379-f498982a9f11	c3b2daac-22f6-4e50-be65-c509990b0ada	teste	tem que pagar	53.2	2025-11-27 00:00:00	2025-11-16 04:39:10.596	PAID	alugueel		58847a5a-e8e4-44e8-ba15-a6a691f52aba	2025-11-16 04:38:50.83	2025-11-16 04:39:10.769	f	\N	\N
3ec2e8c6-2a4e-4c2f-94a4-1edfdaf960ae	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Energia Elétrica	Conta de luz - Novembro	450	2025-11-28 18:37:41.883	\N	PENDING	Utilidades	\N	4487d487-e82a-4191-be0d-1ce543aaf438	2025-11-21 18:37:41.955	2025-11-21 18:37:41.955	f	\N	\N
b23b039f-9c21-4071-8b9b-0ec3b534aa85	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Internet Banda Larga	Mensalidade Internet	299	2025-11-22 18:37:41.883	\N	PENDING	Comunicação	\N	4487d487-e82a-4191-be0d-1ce543aaf438	2025-11-21 18:37:41.965	2025-11-21 18:37:41.965	f	\N	\N
393310ad-aca2-4ee2-b8e6-5ab6b196a468	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Aluguel Escritório	Aluguel - Novembro	3500	2025-11-21 00:00:00	\N	PENDING	Imóvel NOVO		4487d487-e82a-4191-be0d-1ce543aaf438	2025-11-21 18:37:41.972	2025-11-22 18:04:30.727	f	\N	\N
\.


--
-- Data for Name: ai_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_configs (id, "companyId", provider, "apiKey", model, enabled, "autoSummarize", "createdAt", "updatedAt") FROM stdin;
e7896abf-47d4-4a00-aea6-fd9e67a14681	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	openai	8c68ba36ef296b42d72dc7c5c5129121:5e029097f443c03a840bde891083c7164522462db400b256c5e1d8a74d363c9781f502ae5c11be66ef004856ada082229aa68e0ceff709f5e9efb95c80534a01c322129b39db57feabfd37fc60c424afb59c826264a93c30e6be3eca9cb44779c69baf7c6cfc565c81c840349e9ac3ead684a865923a96efc1d48a029ff205036661ce6edf471398d1aec729db53f6c200f9bb04c29833404c5bcf5f33428a05f1ed84e9e2b3ef20eee9e8e7fbe96cae	gpt-4o-mini	t	t	2025-11-22 17:22:02.409	2025-11-22 17:22:20.113
\.


--
-- Data for Name: campaign_recipients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.campaign_recipients (id, "campaignId", "recipientEmail", "recipientName", status, "sentAt", "errorMessage", "createdAt") FROM stdin;
7a63620f-b2a5-4b53-8c1d-cb0539126c06	e7a49b69-39fb-4f65-b1b2-1fdb2b3e7c90	elaine.alves@email.com	Elaine Rodrigues Alves	pending	\N	\N	2025-11-16 14:08:46.021
76cb5b23-231e-4f47-a8dc-74617248532d	e7a49b69-39fb-4f65-b1b2-1fdb2b3e7c90	fernando.pereira@email.com	Fernando Gomes Pereira	pending	\N	\N	2025-11-16 14:08:46.021
ec7b7b22-e7a1-4a1c-9b09-662ee453fbfa	e7a49b69-39fb-4f65-b1b2-1fdb2b3e7c90	daniel.lima@email.com	Daniel Ferreira Lima	pending	\N	\N	2025-11-16 14:08:46.021
a27e7a09-29c9-481d-8330-be1d30ad5fc3	e7a49b69-39fb-4f65-b1b2-1fdb2b3e7c90	ana.oliveira@email.com	Ana Paula Oliveira	pending	\N	\N	2025-11-16 14:08:46.021
b0a15be8-067f-40a3-9741-d49d81db2855	e7a49b69-39fb-4f65-b1b2-1fdb2b3e7c90	carlos.santos@email.com	Carlos Eduardo Santos	pending	\N	\N	2025-11-16 14:08:46.021
9467f0da-3cd8-4b56-9ba0-63a1af3b4e23	e7a49b69-39fb-4f65-b1b2-1fdb2b3e7c90	beatriz.costa@email.com	Beatriz Silva Costa	pending	\N	\N	2025-11-16 14:08:46.021
d9245092-db12-4300-8f3e-e00e91b71073	e7a49b69-39fb-4f65-b1b2-1fdb2b3e7c90	cliente@teste.com	Cliente Teste AdvWell	pending	\N	\N	2025-11-16 14:08:46.021
\.


--
-- Data for Name: case_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.case_documents (id, "caseId", name, "s3Key", "s3Url", "fileSize", "mimeType", "createdAt") FROM stdin;
\.


--
-- Data for Name: case_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.case_movements (id, "caseId", "movementCode", "movementName", "movementDate", description, "createdAt") FROM stdin;
747ca3ae-ee2d-4bf5-b143-553a03621244	f84653cb-8d54-4f05-89c0-cf41d5b05840	26	Distribuição	2023-09-11 17:25:25	sorteio: tipo_de_distribuicao_redistribuicao	2025-11-23 02:00:38.825
3ebb4947-32ab-4dab-a63f-2873aa44631b	f84653cb-8d54-4f05-89c0-cf41d5b05840	51	Conclusão	2023-09-14 13:19:17	para decisão: tipo_de_conclusao	2025-11-23 02:00:38.825
7aabc5c0-c304-4116-9c67-26ef6b3fa370	f84653cb-8d54-4f05-89c0-cf41d5b05840	12164	Outras Decisões	2023-09-27 15:32:14	\N	2025-11-23 02:00:38.825
333db105-306b-4ea4-8ecc-933e22d93ef7	f84653cb-8d54-4f05-89c0-cf41d5b05840	60	Expedição de documento	2023-10-03 11:55:26	Carta: tipo_de_documento	2025-11-23 02:00:38.825
b99fa372-eac7-4d5f-ac3c-c2b7c363e215	f84653cb-8d54-4f05-89c0-cf41d5b05840	85	Petição	2023-10-13 17:35:54	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.825
8146c9cc-37ff-44f4-95e2-899211dee65d	f84653cb-8d54-4f05-89c0-cf41d5b05840	581	Documento	2023-10-17 08:02:05	Aviso de recebimento (AR): tipo_de_documento	2025-11-23 02:00:38.825
39dc8343-1c47-4698-86a5-6535fb03df26	f84653cb-8d54-4f05-89c0-cf41d5b05840	11383	Ato ordinatório	2023-10-23 10:40:49	\N	2025-11-23 02:00:38.825
f9dd335d-0125-49dd-b8d6-9b515dcdb685	f84653cb-8d54-4f05-89c0-cf41d5b05840	60	Expedição de documento	2023-10-23 10:41:14	Certidão: tipo_de_documento	2025-11-23 02:00:38.825
06a24a98-4358-4ac4-bacd-2f28594216e5	f84653cb-8d54-4f05-89c0-cf41d5b05840	123	Remessa	2023-10-23 12:04:05	outros motivos: motivo_da_remessa	2025-11-23 02:00:38.825
0df385f9-54bb-4a5b-b4ad-9861a426fb7e	f84653cb-8d54-4f05-89c0-cf41d5b05840	92	Publicação	2023-10-24 02:07:31	\N	2025-11-23 02:00:38.825
f1b02e90-16af-441a-8cc6-4e50436ff86e	f84653cb-8d54-4f05-89c0-cf41d5b05840	60	Expedição de documento	2023-11-03 08:06:07	Certidão: tipo_de_documento	2025-11-23 02:00:38.825
fc2ef42e-e0db-4b4d-b1b9-20ab9e3892a8	f84653cb-8d54-4f05-89c0-cf41d5b05840	11383	Ato ordinatório	2023-11-12 00:36:25	\N	2025-11-23 02:00:38.825
4f3c7da8-484c-4e89-8e40-58b421a202bc	f84653cb-8d54-4f05-89c0-cf41d5b05840	85	Petição	2023-11-14 18:56:02	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.825
5dd5c795-f44d-4041-ab90-05c616f9db07	f84653cb-8d54-4f05-89c0-cf41d5b05840	85	Petição	2023-11-21 16:00:14	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.825
bc3fc48b-239c-4922-87d3-36177b7c6f2f	f84653cb-8d54-4f05-89c0-cf41d5b05840	85	Petição	2025-01-08 17:06:15	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.825
26e0fab5-0409-4c58-a77d-c2f3278837db	f84653cb-8d54-4f05-89c0-cf41d5b05840	85	Petição	2025-06-18 15:20:18	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.825
02d9cb41-8ffb-402d-9db3-18b4d920da63	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	26	Distribuição	2021-01-04 22:30:54	dependência: tipo_de_distribuicao_redistribuicao	2025-11-23 16:13:02.105
4238f413-2836-45d0-9011-61aea85d0de0	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	135	Apensamento	2021-01-07 17:34:11	\N	2025-11-23 16:13:02.105
d4eb8fa1-c7e4-4cf1-99d7-e8d28aa43155	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	60	Expedição de documento	2021-01-08 10:33:55	Certidão: tipo_de_documento	2025-11-23 16:13:02.105
c7b0e51b-dd2d-4cd0-bc57-5a13dec6f410	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	51	Conclusão	2021-01-11 13:52:06	para despacho: tipo_de_conclusao	2025-11-23 16:13:02.105
7a07615a-8789-4adb-8d1a-ba615f8e5c0f	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	12164	Outras Decisões	2021-01-11 16:18:36	\N	2025-11-23 16:13:02.105
95c8e7a0-ea84-4f65-a9c4-f3203b161589	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	60	Expedição de documento	2021-01-11 16:18:55	Certidão: tipo_de_documento	2025-11-23 16:13:02.105
6fe062cc-f01d-46de-a670-72d169d52bb7	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	60	Expedição de documento	2021-01-22 06:48:06	Certidão: tipo_de_documento	2025-11-23 16:13:02.105
1ff60c43-6691-4894-9ae2-b8a09b882f21	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	123	Remessa	2021-02-04 11:13:31	outros motivos: motivo_da_remessa	2025-11-23 16:13:02.105
3dffd743-8b8e-4633-a358-f43555d57bd7	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	92	Publicação	2021-02-05 07:28:35	\N	2025-11-23 16:13:02.105
3f86c4a9-95cf-44fb-ad8c-3a259fdeec29	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	581	Documento	2021-02-18 17:18:54	Outros documentos: tipo_de_documento	2025-11-23 16:13:02.105
73dfd097-c2b8-4ce2-aaf2-5e25b87cb96e	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	11383	Ato ordinatório	2021-02-19 23:08:29	\N	2025-11-23 16:13:02.105
c3bf4900-068d-494c-baf7-9078ba483bbf	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	51	Conclusão	2021-03-16 08:41:32	para despacho: tipo_de_conclusao	2025-11-23 16:13:02.105
b85e3ccf-728a-491b-ab2a-7db192342c07	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	11010	Mero expediente	2021-03-16 11:06:23	\N	2025-11-23 16:13:02.105
011abf74-896c-4b8a-8a06-02b988722446	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	60	Expedição de documento	2021-03-16 11:06:41	Certidão: tipo_de_documento	2025-11-23 16:13:02.105
ebdaa023-acd7-4a20-9c15-b440348f04c4	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	60	Expedição de documento	2021-03-27 06:35:53	Certidão: tipo_de_documento	2025-11-23 16:13:02.105
9a2b9b63-1d63-471d-b8b7-9f98be48c69b	e1528855-f03a-458b-8fd0-a7391f9627bb	26	Distribuição	2013-12-16 11:32:06	sorteio: tipo_de_distribuicao_redistribuicao	2025-11-23 02:00:39.136
996c0c1d-9dd4-48b5-ab4b-b834d5f7d9fb	e1528855-f03a-458b-8fd0-a7391f9627bb	982	Remessa	2013-12-16 17:34:53	outros motivos: motivo_da_remessa	2025-11-23 02:00:39.136
09823b6e-77d7-444e-a3cd-464729c990b4	e1528855-f03a-458b-8fd0-a7391f9627bb	132	Recebimento	2014-02-05 12:45:21	\N	2025-11-23 02:00:39.136
c0ca163f-ed6e-4cc4-8bf8-9fd5593cb2ae	e1528855-f03a-458b-8fd0-a7391f9627bb	12164	Outras Decisões	2014-02-04 20:03:00	\N	2025-11-23 02:00:39.136
44537ad9-d59b-481f-b554-a1ddba472838	e1528855-f03a-458b-8fd0-a7391f9627bb	60	Expedição de documento	2014-05-08 09:27:00	Mandado: tipo_de_documento	2025-11-23 02:00:39.136
18f706d2-9968-4f96-b799-4f2ed7aeb3b3	e1528855-f03a-458b-8fd0-a7391f9627bb	85	Petição	2014-07-21 10:58:08	Petição (outras): tipo_de_peticao	2025-11-23 02:00:39.136
64b1725c-ce31-4c24-992d-a91067be78cc	e1528855-f03a-458b-8fd0-a7391f9627bb	123	Remessa	2014-08-04 15:49:50	em diligência: motivo_da_remessa	2025-11-23 02:00:39.136
cfd03222-9a26-40bb-91a2-72a891a8bdd1	e1528855-f03a-458b-8fd0-a7391f9627bb	132	Recebimento	2014-09-12 14:18:48	\N	2025-11-23 02:00:39.136
9d619684-2370-48ae-8161-8b5595bf3f13	e1528855-f03a-458b-8fd0-a7391f9627bb	581	Documento	2014-09-26 15:31:25	Mandado: tipo_de_documento	2025-11-23 02:00:39.136
3ef96068-6f57-476c-89f9-c485f301895b	e1528855-f03a-458b-8fd0-a7391f9627bb	85	Petição	2015-06-09 12:54:12	Petição (outras): tipo_de_peticao	2025-11-23 02:00:39.136
8d2dd615-9bed-4cb4-a85c-cab5de7c6f90	e1528855-f03a-458b-8fd0-a7391f9627bb	11383	Ato ordinatório	2015-06-09 12:58:13	\N	2025-11-23 02:00:39.136
e43a6324-93f5-4930-90f7-39a1aa1cb570	e1528855-f03a-458b-8fd0-a7391f9627bb	123	Remessa	2015-08-03 14:29:56	em diligência: motivo_da_remessa	2025-11-23 02:00:39.136
98986a34-5b90-45e5-b9e8-4e0f49e16b91	e1528855-f03a-458b-8fd0-a7391f9627bb	106	Mandado	2014-08-04 16:42:04	entregue ao destinatário: resultado	2025-11-23 02:00:39.136
0e5b7a49-09da-4c35-86f5-68874a054cdb	e1528855-f03a-458b-8fd0-a7391f9627bb	11010	Mero expediente	2014-07-21 15:16:08	\N	2025-11-23 02:00:39.136
2d92a99d-d6b7-40b5-9171-be1a66905605	e1528855-f03a-458b-8fd0-a7391f9627bb	132	Recebimento	2015-08-25 16:26:05	\N	2025-11-23 02:00:39.136
46fbeb6e-42b5-406f-a78c-75f12bf11e1e	e1528855-f03a-458b-8fd0-a7391f9627bb	85	Petição	2015-09-03 16:12:02	Petição (outras): tipo_de_peticao	2025-11-23 02:00:39.136
cc75a1de-b5c7-4735-b4a6-708e3da31d3d	e1528855-f03a-458b-8fd0-a7391f9627bb	12164	Outras Decisões	2015-09-16 12:08:00	\N	2025-11-23 02:00:39.136
923590a3-a148-4913-8fa0-be481568fb7a	e1528855-f03a-458b-8fd0-a7391f9627bb	11383	Ato ordinatório	2017-10-20 17:05:21	\N	2025-11-23 02:00:39.136
cef78ee1-b8c9-40ec-956c-85fca101f1cb	e1528855-f03a-458b-8fd0-a7391f9627bb	60	Expedição de documento	2017-12-04 17:05:59	Certidão: tipo_de_documento	2025-11-23 02:00:39.136
561b444f-d780-4382-aec2-951a561e34dd	e1528855-f03a-458b-8fd0-a7391f9627bb	123	Remessa	2018-01-29 16:17:13	em diligência: motivo_da_remessa	2025-11-23 02:00:39.136
4f3366aa-bd9b-47f2-a834-f510488112cd	e1528855-f03a-458b-8fd0-a7391f9627bb	132	Recebimento	2018-03-13 14:02:44	\N	2025-11-23 02:00:39.136
625175a9-b43a-4000-8b86-7fe5c501b61e	e1528855-f03a-458b-8fd0-a7391f9627bb	85	Petição	2018-05-15 17:56:50	Petição (outras): tipo_de_peticao	2025-11-23 02:00:39.136
5e454e08-6e7d-44db-90f6-32aa3cdcd449	e1528855-f03a-458b-8fd0-a7391f9627bb	898	Por decisão judicial	2018-07-11 10:08:18	\N	2025-11-23 02:00:39.136
182b7c37-bc91-410c-8854-ed5c2f8f42e5	e1528855-f03a-458b-8fd0-a7391f9627bb	123	Remessa	2018-11-13 15:51:25	em diligência: motivo_da_remessa	2025-11-23 02:00:39.136
3fe36a1c-8491-4d6c-9d8f-c68907172969	e1528855-f03a-458b-8fd0-a7391f9627bb	132	Recebimento	2019-06-13 17:55:48	\N	2025-11-23 02:00:39.136
4e6f95bd-cb98-4ea3-bfaa-47fe603636de	e1528855-f03a-458b-8fd0-a7391f9627bb	85	Petição	2019-10-29 17:57:37	Petição (outras): tipo_de_peticao	2025-11-23 02:00:39.136
66e6987e-214e-47a9-91fe-3c1804862ce0	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	11383	Ato ordinatório	2021-04-04 11:05:17	\N	2025-11-23 16:13:02.105
363f6447-0551-4af1-bec1-79e985813f54	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	11383	Ato ordinatório	2021-04-22 23:15:42	\N	2025-11-23 16:13:02.105
86a889c0-17dd-4e4c-873b-528ed96bb901	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	123	Remessa	2021-06-08 10:09:47	outros motivos: motivo_da_remessa	2025-11-23 16:13:02.105
cf5957ab-dcb3-4cfc-b4d5-a2f646bc1a0a	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	92	Publicação	2021-06-09 10:41:35	\N	2025-11-23 16:13:02.105
c232efe1-fb44-4801-a8dd-1f2db38c2ab2	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	85	Petição	2021-06-16 21:15:45	Petição (outras): tipo_de_peticao	2025-11-23 16:13:02.105
edfe2eca-c784-4939-888f-fe30c1265174	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	60	Expedição de documento	2021-09-01 12:33:13	Certidão: tipo_de_documento	2025-11-23 16:13:02.105
7afd94b2-e436-46e6-8e2f-c38792b5631f	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	51	Conclusão	2021-09-01 12:33:42	para despacho: tipo_de_conclusao	2025-11-23 16:13:02.105
39afa681-4e95-48ac-b0d7-f656599ee4bd	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	220	Improcedência	2021-09-17 16:02:16	\N	2025-11-23 16:13:02.105
5682bd48-b891-42c4-81f5-9c03edace923	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	60	Expedição de documento	2021-09-17 16:03:18	Certidão: tipo_de_documento	2025-11-23 16:13:02.105
db1fc148-df4d-4e20-8998-a1b61b56d165	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	60	Expedição de documento	2021-09-28 06:41:54	Certidão: tipo_de_documento	2025-11-23 16:13:02.105
07d325c2-f6aa-4e66-bfef-0cffd2c7b6a6	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	123	Remessa	2022-04-19 13:58:33	outros motivos: motivo_da_remessa	2025-11-23 16:13:02.105
24bb43cd-b36b-4e45-8b40-f3837dfa95e4	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	92	Publicação	2022-04-20 05:07:11	\N	2025-11-23 16:13:02.105
13737a7c-7c41-489b-9365-a82b61c79f33	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	85	Petição	2022-04-29 16:25:56	Petição (outras): tipo_de_peticao	2025-11-23 16:13:02.105
fdbf509a-8540-44d9-864b-29dad15e5faf	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	123	Remessa	2022-07-28 00:58:40	outros motivos: motivo_da_remessa	2025-11-23 16:13:02.105
daada569-eb7e-4b81-b051-1a81f945bb49	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	36	Redistribuição	2022-07-28 00:59:05	competência exclusiva: tipo_de_distribuicao_redistribuicao	2025-11-23 16:13:02.105
9c8eab85-2cde-4ced-8924-2920652c518a	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	85	Petição	2023-02-15 10:16:32	Petição (outras): tipo_de_peticao	2025-11-23 16:13:02.105
a99c392c-2598-459e-a2a6-806ed04ed2e5	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	60	Expedição de documento	2023-03-01 09:13:10	Certidão: tipo_de_documento	2025-11-23 16:13:02.105
3f40d0a6-22ba-493c-934c-5bcd43590a35	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	11383	Ato ordinatório	2023-03-01 10:09:35	\N	2025-11-23 16:13:02.105
16b18a33-4fa5-47e5-8a4e-51d39878e38a	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	60	Expedição de documento	2023-03-01 10:09:53	Certidão: tipo_de_documento	2025-11-23 16:13:02.105
c9fce4c1-ab18-4a72-a09a-d292dc1817ae	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	60	Expedição de documento	2023-03-12 06:36:58	Certidão: tipo_de_documento	2025-11-23 16:13:02.105
41708564-d559-41c8-adc6-2c57e4fc1235	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	85	Petição	2023-03-17 12:55:33	Petição (outras): tipo_de_peticao	2025-11-23 16:13:02.105
1756133f-4462-4a10-b2d9-58cc5efdbe9f	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	51	Conclusão	2024-05-14 10:14:08	para decisão: tipo_de_conclusao	2025-11-23 16:13:02.105
69d317f7-35d7-4383-881b-2aa166582e4e	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	15164	Não Acolhimento de Embargos de Declaração	2024-05-16 15:41:21	\N	2025-11-23 16:13:02.105
6937bea4-a1ab-471e-a37f-bf3c02798b3d	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	60	Expedição de documento	2024-05-16 15:41:46	Certidão: tipo_de_documento	2025-11-23 16:13:02.105
1b5d5aa1-5b39-469a-8ce8-3f1619700285	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	123	Remessa	2024-05-17 01:04:58	outros motivos: motivo_da_remessa	2025-11-23 16:13:02.105
ff71c0f5-82dc-486a-b7c8-4aeae3b60936	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	92	Publicação	2024-05-18 00:24:24	\N	2025-11-23 16:13:02.105
e66e2789-4c11-46c6-b0fa-b9ae2a135c34	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	85	Petição	2024-05-27 05:25:52	Petição (outras): tipo_de_peticao	2025-11-23 16:13:02.105
9bdc37b2-c979-4f28-b6f0-2476624016e7	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	60	Expedição de documento	2024-05-27 06:54:50	Certidão: tipo_de_documento	2025-11-23 16:13:02.105
8e12d536-fb49-4a99-9818-c88c52771aae	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	85	Petição	2024-06-13 15:17:53	Petição (outras): tipo_de_peticao	2025-11-23 16:13:02.105
d9d49f05-9a01-49bf-ab45-bcbd66fc4471	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	11383	Ato ordinatório	2024-10-23 14:57:58	\N	2025-11-23 16:13:02.105
5b9f0576-9919-4630-9513-a8dc948393f4	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	60	Expedição de documento	2024-10-23 14:58:27	Certidão: tipo_de_documento	2025-11-23 16:13:02.105
115f7d8d-ac90-402d-b906-608a0d95e409	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	123	Remessa	2024-10-24 00:49:04	outros motivos: motivo_da_remessa	2025-11-23 16:13:02.105
87003564-ad40-437b-b6ab-40b1c47208f3	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	92	Publicação	2024-10-25 06:09:33	\N	2025-11-23 16:13:02.105
15ede070-a94a-4b26-b8c4-40bb1febd7c9	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	85	Petição	2024-10-31 09:26:51	Petição (outras): tipo_de_peticao	2025-11-23 16:13:02.105
9376a85e-2d24-44be-849e-61c6e78d98a2	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	60	Expedição de documento	2024-11-03 07:12:23	Certidão: tipo_de_documento	2025-11-23 16:13:02.105
07098869-52ea-4f41-bdc6-81defaca4423	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	85	Petição	2024-11-21 20:35:13	Petição (outras): tipo_de_peticao	2025-11-23 16:13:02.105
8ce2ece1-a229-4d6f-a569-50cd69dd097d	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	60	Expedição de documento	2024-12-03 16:54:20	Certidão: tipo_de_documento	2025-11-23 16:13:02.105
7cb47ad3-f183-4809-9380-c9c354be14c1	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	123	Remessa	2024-12-03 16:56:22	em grau de recurso: motivo_da_remessa	2025-11-23 16:13:02.105
73aebe72-17bf-44eb-9dc9-d2efc5082b03	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	26	Distribuição	2024-08-22 13:08:38	competência exclusiva: tipo_de_distribuicao_redistribuicao	2025-11-23 16:37:01.289
77d9e28d-03c7-4758-9460-f32c9f4d7337	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	51	Conclusão	2024-10-02 15:22:08	para decisão: tipo_de_conclusao	2025-11-23 16:37:01.289
33de9694-50a1-4a63-b975-e48ef030cd35	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	92	Publicação	2024-10-02 15:22:08	\N	2025-11-23 16:37:01.289
13ac8693-d9ab-43e7-82d1-6dbb7631261d	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	1061	Disponibilização no Diário da Justiça Eletrônico	2024-10-07 01:03:50	\N	2025-11-23 16:37:01.289
602193a1-a445-461b-8843-57129796e681	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	85	Petição	2024-10-17 10:30:29	Petição (outras): tipo_de_peticao	2025-11-23 16:37:01.289
9f8cdc7c-1f99-4ea0-8da8-ad9c001aab1e	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	51	Conclusão	2024-11-25 15:02:41	para despacho: tipo_de_conclusao	2025-11-23 16:37:01.289
77f4cd93-fb6c-40a8-b8e8-521a85b0c331	09e1409f-edad-4cbb-a4d2-b78242049a7c	11	Distribuição	2024-01-15 00:00:00	Distribuição da Petição Inicial	2025-11-01 23:16:39.264
339f7401-2324-4658-ac0e-d73672fdbdf0	09e1409f-edad-4cbb-a4d2-b78242049a7c	22	Citação	2024-01-20 00:00:00	Citação do Réu	2025-11-01 23:16:39.265
1ce1a9e7-b552-4add-a2bd-a08e08cb0967	09e1409f-edad-4cbb-a4d2-b78242049a7c	60	Contestação	2024-02-05 00:00:00	Apresentação de Contestação	2025-11-01 23:16:39.265
2ea5597c-091f-49d3-9af8-7e64451f9ac2	09e1409f-edad-4cbb-a4d2-b78242049a7c	63	Réplica	2024-02-20 00:00:00	Réplica apresentada	2025-11-01 23:16:39.266
5fecbdd9-de49-4e26-8c4b-8cc605b56078	09e1409f-edad-4cbb-a4d2-b78242049a7c	193	Audiência Designada	2024-03-15 00:00:00	Audiência de Conciliação designada	2025-11-01 23:16:39.267
d392c995-0d1e-4b78-835a-86b46b509bbf	9f187c55-4701-4601-a41d-0508c5485588	11	Distribuição	2024-01-15 00:00:00	Distribuição da Petição Inicial	2025-11-01 23:16:39.268
26a2eff8-0e57-44cb-82a2-c0cae987afe0	9f187c55-4701-4601-a41d-0508c5485588	22	Citação	2024-01-20 00:00:00	Citação do Réu	2025-11-01 23:16:39.268
5e99318c-8c71-4233-9488-80ff8d799be0	9f187c55-4701-4601-a41d-0508c5485588	60	Contestação	2024-02-05 00:00:00	Apresentação de Contestação	2025-11-01 23:16:39.269
262783d6-8690-4779-8bf0-b5394a7f41f4	9f187c55-4701-4601-a41d-0508c5485588	63	Réplica	2024-02-20 00:00:00	Réplica apresentada	2025-11-01 23:16:39.27
19d127de-8560-45d8-8d61-9f834a08c409	9f187c55-4701-4601-a41d-0508c5485588	193	Audiência Designada	2024-03-15 00:00:00	Audiência de Conciliação designada	2025-11-01 23:16:39.271
465f2bc1-7ba8-47d4-a54e-3f333ae8d1f6	23118458-39e9-4d59-999c-94adf5ed036b	11	Distribuição	2024-01-15 00:00:00	Distribuição da Petição Inicial	2025-11-01 23:16:39.271
4e69d6e1-c7aa-4c7d-bf05-f9b76351bad3	23118458-39e9-4d59-999c-94adf5ed036b	22	Citação	2024-01-20 00:00:00	Citação do Réu	2025-11-01 23:16:39.272
6828c349-51bb-4575-a2e6-07c7dcc505f3	23118458-39e9-4d59-999c-94adf5ed036b	60	Contestação	2024-02-05 00:00:00	Apresentação de Contestação	2025-11-01 23:16:39.273
960032f0-82fc-4fde-92c0-b3f65985d209	23118458-39e9-4d59-999c-94adf5ed036b	63	Réplica	2024-02-20 00:00:00	Réplica apresentada	2025-11-01 23:16:39.274
21b79f30-2677-4106-932a-acff9e9ba040	23118458-39e9-4d59-999c-94adf5ed036b	193	Audiência Designada	2024-03-15 00:00:00	Audiência de Conciliação designada	2025-11-01 23:16:39.274
7f6b1d73-d74d-490b-a1b0-2cb41a2ce130	36a877ae-0f07-4572-b82c-323e9735294a	11	Distribuição	2024-01-15 00:00:00	Distribuição da Petição Inicial	2025-11-01 23:16:39.275
7e9861e6-2423-41f9-b688-e15ca845fd1f	36a877ae-0f07-4572-b82c-323e9735294a	22	Citação	2024-01-20 00:00:00	Citação do Réu	2025-11-01 23:16:39.276
564d949f-edeb-4603-b182-3830bc7b5407	36a877ae-0f07-4572-b82c-323e9735294a	60	Contestação	2024-02-05 00:00:00	Apresentação de Contestação	2025-11-01 23:16:39.276
f7c302cf-63f0-493e-a2e0-70fccdaaa18d	36a877ae-0f07-4572-b82c-323e9735294a	63	Réplica	2024-02-20 00:00:00	Réplica apresentada	2025-11-01 23:16:39.277
7c730f92-c40c-43e8-a43e-2744e51c0a88	36a877ae-0f07-4572-b82c-323e9735294a	193	Audiência Designada	2024-03-15 00:00:00	Audiência de Conciliação designada	2025-11-01 23:16:39.278
4e0af535-8afc-435d-b3fe-2e1885499dbf	2602745c-af26-441f-88e6-9e11972ba97e	11	Distribuição	2024-01-15 00:00:00	Distribuição da Petição Inicial	2025-11-01 23:16:39.278
aa8f7a9e-21a4-424e-83b6-9f90ebf1c3ea	2602745c-af26-441f-88e6-9e11972ba97e	22	Citação	2024-01-20 00:00:00	Citação do Réu	2025-11-01 23:16:39.279
87aa9ed8-4b8a-47e8-aa1b-2df23ad5d2f1	2602745c-af26-441f-88e6-9e11972ba97e	60	Contestação	2024-02-05 00:00:00	Apresentação de Contestação	2025-11-01 23:16:39.28
006e435b-b839-4136-b560-c362f72aa95f	2602745c-af26-441f-88e6-9e11972ba97e	63	Réplica	2024-02-20 00:00:00	Réplica apresentada	2025-11-01 23:16:39.28
c7920567-e086-4e25-8908-1f5e0d1f04c1	2602745c-af26-441f-88e6-9e11972ba97e	193	Audiência Designada	2024-03-15 00:00:00	Audiência de Conciliação designada	2025-11-01 23:16:39.281
ee4b578b-99e9-43ae-8822-526d3f56e7cd	e9752652-2039-413f-ac1f-8842d10045ce	11	Distribuição	2024-01-15 00:00:00	Distribuição da Petição Inicial	2025-11-01 23:16:39.282
81d7bf42-df5d-436a-85d1-8fe8073ca75b	e9752652-2039-413f-ac1f-8842d10045ce	22	Citação	2024-01-20 00:00:00	Citação do Réu	2025-11-01 23:16:39.282
04c08be0-58dd-4f13-8a3c-fcd2795e7570	e9752652-2039-413f-ac1f-8842d10045ce	60	Contestação	2024-02-05 00:00:00	Apresentação de Contestação	2025-11-01 23:16:39.283
dc7ccd69-8ba6-4fb8-bfa2-b23fa38deceb	e9752652-2039-413f-ac1f-8842d10045ce	63	Réplica	2024-02-20 00:00:00	Réplica apresentada	2025-11-01 23:16:39.284
ad344f78-4c64-4451-abb1-b7843fd01521	e9752652-2039-413f-ac1f-8842d10045ce	193	Audiência Designada	2024-03-15 00:00:00	Audiência de Conciliação designada	2025-11-01 23:16:39.284
91970029-aea2-428b-965a-13eab4a64100	43e144f4-bc12-471f-8029-bf50e0b029c6	11	Distribuição	2024-01-15 00:00:00	Distribuição da Petição Inicial	2025-11-01 23:16:39.285
44eb4ac1-e051-4c16-ad44-85491f767ab2	43e144f4-bc12-471f-8029-bf50e0b029c6	22	Citação	2024-01-20 00:00:00	Citação do Réu	2025-11-01 23:16:39.286
f62c47b1-a2d4-413a-8a43-1b246511230c	43e144f4-bc12-471f-8029-bf50e0b029c6	60	Contestação	2024-02-05 00:00:00	Apresentação de Contestação	2025-11-01 23:16:39.286
cc8c024a-7348-409b-b259-7a29f17fc905	43e144f4-bc12-471f-8029-bf50e0b029c6	63	Réplica	2024-02-20 00:00:00	Réplica apresentada	2025-11-01 23:16:39.287
d6ee8bc8-9dbe-4baf-a2e4-54ef0046abed	43e144f4-bc12-471f-8029-bf50e0b029c6	193	Audiência Designada	2024-03-15 00:00:00	Audiência de Conciliação designada	2025-11-01 23:16:39.288
c658a5f0-5bdc-4e7e-9ef0-57eb4d3ae310	dd3279ce-2053-4ff7-b269-53e9a757c73b	11	Distribuição	2024-01-15 00:00:00	Distribuição da Petição Inicial	2025-11-01 23:16:39.288
48ea2983-ec83-4675-b124-c513db9b6c33	dd3279ce-2053-4ff7-b269-53e9a757c73b	22	Citação	2024-01-20 00:00:00	Citação do Réu	2025-11-01 23:16:39.289
ce5c7993-9327-4551-94a7-a81b758fc79d	dd3279ce-2053-4ff7-b269-53e9a757c73b	60	Contestação	2024-02-05 00:00:00	Apresentação de Contestação	2025-11-01 23:16:39.29
fe534074-4c7e-4e12-a002-4da1d63b21e9	dd3279ce-2053-4ff7-b269-53e9a757c73b	63	Réplica	2024-02-20 00:00:00	Réplica apresentada	2025-11-01 23:16:39.29
5019783f-ef83-4234-ac74-c09706e8fb5d	dd3279ce-2053-4ff7-b269-53e9a757c73b	193	Audiência Designada	2024-03-15 00:00:00	Audiência de Conciliação designada	2025-11-01 23:16:39.291
208fcca4-f09d-4800-939f-ecd7c6ce5f78	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	92	Publicação	2024-11-25 15:02:41	\N	2025-11-23 16:37:01.289
fb5be8f2-c572-495d-893b-d1c79be125b7	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	85	Petição	2024-12-11 12:04:58	Petição (outras): tipo_de_peticao	2025-11-23 16:37:01.289
dc2efb5c-2267-4816-a09e-ecf21241819e	51b76c24-5faa-4943-849a-da72e62d0bdf	11	Distribuição	2024-01-15 00:00:00	Distribuição da Petição Inicial	2025-11-01 23:16:39.292
084a5fb2-e16d-42b7-9ca9-8c2b64599f4b	51b76c24-5faa-4943-849a-da72e62d0bdf	22	Citação	2024-01-20 00:00:00	Citação do Réu	2025-11-01 23:16:39.292
ecd23b0e-22a2-49be-a394-4182cc06d7cf	51b76c24-5faa-4943-849a-da72e62d0bdf	60	Contestação	2024-02-05 00:00:00	Apresentação de Contestação	2025-11-01 23:16:39.293
f90dabcb-5346-4dfd-81f0-c72f813f078d	51b76c24-5faa-4943-849a-da72e62d0bdf	63	Réplica	2024-02-20 00:00:00	Réplica apresentada	2025-11-01 23:16:39.294
972e77c9-dc56-424e-859c-81f2c7fba009	51b76c24-5faa-4943-849a-da72e62d0bdf	193	Audiência Designada	2024-03-15 00:00:00	Audiência de Conciliação designada	2025-11-01 23:16:39.295
885469f2-9694-4f22-8588-e39bcc0d3dc6	c6294081-137a-4db6-912c-46c05608bbc9	11	Distribuição	2024-01-15 00:00:00	Distribuição da Petição Inicial	2025-11-01 23:16:39.295
d14a001b-14c6-4d45-b5d0-630125526be9	c6294081-137a-4db6-912c-46c05608bbc9	22	Citação	2024-01-20 00:00:00	Citação do Réu	2025-11-01 23:16:39.296
8bdfb6b8-fb50-4c01-9c33-c25110bc3669	c6294081-137a-4db6-912c-46c05608bbc9	60	Contestação	2024-02-05 00:00:00	Apresentação de Contestação	2025-11-01 23:16:39.297
f6e5cdc0-21e1-4ef5-92a0-6302d5880f0e	c6294081-137a-4db6-912c-46c05608bbc9	63	Réplica	2024-02-20 00:00:00	Réplica apresentada	2025-11-01 23:16:39.297
0550f69d-a73a-455d-9b7d-fbe0c042cfc6	c6294081-137a-4db6-912c-46c05608bbc9	193	Audiência Designada	2024-03-15 00:00:00	Audiência de Conciliação designada	2025-11-01 23:16:39.298
7de9b83e-7094-4a00-92d4-6f2917ee7372	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	85	Petição	2024-12-17 12:39:55	Petição (outras): tipo_de_peticao	2025-11-23 16:37:01.289
2f4efe30-d412-4b24-8b40-5c020b02ea93	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	51	Conclusão	2025-01-16 11:35:38	para despacho: tipo_de_conclusao	2025-11-23 16:37:01.289
4f9c66ef-e7cc-4c65-a281-34e0468e3703	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	85	Petição	2025-01-17 19:06:43	Petição (outras): tipo_de_peticao	2025-11-23 16:37:01.289
6658a68d-c462-44d8-bfd1-08a78e54ce32	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	85	Petição	2025-01-26 03:08:35	Petição (outras): tipo_de_peticao	2025-11-23 16:37:01.289
907ef547-b551-42f1-9290-053fad749863	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	85	Petição	2025-01-26 03:17:42	Petição (outras): tipo_de_peticao	2025-11-23 16:37:01.289
d90ae575-7d7a-4085-bf1b-a6b44b419f19	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	85	Petição	2025-01-26 03:20:40	Petição (outras): tipo_de_peticao	2025-11-23 16:37:01.289
0d4b2c47-38e5-45ae-a35f-71dde72c732c	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	581	Documento	2025-02-03 12:10:35	Outros documentos: tipo_de_documento	2025-11-23 16:37:01.289
c21b2e44-2a68-4a3b-80e5-8a763ba03547	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	85	Petição	2025-02-13 13:16:09	Petição (outras): tipo_de_peticao	2025-11-23 16:37:01.289
45660033-7df7-4fff-a8af-f620a44c1f57	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	51	Conclusão	2025-03-31 16:30:37	para despacho: tipo_de_conclusao	2025-11-23 16:37:01.289
67d8841c-6643-4c01-bfc5-ea14115c6c90	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	92	Publicação	2025-03-31 16:30:37	\N	2025-11-23 16:37:01.289
cd6a026a-b910-4f83-9509-cadb0f842a39	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	92	Publicação	2025-03-31 16:30:37	\N	2025-11-23 16:37:01.289
1c1da95c-2961-4d92-a735-f6760de7b4f9	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	85	Petição	2025-04-10 13:22:50	Petição (outras): tipo_de_peticao	2025-11-23 16:37:01.289
b09f1b20-aa48-4ce7-8f4d-79a19f73e8e3	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	85	Petição	2025-04-24 16:00:14	Petição (outras): tipo_de_peticao	2025-11-23 16:37:01.289
e039c3bd-5bd4-4547-8830-11d14fd1be6a	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	51	Conclusão	2025-05-05 16:54:18	para despacho: tipo_de_conclusao	2025-11-23 16:37:01.289
e03f4ae2-bf28-4a34-a9bf-bfbf58033bc0	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	92	Publicação	2025-05-05 16:54:18	\N	2025-11-23 16:37:01.289
a7c7968d-a8bb-4a80-bed5-aaab43363cb2	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	85	Petição	2025-05-12 22:03:16	Petição (outras): tipo_de_peticao	2025-11-23 16:37:01.289
3589f6f0-7894-4623-9d13-30a519dddf3d	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	85	Petição	2025-05-19 14:10:10	Petição (outras): tipo_de_peticao	2025-11-23 16:37:01.289
a43c413b-5388-45f2-9f92-e90110251d49	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	51	Conclusão	2025-06-17 16:59:07	para despacho: tipo_de_conclusao	2025-11-23 16:37:01.289
c07f856e-b37f-4d5a-85e2-4da0d633b8e3	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	92	Publicação	2025-06-17 16:59:07	\N	2025-11-23 16:37:01.289
21b9065f-8dab-4e4d-a68e-15c5e0d75975	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	85	Petição	2025-06-26 18:14:01	Parecer: tipo_de_peticao	2025-11-23 16:37:01.289
384b101b-fe96-46f4-8604-821612fc1d74	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	51	Conclusão	2025-07-10 11:03:45	para julgamento: tipo_de_conclusao	2025-11-23 16:37:01.289
c22f9851-f327-4ca5-9efd-a49f0074ba36	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	92	Publicação	2025-07-10 11:03:45	\N	2025-11-23 16:37:01.289
925df735-ec15-4950-8745-e7f7fa42e73d	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	85	Petição	2025-08-05 14:48:29	Petição (outras): tipo_de_peticao	2025-11-23 16:37:01.289
b17ac540-6e6c-4de7-bd27-ed1659974c63	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	85	Petição	2025-08-29 21:38:26	Petição (outras): tipo_de_peticao	2025-11-23 16:37:01.289
1cb92147-af6d-4c66-bec8-9c9514fa885e	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	11383	Ato ordinatório	2024-09-21 21:00:27	\N	2025-11-23 16:37:01.289
6da340a6-1d05-4894-8203-5612f4ecb07b	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	11383	Ato ordinatório	2024-10-02 15:21:10	\N	2025-11-23 16:37:01.289
c5301e9c-1e63-422f-bfa4-1d36d7c04419	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	12387	Decisão de Saneamento e Organização	2024-10-03 01:03:50	\N	2025-11-23 16:37:01.289
8b042226-609f-4642-abe6-18e21c162be6	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	11383	Ato ordinatório	2024-11-22 15:18:06	\N	2025-11-23 16:37:01.289
8f4af9f7-8195-407f-b54f-5d3c16f9622c	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	11010	Mero expediente	2024-11-25 11:06:42	\N	2025-11-23 16:37:01.289
d92f0337-d3fb-49ed-9f14-5e8f57d931c9	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	11383	Ato ordinatório	2025-01-16 11:34:56	\N	2025-11-23 16:37:01.289
5fd8a9d6-52cc-4932-a5d9-386bb71dd3dd	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	11010	Mero expediente	2025-01-16 19:48:44	\N	2025-11-23 16:37:01.289
8d995ea5-0566-4835-994b-3879dc2a18e5	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	12265	Expedida/certificada	2025-01-17 15:49:13	\N	2025-11-23 16:37:01.289
e506f100-88a0-498d-800e-e01e2d00f14a	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	12266	Confirmada	2025-01-17 19:06:39	\N	2025-11-23 16:37:01.289
5eed5226-c5eb-44da-a20d-170693913b8a	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	12265	Expedida/certificada	2025-01-22 16:55:48	\N	2025-11-23 16:37:01.289
e3d18f3c-4165-4d52-ab9f-b4fb967e6de4	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	12266	Confirmada	2025-01-26 03:08:28	\N	2025-11-23 16:37:01.289
9e1db96c-847b-4c45-828e-1e50626d420d	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	12265	Expedida/certificada	2025-02-12 15:04:44	\N	2025-11-23 16:37:01.289
99f24f91-acca-4117-9f3a-ef894f0f2ab0	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	12266	Confirmada	2025-02-13 13:16:05	\N	2025-11-23 16:37:01.289
8d5f6d44-d4b5-4e25-91ee-76046eabfc78	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	11383	Ato ordinatório	2025-02-27 11:52:59	\N	2025-11-23 16:37:01.289
9d60d4c9-4910-4850-a643-2003e0adb346	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	11010	Mero expediente	2025-03-31 14:31:15	\N	2025-11-23 16:37:01.289
93986697-09c5-4611-a165-e074e55754aa	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	12265	Expedida/certificada	2025-04-02 18:43:48	\N	2025-11-23 16:37:01.289
eb653205-6087-4ff8-9fc2-3ec4a44f4e6f	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	12266	Confirmada	2025-04-10 13:22:45	\N	2025-11-23 16:37:01.289
73d7b266-529a-4d54-9df9-b362337af648	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	12265	Expedida/certificada	2025-04-24 15:25:45	\N	2025-11-23 16:37:01.289
aab9401c-16af-4aa2-8432-1ce33b54f1b2	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	12266	Confirmada	2025-04-24 16:00:09	\N	2025-11-23 16:37:01.289
5a395c4c-2ae4-4336-b574-6da93aaa5021	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	11383	Ato ordinatório	2025-04-28 13:32:23	\N	2025-11-23 16:37:01.289
facde042-e960-4cdd-ba29-0c4bffe62c49	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	11010	Mero expediente	2025-05-05 15:38:18	\N	2025-11-23 16:37:01.289
ceabf86f-3e8b-4f6d-9515-9c37cbd51a8f	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	12265	Expedida/certificada	2025-05-06 16:34:30	\N	2025-11-23 16:37:01.289
352cb6f3-8795-4057-a349-f33f0a70674b	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	12266	Confirmada	2025-05-12 22:03:13	\N	2025-11-23 16:37:01.289
9cfa547d-925a-4b81-9de6-d2ea127262ec	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	11383	Ato ordinatório	2025-06-13 15:26:43	\N	2025-11-23 16:37:01.289
d6edc782-582f-4a0b-bac6-fdf62175b438	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	11010	Mero expediente	2025-06-17 15:58:33	\N	2025-11-23 16:37:01.289
574fb0c7-efd7-4632-915e-195f2b0f576e	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	12265	Expedida/certificada	2025-06-23 12:28:23	\N	2025-11-23 16:37:01.289
086788c3-573c-4754-acec-48db589e8215	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	12266	Confirmada	2025-06-26 18:13:58	\N	2025-11-23 16:37:01.289
7e3e109f-495a-4826-9795-0ab8e4bf0c34	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	219	Procedência	2025-08-04 17:00:35	\N	2025-11-23 16:37:01.289
ca6988a3-ffc0-47bc-ab50-6d81ed0ef19a	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	12265	Expedida/certificada	2025-08-05 12:21:42	\N	2025-11-23 16:37:01.289
ad4ef301-2ef2-4ae1-baaf-c83b7b5bc7ac	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	12266	Confirmada	2025-08-16 03:41:57	\N	2025-11-23 16:37:01.289
4e3080b5-cd4e-41c0-a7da-6765c5e4fab7	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	26	Distribuição	2024-01-26 15:53:00	competência exclusiva: tipo_de_distribuicao_redistribuicao	2025-11-23 02:00:13.194
ffffd9c2-14c5-406f-8671-bc74931ac55e	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	51	Conclusão	2024-04-29 18:20:21	para despacho: tipo_de_conclusao	2025-11-23 02:00:13.194
153afe9b-c49b-4dd5-8aaf-1da97a4983d6	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	51	Conclusão	2024-05-08 17:41:44	para despacho: tipo_de_conclusao	2025-11-23 02:00:13.194
d04d8704-588d-40aa-8e89-1552b177c451	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	85	Petição	2024-06-19 17:21:50	Petição (outras): tipo_de_peticao	2025-11-23 02:00:13.194
beaaad58-7dd0-4840-b061-0fab327459e5	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	51	Conclusão	2024-06-24 16:56:14	para despacho: tipo_de_conclusao	2025-11-23 02:00:13.194
a793b99f-b12d-46e1-a325-3620ce450cab	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	14738	Retificação de Classe Processual	2024-08-21 17:40:52	\N	2025-11-23 02:00:13.194
a3a4c439-8145-4f9b-b39e-9bdd861e054d	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	51	Conclusão	2024-08-28 17:38:45	para despacho: tipo_de_conclusao	2025-11-23 02:00:13.194
c1854d96-45dc-4c99-99ab-2556a2c88a12	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	581	Documento	2024-11-08 13:45:33	Outros documentos: tipo_de_documento	2025-11-23 02:00:13.194
eea4fce7-017d-44f0-9b47-4f2b97d0d5c2	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	51	Conclusão	2024-11-08 13:49:10	para despacho: tipo_de_conclusao	2025-11-23 02:00:13.194
009d0572-ca59-489c-adf8-fb055116a7fd	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	11010	Mero expediente	2024-04-30 14:21:21	\N	2025-11-23 02:00:13.194
4067e16d-683f-4a1e-ae65-3d555cfc17a6	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	11010	Mero expediente	2024-05-08 17:42:11	\N	2025-11-23 02:00:13.194
6667edb3-be39-41cf-9b5c-cf6a411e5138	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	11383	Ato ordinatório	2024-05-15 17:05:18	\N	2025-11-23 02:00:13.194
831636f3-8b9a-410f-991e-17dcb6f58baa	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	11383	Ato ordinatório	2024-06-19 17:29:28	\N	2025-11-23 02:00:13.194
49090888-a535-4a30-9cd4-099f462f0901	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	11383	Ato ordinatório	2024-06-21 17:33:42	\N	2025-11-23 02:00:13.194
8dd5dd84-01b7-4492-b2a7-d6adeae3f275	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	11010	Mero expediente	2024-06-26 15:29:02	\N	2025-11-23 02:00:13.194
30827d73-5e01-4482-9c78-38a5fab959e6	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	11383	Ato ordinatório	2024-08-16 17:05:01	\N	2025-11-23 02:00:13.194
6c13e253-446d-41ee-a855-67eae5b44c44	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	11010	Mero expediente	2024-08-28 16:46:08	\N	2025-11-23 02:00:13.194
055ed714-6f4f-4bd1-87d6-4be7003c0320	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	11383	Ato ordinatório	2024-11-08 13:48:57	\N	2025-11-23 02:00:13.194
3b782d3f-4ab9-4bf4-afe6-29b75836f872	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	11010	Mero expediente	2024-11-14 13:02:07	\N	2025-11-23 02:00:13.194
8efe1cbc-660d-4b32-b9bf-aa24f673e209	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	246	Definitivo	2024-12-09 15:58:04	\N	2025-11-23 02:00:13.194
1c6ba1e2-d6e0-4146-a649-93964cc8a35f	fc7a3048-c5b5-4a37-89d1-590a416ef13a	26	Distribuição	2025-03-21 15:35:34	competência exclusiva: tipo_de_distribuicao_redistribuicao	2025-11-23 02:00:13.353
86b38250-3b8e-4755-9be6-cae7036c755a	fc7a3048-c5b5-4a37-89d1-590a416ef13a	581	Documento	2025-03-24 16:17:30	Outros documentos: tipo_de_documento	2025-11-23 02:00:13.353
2efe5baf-fa68-4e00-8210-d8e2144d49d5	fc7a3048-c5b5-4a37-89d1-590a416ef13a	12752	de Mediação	2025-04-04 16:00:02	\N	2025-11-23 02:00:13.353
2b1dd8bc-b1fa-4647-813b-c1fadd93ae64	fc7a3048-c5b5-4a37-89d1-590a416ef13a	12614	Remessa para o CEJUSC ou Centros de Conciliação/Mediação	2025-04-04 16:00:00	\N	2025-11-23 02:00:13.353
315ee764-ceaf-4fe6-b175-32852cb3a83c	fc7a3048-c5b5-4a37-89d1-590a416ef13a	12621	Recebimento no CEJUSC ou Centros de Conciliação/Mediação	2025-04-04 16:00:01	\N	2025-11-23 02:00:13.353
a1d17b8a-aecc-4a81-bc40-be98935cf8cc	fc7a3048-c5b5-4a37-89d1-590a416ef13a	12619	Recebimento do CEJUSC ou Centros de Conciliação/Mediação	2025-04-07 17:41:53	\N	2025-11-23 02:00:13.353
f04b9de8-4100-459e-9806-8e1acec8705a	5970c3f2-6fb6-4e10-aceb-5e6867e068a7	26	Distribuição	2025-03-21 15:38:46	competência exclusiva: tipo_de_distribuicao_redistribuicao	2025-11-23 02:00:13.504
793cd9eb-b907-47fc-9db5-1d90eb73ac14	5970c3f2-6fb6-4e10-aceb-5e6867e068a7	581	Documento	2025-03-24 16:19:23	Outros documentos: tipo_de_documento	2025-11-23 02:00:13.504
f2f9764e-eddc-4f81-a99c-9a20fb30fc0b	5970c3f2-6fb6-4e10-aceb-5e6867e068a7	12752	de Mediação	2025-04-04 17:00:02	\N	2025-11-23 02:00:13.504
295a7637-a117-4a98-94ef-c7e16d7621d5	5970c3f2-6fb6-4e10-aceb-5e6867e068a7	12614	Remessa para o CEJUSC ou Centros de Conciliação/Mediação	2025-04-04 17:00:00	\N	2025-11-23 02:00:13.504
28f442bf-697f-4398-8dfd-9f327396c1bf	5970c3f2-6fb6-4e10-aceb-5e6867e068a7	12621	Recebimento no CEJUSC ou Centros de Conciliação/Mediação	2025-04-04 17:00:01	\N	2025-11-23 02:00:13.504
a872dbdf-bc7a-4ada-b98b-12aa6fef3493	5970c3f2-6fb6-4e10-aceb-5e6867e068a7	12619	Recebimento do CEJUSC ou Centros de Conciliação/Mediação	2025-04-07 17:44:02	\N	2025-11-23 02:00:13.504
58caeb73-1965-4e51-a392-d9e0cb2a7ab7	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	26	Distribuição	2022-03-09 11:52:17	sorteio: tipo_de_distribuicao_redistribuicao	2025-11-23 02:00:18.723
040339d8-75c3-4734-97d2-2e06f72ceb4f	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	51	Conclusão	2022-03-09 12:32:37	para despacho: tipo_de_conclusao	2025-11-23 02:00:18.723
950b1509-bb31-4e94-9bd4-8e5743d82b92	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	85	Petição	2022-03-20 11:08:55	Petição (outras): tipo_de_peticao	2025-11-23 02:00:18.723
7ee978e1-daf6-43ba-ae2b-ebe228bb0da4	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	51	Conclusão	2022-05-04 11:56:19	para despacho: tipo_de_conclusao	2025-11-23 02:00:18.723
f62e53cc-b7b6-408f-8aec-63c9f352154e	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	85	Petição	2022-07-26 12:38:41	Petição (outras): tipo_de_peticao	2025-11-23 02:00:18.723
36b72576-7f2b-40a2-aafb-bb4cfeaba0d8	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	85	Petição	2022-08-25 10:54:42	Petição (outras): tipo_de_peticao	2025-11-23 02:00:18.723
02705328-bee9-45cd-9c16-5d3010862a09	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	85	Petição	2022-09-14 16:55:01	Petição (outras): tipo_de_peticao	2025-11-23 02:00:18.723
41b5d05e-7a2d-46f1-ae2b-658f053c7463	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	85	Petição	2022-09-16 17:50:52	Petição (outras): tipo_de_peticao	2025-11-23 02:00:18.723
7df8c2c2-93ca-453d-8129-7449688880d7	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	51	Conclusão	2022-09-29 12:32:33	para despacho: tipo_de_conclusao	2025-11-23 02:00:18.723
6515aaea-a0a3-4280-a8b2-34beb3765dc7	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	85	Petição	2022-12-08 15:02:32	Petição (outras): tipo_de_peticao	2025-11-23 02:00:18.723
1abe314a-f129-49f4-9aeb-977bb270722d	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	51	Conclusão	2023-03-09 11:02:48	para despacho: tipo_de_conclusao	2025-11-23 02:00:18.723
29bb2b43-60a1-4882-a727-cff76bd012d3	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	85	Petição	2023-03-23 15:45:48	Petição (outras): tipo_de_peticao	2025-11-23 02:00:18.723
3f1219d4-b40f-484e-8edd-8e2d4b13cde1	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	51	Conclusão	2023-06-21 10:12:17	para despacho: tipo_de_conclusao	2025-11-23 02:00:18.723
870dadfe-35d8-4ecf-99e7-af2cb6dbe306	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	51	Conclusão	2023-11-07 12:20:46	para despacho: tipo_de_conclusao	2025-11-23 02:00:18.723
d66d3180-c459-4ead-a8e2-1155800fa458	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	85	Petição	2024-02-23 07:53:25	Parecer: tipo_de_peticao	2025-11-23 02:00:18.723
e4c508f1-cf33-4595-ae30-4803cc6f0086	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	51	Conclusão	2024-05-15 10:01:13	para decisão: tipo_de_conclusao	2025-11-23 02:00:18.723
c959371e-2cd3-49cc-9ed5-4dd322ed4054	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	85	Petição	2024-08-20 17:17:44	Petição (outras): tipo_de_peticao	2025-11-23 02:00:18.723
adced23b-fda6-4116-b104-7b26ae96742f	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	85	Petição	2024-08-28 14:54:35	Petição (outras): tipo_de_peticao	2025-11-23 02:00:18.723
be6f2222-2061-4992-aa21-b651c61de43d	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	51	Conclusão	2024-09-18 09:50:19	para despacho: tipo_de_conclusao	2025-11-23 02:00:18.723
917aa87d-ef08-4e29-b700-af5195c5a278	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	51	Conclusão	2024-11-01 15:29:17	para julgamento: tipo_de_conclusao	2025-11-23 02:00:18.723
65a9d7bc-1ec5-4f50-b0e3-e4d21e81063e	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	92	Publicação	2024-11-01 15:29:17	\N	2025-11-23 02:00:18.723
9c2a38c1-9e6d-4df7-849c-0a64f70ce4d6	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	85	Petição	2024-12-16 12:26:09	Petição (outras): tipo_de_peticao	2025-11-23 02:00:18.723
819e0305-3091-42cc-8aec-a4447ebbc7d1	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	92	Publicação	2025-02-11 10:50:08	\N	2025-11-23 02:00:18.723
a2ddbb04-d4db-405e-9aa3-4ab4ef19d886	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	85	Petição	2025-02-18 21:07:40	Petição (outras): tipo_de_peticao	2025-11-23 02:00:18.723
a9dbcd95-68d8-45b3-a71a-8da0e193a38c	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	11383	Ato ordinatório	2022-03-09 12:32:19	\N	2025-11-23 02:00:18.723
681eb3ab-990c-496c-b387-c285456d7d8a	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	787	Gratuidade da Justiça	2022-03-15 18:08:44	\N	2025-11-23 02:00:18.723
af0eba0b-f2a7-488e-a316-5657080e6f13	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12265	Expedida/certificada	2022-03-17 17:19:41	\N	2025-11-23 02:00:18.723
d056af8d-371a-41d3-b2e4-bed4b592306f	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12266	Confirmada	2022-03-20 11:08:36	\N	2025-11-23 02:00:18.723
33b162bf-4cfc-4b54-a20a-6782d5e12032	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	11010	Mero expediente	2022-06-27 11:38:06	\N	2025-11-23 02:00:18.723
31d5d7dc-5f96-4e69-b097-46251400f3d8	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12287	Expedida/Certificada	2022-06-30 11:53:49	\N	2025-11-23 02:00:18.723
32bb5c09-44f3-4f0c-8ddf-17bf799cd9a9	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12288	Confirmada	2022-07-11 05:08:31	\N	2025-11-23 02:00:18.723
d344747a-5649-471b-a9b6-638b2f655566	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	11383	Ato ordinatório	2022-08-05 21:37:51	\N	2025-11-23 02:00:18.723
97653928-81ca-4c1f-a6a8-8e1582aa5bcc	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12265	Expedida/certificada	2022-08-08 11:20:00	\N	2025-11-23 02:00:18.723
b1f98927-d9f0-42ce-af33-0d3816ffbf32	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12266	Confirmada	2022-08-19 03:11:58	\N	2025-11-23 02:00:18.723
1f0abfc6-e267-4142-b138-54668c628c1a	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	11383	Ato ordinatório	2022-09-05 12:45:00	\N	2025-11-23 02:00:18.723
f725f43c-63f6-4234-90c4-efda1485e93e	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12265	Expedida/certificada	2022-09-05 13:11:43	\N	2025-11-23 02:00:18.723
625e93df-353b-4310-b186-651503cb39a3	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12265	Expedida/certificada	2022-09-05 13:11:44	\N	2025-11-23 02:00:18.723
c66082eb-6f83-4095-b7f0-6bc90c2675ac	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12266	Confirmada	2022-09-06 13:57:15	\N	2025-11-23 02:00:18.723
669331b2-9268-479a-96fd-7230a6000fdb	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12266	Confirmada	2022-09-15 17:59:41	\N	2025-11-23 02:00:18.723
9b02dda8-f2df-4b73-bf81-e004a163671c	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	11383	Ato ordinatório	2022-09-29 12:32:17	\N	2025-11-23 02:00:18.723
cef2f3c2-fde0-4075-a349-aab7707bde4f	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	11010	Mero expediente	2022-11-29 16:36:30	\N	2025-11-23 02:00:18.723
7029f281-8c24-4b76-bc65-b457827ee4ca	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12265	Expedida/certificada	2022-12-01 17:27:38	\N	2025-11-23 02:00:18.723
dfbe6f01-6431-4c59-8de4-fbb943cdf2b2	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12266	Confirmada	2022-12-02 10:37:15	\N	2025-11-23 02:00:18.723
9dec919f-17cf-4bd3-a428-cceed0bf62fc	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	11010	Mero expediente	2023-03-17 11:16:02	\N	2025-11-23 02:00:18.723
1ccec354-bfe4-46c4-b509-da240b983001	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12265	Expedida/certificada	2023-03-17 19:13:00	\N	2025-11-23 02:00:18.723
b6c03b5d-8bf1-49c8-9e3e-ad261eed2cca	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12266	Confirmada	2023-03-20 14:30:28	\N	2025-11-23 02:00:18.723
ddb9f26b-6e35-4ed6-a80e-7e7ecefe9933	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	11010	Mero expediente	2023-10-20 16:53:19	\N	2025-11-23 02:00:18.723
6cc5c094-ac1f-4ef6-a249-708f3000aac3	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	11383	Ato ordinatório	2023-11-07 12:18:56	\N	2025-11-23 02:00:18.723
5e2d52a8-033f-4293-af97-5152b0de0634	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	11010	Mero expediente	2024-02-15 14:45:29	\N	2025-11-23 02:00:18.723
d865e212-5143-46e0-9073-74c9aa89be9a	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12265	Expedida/certificada	2024-02-22 12:25:26	\N	2025-11-23 02:00:18.723
50ae52ef-15df-44a9-bb2e-8a4449ce491a	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12266	Confirmada	2024-02-23 07:53:20	\N	2025-11-23 02:00:18.723
c6ce7a0a-6c48-4493-942e-c867d78d6af7	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12387	Decisão de Saneamento e Organização	2024-08-09 17:37:16	\N	2025-11-23 02:00:18.723
890c00e0-133d-4661-891f-8b9d04082dc6	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12265	Expedida/certificada	2024-08-13 18:00:05	\N	2025-11-23 02:00:18.723
fc4a3387-d509-47a8-b1b1-073ebfd33a65	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12265	Expedida/certificada	2024-08-13 18:00:23	\N	2025-11-23 02:00:18.723
ea7dc9b2-8ca9-479c-b6d7-ae9f8db6d4f9	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12266	Confirmada	2024-08-14 08:30:00	\N	2025-11-23 02:00:18.723
abd57678-8d91-41ed-8f35-1059ab6116fe	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12266	Confirmada	2024-08-20 17:13:32	\N	2025-11-23 02:00:18.723
f4b4a234-3b8d-45a5-ac93-f08b54c6478d	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	11383	Ato ordinatório	2024-09-18 09:49:35	\N	2025-11-23 02:00:18.723
bbfae61e-c9d6-4961-9b4d-8d3ac2dac907	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	11010	Mero expediente	2024-09-25 14:19:03	\N	2025-11-23 02:00:18.723
04d58d52-34b7-4138-9031-062ba5cf2dc4	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	221	Procedência em Parte	2024-11-16 13:17:48	\N	2025-11-23 02:00:18.723
5f21f2b5-62cd-440f-8aa6-3a21722858b8	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	11383	Ato ordinatório	2025-02-11 10:50:08	\N	2025-11-23 02:00:18.723
5f1ca6a5-e7ad-485d-b250-169d32063bc6	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	123	Remessa	2025-05-09 14:09:00	outros motivos: motivo_da_remessa	2025-11-23 02:00:18.723
33a7f4ec-4e41-4ece-9cdc-bb044ba587bf	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	26	Distribuição	2025-05-12 11:00:00	sorteio: tipo_de_distribuicao_redistribuicao	2025-11-23 02:00:18.723
00a00fa2-8ef3-4f1c-b459-7a9145e20de1	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	51	Conclusão	2025-05-12 11:07:00	para despacho: tipo_de_conclusao	2025-11-23 02:00:18.723
7b07b7ad-3699-4162-b777-9c1bac43e0fb	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	92	Publicação	2025-05-15 00:05:00	\N	2025-11-23 02:00:18.723
4190b50a-2a3e-45e4-8cda-326fa20d7f0f	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	92	Publicação	2025-05-23 00:05:00	\N	2025-11-23 02:00:18.723
3f8158e1-c7ed-48c4-8f94-0a3596897804	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	85	Petição	2025-05-27 11:44:00	Petição (outras): tipo_de_peticao	2025-11-23 02:00:18.723
0e963488-32b8-420f-9133-9205e147c503	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	123	Remessa	2025-06-02 08:03:00	outros motivos: motivo_da_remessa	2025-11-23 02:00:18.723
b9ee8541-7d9f-4a5a-85e4-42fc8c550df9	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	123	Remessa	2025-06-03 11:58:00	outros motivos: motivo_da_remessa	2025-11-23 02:00:18.723
dff0469d-31e9-4d08-9b65-1c8a5ba92f00	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	36	Redistribuição	2025-06-05 11:20:00	incompetência: motivo_da_redistribuicao; prevenção: tipo_de_distribuicao_redistribuicao	2025-11-23 02:00:18.723
b71a5bfe-6e27-4931-b348-9b04164f4180	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	51	Conclusão	2025-06-05 11:24:00	para despacho: tipo_de_conclusao	2025-11-23 02:00:18.723
8cb6bf44-eb0d-4dc4-9d16-1d0abfe211e8	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	92	Publicação	2025-06-10 00:05:00	\N	2025-11-23 02:00:18.723
2e7567bd-1558-46f5-b3a7-2143e4d2cbe1	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	85	Petição	2025-06-30 15:34:00	Parecer: tipo_de_peticao	2025-11-23 02:00:18.723
fee98fe1-37dc-4e06-8aa1-9e99b237b493	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	51	Conclusão	2025-06-30 15:35:00	para decisão: tipo_de_conclusao	2025-11-23 02:00:18.723
a008dcbc-11b7-4511-80dd-392489bad623	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	981	Recebimento	2025-05-09 14:08:00	\N	2025-11-23 02:00:18.723
e3e6011a-8de9-4764-b53d-848dcad6a9f1	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	941	Incompetência	2025-05-21 14:54:00	\N	2025-11-23 02:00:18.723
8fedcb93-9ca2-4926-a55f-3843b8f4be51	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12266	Confirmada	2025-05-23 08:47:00	\N	2025-11-23 02:00:18.723
51883fef-a14c-43ae-a95d-f8f7da86d2ff	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	11010	Mero expediente	2025-06-26 14:30:00	\N	2025-11-23 02:00:18.723
fdfb72ab-4bb8-4c1e-af31-0e2c6d81db24	d8a6685f-32c1-4fbc-80ff-92ed00a49a57	12266	Confirmada	2025-06-26 19:47:00	\N	2025-11-23 02:00:18.723
c4ba5459-c0c3-47f5-ad96-1365d86ba6cb	84437036-9f39-493e-9df8-b5d360d504fd	26	Distribuição	2020-12-08 23:53:46	sorteio: tipo_de_distribuicao_redistribuicao	2025-11-23 02:00:18.927
c8ddbd40-aefa-4af5-a18d-807a2c643b75	84437036-9f39-493e-9df8-b5d360d504fd	51	Conclusão	2020-12-09 19:04:02	para decisão: tipo_de_conclusao	2025-11-23 02:00:18.927
1b3ffbf2-c17b-43fc-94dc-9265f1cf2224	84437036-9f39-493e-9df8-b5d360d504fd	60	Expedição de documento	2021-04-27 15:28:37	Mandado: tipo_de_documento	2025-11-23 02:00:18.927
09e3f129-4dde-4ed9-ad22-41175d1bb80c	84437036-9f39-493e-9df8-b5d360d504fd	85	Petição	2021-11-17 15:14:41	Petição (outras): tipo_de_peticao	2025-11-23 02:00:18.927
43b521f0-2c09-431f-9f3b-2886892b749a	84437036-9f39-493e-9df8-b5d360d504fd	51	Conclusão	2022-02-23 11:40:18	para despacho: tipo_de_conclusao	2025-11-23 02:00:18.927
d4cbff54-99a3-43e7-ad88-af93cf2fa8a4	84437036-9f39-493e-9df8-b5d360d504fd	85	Petição	2022-11-06 19:13:09	Petição (outras): tipo_de_peticao	2025-11-23 02:00:18.927
b8d3a816-0cd4-4391-be85-aec4b21611d3	84437036-9f39-493e-9df8-b5d360d504fd	51	Conclusão	2023-05-08 14:11:07	para despacho: tipo_de_conclusao	2025-11-23 02:00:18.927
05e6114d-7e34-4b63-960f-ec01edf749a7	84437036-9f39-493e-9df8-b5d360d504fd	85	Petição	2023-05-20 17:28:48	Petição (outras): tipo_de_peticao	2025-11-23 02:00:18.927
5cae6198-4225-4d28-889b-e409f14112a5	84437036-9f39-493e-9df8-b5d360d504fd	51	Conclusão	2023-08-21 09:17:18	para despacho: tipo_de_conclusao	2025-11-23 02:00:18.927
60374c11-cd48-4154-8ab8-93a3a7027c27	84437036-9f39-493e-9df8-b5d360d504fd	85	Petição	2023-09-29 09:53:06	Petição (outras): tipo_de_peticao	2025-11-23 02:00:18.927
8704b1ae-a183-4b59-a8ff-073b39114d64	84437036-9f39-493e-9df8-b5d360d504fd	51	Conclusão	2024-01-17 09:56:27	para despacho: tipo_de_conclusao	2025-11-23 02:00:18.927
456bfec1-96ef-4ad8-842d-ebde9e71b2a3	84437036-9f39-493e-9df8-b5d360d504fd	581	Documento	2024-03-15 15:08:03	Outros documentos: tipo_de_documento	2025-11-23 02:00:18.927
897605a5-ffff-4e44-8a23-dd59ec2af753	84437036-9f39-493e-9df8-b5d360d504fd	85	Petição	2024-03-19 11:15:40	Petição (outras): tipo_de_peticao	2025-11-23 02:00:18.927
85b8c988-51b0-427e-8ab5-d173f0a3e14b	84437036-9f39-493e-9df8-b5d360d504fd	92	Publicação	2024-11-19 21:09:03	\N	2025-11-23 02:00:18.927
6b2285fb-5480-419f-8bfe-e98aff736d6a	84437036-9f39-493e-9df8-b5d360d504fd	92	Publicação	2024-12-11 03:30:47	\N	2025-11-23 02:00:18.927
6c350e16-5ff6-48f7-a9e1-2dc4747bce89	84437036-9f39-493e-9df8-b5d360d504fd	85	Petição	2025-03-12 18:21:53	Petição (outras): tipo_de_peticao	2025-11-23 02:00:18.927
8f990845-67af-4744-9ad3-66244d39b521	84437036-9f39-493e-9df8-b5d360d504fd	51	Conclusão	2025-04-10 13:19:08	para despacho: tipo_de_conclusao	2025-11-23 02:00:18.927
34fa79d2-363b-4700-9d45-fe9f4fb41c00	84437036-9f39-493e-9df8-b5d360d504fd	92	Publicação	2025-04-10 13:19:08	\N	2025-11-23 02:00:18.927
7202ec79-ef24-4c94-8d4e-9a8ebd2c5e9d	84437036-9f39-493e-9df8-b5d360d504fd	60	Expedição de documento	2025-08-21 12:35:04	Outros documentos: tipo_de_documento	2025-11-23 02:00:18.927
a5d20fbc-3cc7-425a-acb8-981fdce1f58d	84437036-9f39-493e-9df8-b5d360d504fd	11383	Ato ordinatório	2020-12-09 19:03:48	\N	2025-11-23 02:00:18.927
f4d224c3-e28a-4111-a6bc-7f378145dfb7	84437036-9f39-493e-9df8-b5d360d504fd	785	Antecipação de tutela	2020-12-13 16:32:20	\N	2025-11-23 02:00:18.927
90d9b3d0-a6db-4232-91ea-adecd41afab6	84437036-9f39-493e-9df8-b5d360d504fd	12265	Expedida/certificada	2020-12-14 11:27:28	\N	2025-11-23 02:00:18.927
5fe772ec-3284-4a5c-9a94-37ec90cd8f82	84437036-9f39-493e-9df8-b5d360d504fd	12266	Confirmada	2020-12-14 18:49:53	\N	2025-11-23 02:00:18.927
beeaed22-05e1-445e-b326-3387acabf9c0	84437036-9f39-493e-9df8-b5d360d504fd	11383	Ato ordinatório	2021-06-14 09:52:28	\N	2025-11-23 02:00:18.927
ddc78e27-8822-4a3a-891e-8092dbdb4a0b	84437036-9f39-493e-9df8-b5d360d504fd	12287	Expedida/Certificada	2021-07-21 02:23:17	\N	2025-11-23 02:00:18.927
b91d6035-d279-48cf-9e1a-0ca69a7852fc	84437036-9f39-493e-9df8-b5d360d504fd	12288	Confirmada	2021-07-21 11:42:50	\N	2025-11-23 02:00:18.927
d2adcb7e-145d-465e-aaa3-fcf7d0c8253a	84437036-9f39-493e-9df8-b5d360d504fd	11383	Ato ordinatório	2021-08-30 01:58:49	\N	2025-11-23 02:00:18.927
bfa7a6f0-2a60-4b7b-8d16-535d7b3cf2a1	84437036-9f39-493e-9df8-b5d360d504fd	12265	Expedida/certificada	2021-11-11 16:33:34	\N	2025-11-23 02:00:18.927
983551c5-f426-453e-b370-013f3268134d	84437036-9f39-493e-9df8-b5d360d504fd	12266	Confirmada	2021-11-17 15:11:47	\N	2025-11-23 02:00:18.927
c021d3ea-19eb-4147-8403-3961d16fc359	84437036-9f39-493e-9df8-b5d360d504fd	11010	Mero expediente	2022-04-13 20:26:15	\N	2025-11-23 02:00:18.927
8a044fdf-8b2c-4f15-a4c0-9c4b8374814a	84437036-9f39-493e-9df8-b5d360d504fd	12265	Expedida/certificada	2022-07-12 19:31:03	\N	2025-11-23 02:00:18.927
523f7249-0460-4e2a-a7b2-a77ff91feb64	84437036-9f39-493e-9df8-b5d360d504fd	12266	Confirmada	2022-07-12 20:36:52	\N	2025-11-23 02:00:18.927
f77a1480-826b-448b-a5ca-d2c782bc739a	84437036-9f39-493e-9df8-b5d360d504fd	12287	Expedida/Certificada	2022-07-26 18:32:31	\N	2025-11-23 02:00:18.927
aa11cfc4-9c66-42e3-95d4-b07c54b3ce29	84437036-9f39-493e-9df8-b5d360d504fd	12288	Confirmada	2022-07-26 18:32:31	\N	2025-11-23 02:00:18.927
b2a85f5b-26b0-435b-bb09-54a3d76c8ef0	84437036-9f39-493e-9df8-b5d360d504fd	12287	Expedida/Certificada	2022-07-26 18:32:33	\N	2025-11-23 02:00:18.927
367f757a-8678-4d18-b7f7-f2c8bd7d24ec	84437036-9f39-493e-9df8-b5d360d504fd	12288	Confirmada	2022-07-26 18:32:33	\N	2025-11-23 02:00:18.927
97f619d6-ccae-42c7-be8d-98fe7c2c3ff4	84437036-9f39-493e-9df8-b5d360d504fd	11383	Ato ordinatório	2022-08-19 02:46:53	\N	2025-11-23 02:00:18.927
70af0db7-9399-4cfe-9614-e84c7c389d5a	84437036-9f39-493e-9df8-b5d360d504fd	11383	Ato ordinatório	2022-08-19 02:46:54	\N	2025-11-23 02:00:18.927
45af961d-787a-445a-a410-40492ad65aea	84437036-9f39-493e-9df8-b5d360d504fd	12265	Expedida/certificada	2022-10-26 19:27:31	\N	2025-11-23 02:00:18.927
0002a280-29e8-4416-86dc-823227efe7b5	84437036-9f39-493e-9df8-b5d360d504fd	12266	Confirmada	2022-11-06 19:11:29	\N	2025-11-23 02:00:18.927
a8edf516-9298-499a-8b26-196994a6e352	84437036-9f39-493e-9df8-b5d360d504fd	11010	Mero expediente	2023-05-09 13:25:42	\N	2025-11-23 02:00:18.927
930e7220-3692-40eb-958f-19d867a54e32	84437036-9f39-493e-9df8-b5d360d504fd	12265	Expedida/certificada	2023-05-17 20:29:44	\N	2025-11-23 02:00:18.927
4dd97165-3671-468d-95bb-7abf4ef901d8	84437036-9f39-493e-9df8-b5d360d504fd	12266	Confirmada	2023-05-20 17:20:22	\N	2025-11-23 02:00:18.927
bfaa6557-7a04-47c6-816a-c9d5b22d3ffe	84437036-9f39-493e-9df8-b5d360d504fd	11010	Mero expediente	2023-09-18 11:18:38	\N	2025-11-23 02:00:18.927
18587c2e-8c29-4b07-8496-585a8cd5ea5f	84437036-9f39-493e-9df8-b5d360d504fd	12265	Expedida/certificada	2023-09-26 17:58:23	\N	2025-11-23 02:00:18.927
74c95236-684d-495c-a088-9f52a98d7471	84437036-9f39-493e-9df8-b5d360d504fd	12266	Confirmada	2023-09-29 09:52:29	\N	2025-11-23 02:00:18.927
d938a91b-b6b5-4082-a26e-e918c6813dd3	84437036-9f39-493e-9df8-b5d360d504fd	11383	Ato ordinatório	2023-12-28 15:47:04	\N	2025-11-23 02:00:18.927
2c43da28-f547-4021-98a0-29dcdd98fffd	84437036-9f39-493e-9df8-b5d360d504fd	11010	Mero expediente	2024-02-22 15:08:03	\N	2025-11-23 02:00:18.927
07adafae-6013-4b7b-ba08-eb8f2c31260e	84437036-9f39-493e-9df8-b5d360d504fd	12265	Expedida/certificada	2024-03-18 16:09:44	\N	2025-11-23 02:00:18.927
75f41813-c7e9-43a0-a9ad-48061d7b5ec8	84437036-9f39-493e-9df8-b5d360d504fd	12266	Confirmada	2024-03-19 11:07:36	\N	2025-11-23 02:00:18.927
8760dc93-0432-45f8-b0cd-21bb7bbc0afd	84437036-9f39-493e-9df8-b5d360d504fd	11383	Ato ordinatório	2024-08-06 10:44:22	\N	2025-11-23 02:00:18.927
95312836-faa3-411c-ac0f-64c94f4ee807	84437036-9f39-493e-9df8-b5d360d504fd	12287	Expedida/Certificada	2024-11-19 21:06:09	\N	2025-11-23 02:00:18.927
5b507cd5-c751-4670-a8a3-073564ae6505	84437036-9f39-493e-9df8-b5d360d504fd	11383	Ato ordinatório	2024-11-19 21:09:03	\N	2025-11-23 02:00:18.927
8b8e9c48-9c69-45e6-ba96-0daf9aa9b69f	84437036-9f39-493e-9df8-b5d360d504fd	12288	Confirmada	2024-11-21 16:03:19	\N	2025-11-23 02:00:18.927
d02585f8-64c3-43dd-8976-28a4fac5ce00	84437036-9f39-493e-9df8-b5d360d504fd	11383	Ato ordinatório	2024-12-11 03:30:47	\N	2025-11-23 02:00:18.927
8d65516f-d530-4a56-9b7a-1029010759a6	84437036-9f39-493e-9df8-b5d360d504fd	11010	Mero expediente	2025-05-27 13:56:13	\N	2025-11-23 02:00:18.927
3e38a712-d8d5-4c34-9862-651248efe0a4	c17d3c11-806b-4978-8c0d-a777e2d84c9c	11383	Ato ordinatório	2020-07-16 03:32:25	\N	2025-11-23 02:00:37.844
6bdef0ad-ea49-4558-a65e-1f63da3c4dce	c17d3c11-806b-4978-8c0d-a777e2d84c9c	26	Distribuição	2013-12-18 14:29:12	sorteio: tipo_de_distribuicao_redistribuicao	2025-11-23 02:00:37.844
9f79b063-b7a5-4847-aca2-cd6a0dc16379	c17d3c11-806b-4978-8c0d-a777e2d84c9c	982	Remessa	2013-12-19 11:35:48	outros motivos: motivo_da_remessa	2025-11-23 02:00:37.844
c29540d3-6b20-4bdc-a090-cd2c7c2f9920	c17d3c11-806b-4978-8c0d-a777e2d84c9c	132	Recebimento	2013-12-19 12:06:34	\N	2025-11-23 02:00:37.844
7a4e0f5f-2b3a-4a19-8eb1-09604ccb1917	c17d3c11-806b-4978-8c0d-a777e2d84c9c	60	Expedição de documento	2014-01-28 15:48:58	Carta: tipo_de_documento	2025-11-23 02:00:37.844
4cd5e8b7-d64d-45e8-9b28-03afdfcdcd33	c17d3c11-806b-4978-8c0d-a777e2d84c9c	60	Expedição de documento	2014-02-04 16:23:00	Outros documentos: tipo_de_documento	2025-11-23 02:00:37.844
31893d60-90b4-4052-b79a-1205ce26ed2d	c17d3c11-806b-4978-8c0d-a777e2d84c9c	85	Petição	2014-05-20 14:24:37	Petição (outras): tipo_de_peticao	2025-11-23 02:00:37.844
71a879ea-dd4d-4c14-8f7f-ac35f751b057	c17d3c11-806b-4978-8c0d-a777e2d84c9c	85	Petição	2014-05-20 14:28:00	Petição (outras): tipo_de_peticao	2025-11-23 02:00:37.844
015a0fef-2891-49da-b568-0dc888ea1e8b	c17d3c11-806b-4978-8c0d-a777e2d84c9c	11383	Ato ordinatório	2015-08-19 17:24:15	\N	2025-11-23 02:00:37.844
37506341-5629-4117-85c9-c03ba7532c17	c17d3c11-806b-4978-8c0d-a777e2d84c9c	493	Entrega em carga/vista	2015-08-19 17:27:52	\N	2025-11-23 02:00:37.844
5a20c458-5642-47a8-9679-93b4c7d6d8a9	c17d3c11-806b-4978-8c0d-a777e2d84c9c	493	Entrega em carga/vista	2015-09-01 15:54:09	\N	2025-11-23 02:00:37.844
7c54e675-6fbe-4aa5-931c-5014b00d2f12	c17d3c11-806b-4978-8c0d-a777e2d84c9c	132	Recebimento	2015-10-06 18:01:14	\N	2025-11-23 02:00:37.844
c7b0521d-5c6d-4191-9951-cf02eebf51fb	c17d3c11-806b-4978-8c0d-a777e2d84c9c	85	Petição	2018-05-07 16:40:36	Petição (outras): tipo_de_peticao	2025-11-23 02:00:37.844
d3b046ec-7207-497b-b7fd-9b72d3b114fe	c17d3c11-806b-4978-8c0d-a777e2d84c9c	11383	Ato ordinatório	2018-05-08 12:05:07	\N	2025-11-23 02:00:37.844
4f0a2c27-dc74-49fd-a3c2-22b7fd3aad42	c17d3c11-806b-4978-8c0d-a777e2d84c9c	493	Entrega em carga/vista	2018-05-14 16:37:33	\N	2025-11-23 02:00:37.844
7366fb1d-b84a-48d6-9c6f-a7822519a1f5	c17d3c11-806b-4978-8c0d-a777e2d84c9c	132	Recebimento	2018-06-19 12:03:06	\N	2025-11-23 02:00:37.844
9a9f0a77-aa1e-470d-9bc7-b2fcd6b2eeb5	c17d3c11-806b-4978-8c0d-a777e2d84c9c	51	Conclusão	2018-09-25 10:24:47	para decisão: tipo_de_conclusao	2025-11-23 02:00:37.844
9927b274-0a7b-4a9f-999c-e63ce0cf9ec3	c17d3c11-806b-4978-8c0d-a777e2d84c9c	12164	Outras Decisões	2018-12-04 13:06:28	\N	2025-11-23 02:00:37.844
c95f7a81-839e-4a31-a176-679244406708	c17d3c11-806b-4978-8c0d-a777e2d84c9c	132	Recebimento	2018-12-04 15:10:42	\N	2025-11-23 02:00:37.844
c254467c-c257-49ee-8022-70756119c718	c17d3c11-806b-4978-8c0d-a777e2d84c9c	245	Provisório	2018-12-05 12:37:39	\N	2025-11-23 02:00:37.844
785cd9f0-1c55-45d8-ad62-d234965fabc6	c17d3c11-806b-4978-8c0d-a777e2d84c9c	493	Entrega em carga/vista	2019-04-01 12:00:11	\N	2025-11-23 02:00:37.844
ca4fcbaf-1183-46ad-af59-d33e75a2624c	c17d3c11-806b-4978-8c0d-a777e2d84c9c	132	Recebimento	2019-05-28 15:39:17	\N	2025-11-23 02:00:37.844
0e18cacc-5418-4f2a-bb4f-8ce5f66b2c42	c17d3c11-806b-4978-8c0d-a777e2d84c9c	51	Conclusão	2019-05-29 16:35:56	para decisão: tipo_de_conclusao	2025-11-23 02:00:37.844
d1aa622c-6c2f-4b28-81a6-c3731c9f2328	c17d3c11-806b-4978-8c0d-a777e2d84c9c	12164	Outras Decisões	2019-07-05 12:03:14	\N	2025-11-23 02:00:37.844
0b7c62f2-16b4-4246-8411-7471381b40ac	c17d3c11-806b-4978-8c0d-a777e2d84c9c	132	Recebimento	2019-07-05 18:54:44	\N	2025-11-23 02:00:37.844
e3d4d66c-a41c-49c2-a82b-c11edd4c9637	c17d3c11-806b-4978-8c0d-a777e2d84c9c	493	Entrega em carga/vista	2019-07-31 18:05:06	\N	2025-11-23 02:00:37.844
6f25ba36-e3a7-4cd0-b753-4c7374d9b303	c17d3c11-806b-4978-8c0d-a777e2d84c9c	132	Recebimento	2019-09-19 17:46:19	\N	2025-11-23 02:00:37.844
54003de1-912b-4f80-8b7f-4c3f51e22abf	c17d3c11-806b-4978-8c0d-a777e2d84c9c	51	Conclusão	2019-09-19 17:54:44	para decisão: tipo_de_conclusao	2025-11-23 02:00:37.844
a4a0d6b2-9a7d-443f-969f-588e5ae7524c	c17d3c11-806b-4978-8c0d-a777e2d84c9c	12164	Outras Decisões	2019-10-24 11:22:07	\N	2025-11-23 02:00:37.844
acebb6a6-3544-48a5-b27e-6519e11e6b51	c17d3c11-806b-4978-8c0d-a777e2d84c9c	132	Recebimento	2019-10-24 12:18:14	\N	2025-11-23 02:00:37.844
09778d52-f156-45ec-b00d-540d552c03fc	c17d3c11-806b-4978-8c0d-a777e2d84c9c	11383	Ato ordinatório	2019-10-24 12:25:31	\N	2025-11-23 02:00:37.844
fe4869a8-17a7-40a4-bb70-8bd18ed8dd07	c17d3c11-806b-4978-8c0d-a777e2d84c9c	11383	Ato ordinatório	2020-01-21 04:09:57	\N	2025-11-23 02:00:37.844
46ffd6c2-4257-434c-830d-a09cadd9b1b0	c17d3c11-806b-4978-8c0d-a777e2d84c9c	11383	Ato ordinatório	2020-03-22 15:38:50	\N	2025-11-23 02:00:37.844
aad1915f-6cba-48b3-894d-03184abb8419	c17d3c11-806b-4978-8c0d-a777e2d84c9c	11383	Ato ordinatório	2020-04-08 21:42:30	\N	2025-11-23 02:00:37.844
7d21e29f-fd03-4758-9245-3e70c12cd26f	c17d3c11-806b-4978-8c0d-a777e2d84c9c	11383	Ato ordinatório	2020-05-08 03:51:45	\N	2025-11-23 02:00:37.844
9c06910d-460e-43f0-bdd8-07d45599554e	c17d3c11-806b-4978-8c0d-a777e2d84c9c	11383	Ato ordinatório	2020-05-29 21:22:16	\N	2025-11-23 02:00:37.844
882103f9-0c83-4a37-973b-c70729bda397	c17d3c11-806b-4978-8c0d-a777e2d84c9c	11383	Ato ordinatório	2020-12-18 21:23:31	\N	2025-11-23 02:00:37.844
5ebd246c-5227-4331-afd8-839e586a0967	c17d3c11-806b-4978-8c0d-a777e2d84c9c	11383	Ato ordinatório	2021-12-13 17:33:15	\N	2025-11-23 02:00:37.844
c087cf78-3fe0-4c9c-ab6d-eea35de0108d	c17d3c11-806b-4978-8c0d-a777e2d84c9c	60	Expedição de documento	2022-06-23 10:13:34	Certidão: tipo_de_documento	2025-11-23 02:00:37.844
0e39fa8f-d565-4407-9a75-ae170a972e41	c17d3c11-806b-4978-8c0d-a777e2d84c9c	493	Entrega em carga/vista	2022-06-23 10:21:49	\N	2025-11-23 02:00:37.844
b8dd52b1-62de-4c8a-8287-df6e57be4d6f	c17d3c11-806b-4978-8c0d-a777e2d84c9c	132	Recebimento	2022-08-29 10:30:58	\N	2025-11-23 02:00:37.844
28bbf4ed-3ea2-40ac-a476-96e404d508e1	c17d3c11-806b-4978-8c0d-a777e2d84c9c	11383	Ato ordinatório	2023-06-12 15:59:22	\N	2025-11-23 02:00:37.844
cd416aee-5a94-4d9e-9a1b-e944b620433c	c17d3c11-806b-4978-8c0d-a777e2d84c9c	493	Entrega em carga/vista	2023-09-25 14:06:17	\N	2025-11-23 02:00:37.844
2a5b34b0-b213-42f0-b465-20e41cf948c1	c17d3c11-806b-4978-8c0d-a777e2d84c9c	132	Recebimento	2024-02-19 15:36:39	\N	2025-11-23 02:00:37.844
b502d723-987b-40e9-b138-2bae52f43612	c17d3c11-806b-4978-8c0d-a777e2d84c9c	14732	Conversão de Autos Físicos em Eletrônicos	2024-02-19 16:33:31	\N	2025-11-23 02:00:37.844
90a34582-dfc6-44a8-bfdf-df47733cf3b7	c17d3c11-806b-4978-8c0d-a777e2d84c9c	85	Petição	2024-03-18 11:36:12	Petição (outras): tipo_de_peticao	2025-11-23 02:00:37.844
5a9adb70-8515-446e-a310-b9a677a96e6d	c17d3c11-806b-4978-8c0d-a777e2d84c9c	60	Expedição de documento	2024-04-03 10:18:55	Certidão: tipo_de_documento	2025-11-23 02:00:37.844
9afc595a-ed23-40fd-901a-f816600cd6b5	c17d3c11-806b-4978-8c0d-a777e2d84c9c	51	Conclusão	2024-04-03 10:21:59	para decisão: tipo_de_conclusao	2025-11-23 02:00:37.844
72e16c9f-01b3-4c95-8a51-a857fd331395	c17d3c11-806b-4978-8c0d-a777e2d84c9c	12164	Outras Decisões	2024-04-19 17:54:00	\N	2025-11-23 02:00:37.844
00e412c4-965a-4e74-b0f7-ef7cb86ed476	c17d3c11-806b-4978-8c0d-a777e2d84c9c	60	Expedição de documento	2024-04-23 11:10:11	Certidão: tipo_de_documento	2025-11-23 02:00:37.844
2311d242-35f4-4a20-b3ae-135b511da98f	c17d3c11-806b-4978-8c0d-a777e2d84c9c	60	Expedição de documento	2024-05-04 08:22:17	Certidão: tipo_de_documento	2025-11-23 02:00:37.844
0c4df541-8cbf-4640-9a3b-db59d4f8a09c	c17d3c11-806b-4978-8c0d-a777e2d84c9c	11383	Ato ordinatório	2024-12-18 10:30:28	\N	2025-11-23 02:00:37.844
d255905b-9b0c-42de-b94c-5fac23dd0967	c17d3c11-806b-4978-8c0d-a777e2d84c9c	60	Expedição de documento	2024-12-18 10:31:02	Certidão: tipo_de_documento	2025-11-23 02:00:37.844
2711b905-0d6c-4154-b36e-7e6316056eb8	c17d3c11-806b-4978-8c0d-a777e2d84c9c	85	Petição	2024-12-31 11:45:17	Petição (outras): tipo_de_peticao	2025-11-23 02:00:37.844
a51a4e37-29a5-4c62-ba78-9e4ca5633f0d	c17d3c11-806b-4978-8c0d-a777e2d84c9c	51	Conclusão	2025-01-10 10:54:05	para decisão: tipo_de_conclusao	2025-11-23 02:00:37.844
6a8e70ce-a7e4-47a9-9cc0-d3406291a560	c17d3c11-806b-4978-8c0d-a777e2d84c9c	898	Por decisão judicial	2025-01-29 15:51:59	\N	2025-11-23 02:00:37.844
6b268d01-db1b-472a-8679-ac8244a3b95b	c17d3c11-806b-4978-8c0d-a777e2d84c9c	60	Expedição de documento	2025-01-29 15:52:17	Certidão: tipo_de_documento	2025-11-23 02:00:37.844
0337db79-2118-4aa5-8f32-d3c86a695e20	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	26	Distribuição	2013-12-18 14:32:39	sorteio: tipo_de_distribuicao_redistribuicao	2025-11-23 02:00:38.159
ad24e29a-e89b-4715-ba57-73a44134373d	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	982	Remessa	2013-12-19 11:35:48	outros motivos: motivo_da_remessa	2025-11-23 02:00:38.159
96631d68-71ef-4a9e-97e0-d2a4212634a4	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	132	Recebimento	2013-12-19 12:06:34	\N	2025-11-23 02:00:38.159
b19fbf3d-8588-4625-ab46-7825939cdcfc	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	60	Expedição de documento	2014-01-21 10:13:42	Carta: tipo_de_documento	2025-11-23 02:00:38.159
c0cf5593-5a26-4ed7-b705-f7bdfe7da360	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	60	Expedição de documento	2014-01-23 15:17:00	Outros documentos: tipo_de_documento	2025-11-23 02:00:38.159
dd4f490f-4c1f-465e-95c3-05ea7b175841	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	60	Expedição de documento	2014-05-21 09:13:00	Outros documentos: tipo_de_documento	2025-11-23 02:00:38.159
2a276aa6-9133-4e8e-b83c-cfa9f5c36caf	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	85	Petição	2014-07-22 15:32:03	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.159
bc62df2b-c246-4801-886a-5c0e1440d774	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	11383	Ato ordinatório	2014-07-22 15:52:20	\N	2025-11-23 02:00:38.159
20ceecce-4478-458e-aca9-65d75b28bdf3	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	493	Entrega em carga/vista	2014-07-22 15:56:00	\N	2025-11-23 02:00:38.159
75e198ee-007b-4d68-ba79-cf4cb3c5259f	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	493	Entrega em carga/vista	2014-08-01 11:45:36	\N	2025-11-23 02:00:38.159
fb0237df-8df8-47fb-9b5d-a1de9465183a	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	132	Recebimento	2014-09-02 14:43:56	\N	2025-11-23 02:00:38.159
97f89fae-b423-44ea-b3e2-19e0e27927da	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	51	Conclusão	2014-09-04 15:31:30	para decisão: tipo_de_conclusao	2025-11-23 02:00:38.159
d7ef22a0-3934-4328-b1d5-75b15bbc14d3	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	898	Por decisão judicial	2014-09-17 17:54:13	\N	2025-11-23 02:00:38.159
f767486d-3243-4da5-a722-ce9e22499968	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	132	Recebimento	2014-09-18 12:38:51	\N	2025-11-23 02:00:38.159
c127552a-bc39-4f3f-a032-7fe66d427e7d	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	123	Remessa	2014-09-18 12:40:48	outros motivos: motivo_da_remessa	2025-11-23 02:00:38.159
827b1c92-7a89-43c6-8ba5-73f7b46da08e	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	898	Por decisão judicial	2014-09-18 12:39:00	\N	2025-11-23 02:00:38.159
6c7f0068-9162-41c5-b480-b2c85ed3e902	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	123	Remessa	2014-09-22 13:43:50	outros motivos: motivo_da_remessa	2025-11-23 02:00:38.159
f5f8c935-b5d4-4f99-be5f-a90c2efc4e1b	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	92	Publicação	2014-09-23 15:09:26	\N	2025-11-23 02:00:38.159
a604ae22-9369-4809-8ab9-879c43f82633	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	493	Entrega em carga/vista	2014-09-29 11:04:23	\N	2025-11-23 02:00:38.159
50fb5289-1e0e-4482-9cc6-d7e8b990f1eb	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	493	Entrega em carga/vista	2014-09-30 12:53:32	\N	2025-11-23 02:00:38.159
69427d68-979a-4738-8132-31fe02bbeec8	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	132	Recebimento	2014-11-04 10:09:12	\N	2025-11-23 02:00:38.159
a9ca1dbe-bd14-45d6-a5d5-556268908f89	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	11383	Ato ordinatório	2016-02-19 13:35:32	\N	2025-11-23 02:00:38.159
b2d32706-6c09-4e23-8656-44c729f37dfa	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	493	Entrega em carga/vista	2016-02-19 13:36:15	\N	2025-11-23 02:00:38.159
d854004c-7ccc-46af-bfdd-317ad3a1732b	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	493	Entrega em carga/vista	2016-03-07 17:14:42	\N	2025-11-23 02:00:38.159
353318b1-9898-4f3c-9a88-cb0401fa8081	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	132	Recebimento	2016-04-06 10:42:36	\N	2025-11-23 02:00:38.159
d5b18997-3564-4bf3-a6c3-77f26927ec73	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	11383	Ato ordinatório	2019-06-18 16:51:26	\N	2025-11-23 02:00:38.159
0e477b5d-5777-4d6e-ab92-5d38149bef07	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	123	Remessa	2019-06-18 16:53:59	outros motivos: motivo_da_remessa	2025-11-23 02:00:38.159
6fdda8af-5cab-4daf-a015-fa25af7791fb	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	123	Remessa	2019-07-11 14:34:52	outros motivos: motivo_da_remessa	2025-11-23 02:00:38.159
c1e9a2f2-8296-48f0-b5d3-203041470fa0	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	92	Publicação	2019-07-12 11:42:53	\N	2025-11-23 02:00:38.159
e9677b10-9d53-4e16-a908-4d9d7e8f995b	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	493	Entrega em carga/vista	2019-07-31 18:05:06	\N	2025-11-23 02:00:38.159
822208d7-f43e-41f9-9fe6-04a26adc44c8	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	132	Recebimento	2019-09-04 17:00:25	\N	2025-11-23 02:00:38.159
368b7fd5-bce4-4101-9d29-54e5c79ea745	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	51	Conclusão	2019-11-12 17:41:29	para decisão: tipo_de_conclusao	2025-11-23 02:00:38.159
a2ec6ded-a90f-49bc-9715-a6eb7930af34	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	12164	Outras Decisões	2019-12-02 10:21:41	\N	2025-11-23 02:00:38.159
f06ef706-32ae-4fbb-b215-14d0c02b980d	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	132	Recebimento	2019-12-02 17:17:22	\N	2025-11-23 02:00:38.159
d655129e-0e81-45bc-b2c6-97447b096125	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	123	Remessa	2019-12-03 17:14:56	outros motivos: motivo_da_remessa	2025-11-23 02:00:38.159
0a2a8bca-5504-45c9-bab8-275628d11c04	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	123	Remessa	2019-12-06 14:05:21	outros motivos: motivo_da_remessa	2025-11-23 02:00:38.159
3eaa7c26-e56f-46d9-8123-02b1e25808de	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	92	Publicação	2019-12-09 10:33:27	\N	2025-11-23 02:00:38.159
2b7151aa-ad31-4b63-b0f4-f2f28fa78e07	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	493	Entrega em carga/vista	2020-10-02 15:35:34	\N	2025-11-23 02:00:38.159
b56bd426-62de-4e3d-8038-7d087e6acf77	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	132	Recebimento	2020-12-04 16:45:28	\N	2025-11-23 02:00:38.159
4e3001e3-1713-4d9f-8d19-f0f4949bf9f2	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	60	Expedição de documento	2022-01-14 17:34:45	Certidão: tipo_de_documento	2025-11-23 02:00:38.159
b9254acb-d3e2-4ad4-8911-b7bc889fa25a	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	11383	Ato ordinatório	2022-01-14 19:02:32	\N	2025-11-23 02:00:38.159
c60d3d08-e1d0-439e-8265-f11ee965ea72	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	493	Entrega em carga/vista	2022-06-23 10:21:49	\N	2025-11-23 02:00:38.159
61cf59cc-ab67-42fd-8372-07a3c0d7e869	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	132	Recebimento	2022-08-29 10:30:58	\N	2025-11-23 02:00:38.159
5b8299fe-a290-4005-977a-b1656a9e81e9	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	11383	Ato ordinatório	2023-06-12 15:59:22	\N	2025-11-23 02:00:38.159
e56f02e9-0d25-4262-8c0c-c9212c97db9e	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	493	Entrega em carga/vista	2023-09-25 14:06:17	\N	2025-11-23 02:00:38.159
99daa8e0-3de3-4869-9be6-a2b3d4c069cd	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	132	Recebimento	2024-02-19 15:36:39	\N	2025-11-23 02:00:38.159
8623c4b0-6742-418b-93f2-1e7793478a6a	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	14732	Conversão de Autos Físicos em Eletrônicos	2024-02-19 16:28:09	\N	2025-11-23 02:00:38.159
53fb66ab-6e4c-4317-a7e9-50388bf6b471	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	85	Petição	2024-03-18 11:39:45	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.159
cdce1b84-f974-4c33-b215-cd99aa40b0ec	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	60	Expedição de documento	2024-04-03 11:05:09	Certidão: tipo_de_documento	2025-11-23 02:00:38.159
4787aa18-a07b-49e6-aee3-0c34e768097b	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	11383	Ato ordinatório	2024-04-03 11:09:23	\N	2025-11-23 02:00:38.159
acbeb1d1-4851-4844-b669-038cf711c590	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	123	Remessa	2024-04-03 12:03:53	outros motivos: motivo_da_remessa	2025-11-23 02:00:38.159
e901bee9-ef09-4345-a06e-03914a613e12	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	92	Publicação	2024-04-03 14:11:21	\N	2025-11-23 02:00:38.159
0860be70-cf0f-4d22-a505-8420e8dd7566	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	85	Petição	2024-04-11 19:56:08	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.159
387275b6-c1a3-46f4-9b6f-e8405f1ce1f1	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	85	Petição	2024-12-18 15:23:28	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.159
347c83cb-4eb3-428a-ae70-3829e07d29cd	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	85	Petição	2025-01-29 10:46:28	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.465
c27a4ae2-8021-4f1d-a257-52fbadfeed33	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	51	Conclusão	2025-01-29 10:49:26	para decisão: tipo_de_conclusao	2025-11-23 02:00:38.465
c0290f1e-e1bd-4a5a-8caa-feb4650a859e	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	51	Conclusão	2025-01-29 10:50:04	para decisão: tipo_de_conclusao	2025-11-23 02:00:38.465
62ecdc32-0ea6-4c81-95aa-6a97d30c6c01	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	26	Distribuição	2021-01-04 22:47:25	dependência: tipo_de_distribuicao_redistribuicao	2025-11-23 02:00:38.465
1e692d32-780d-4461-8a79-4d5fb13c8bfa	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	60	Expedição de documento	2021-01-08 10:34:03	Certidão: tipo_de_documento	2025-11-23 02:00:38.465
ae41b171-4dd6-42ac-9b09-11fbed2611df	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	51	Conclusão	2021-01-11 13:56:56	para despacho: tipo_de_conclusao	2025-11-23 02:00:38.465
6b2cb4f4-6f66-4584-b3c3-8578f534e7b3	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	12164	Outras Decisões	2021-01-11 16:18:56	\N	2025-11-23 02:00:38.465
ad42348d-a02b-476e-beeb-1e0ec052a609	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	60	Expedição de documento	2021-01-11 16:19:15	Certidão: tipo_de_documento	2025-11-23 02:00:38.465
4612e1f6-347f-471c-979e-eb8e9bd38658	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	60	Expedição de documento	2021-01-22 06:48:12	Certidão: tipo_de_documento	2025-11-23 02:00:38.465
10593da0-58c7-423e-979e-b8d2e781c3c8	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	123	Remessa	2021-02-04 11:16:33	outros motivos: motivo_da_remessa	2025-11-23 02:00:38.465
9ee1dd8f-f680-4a1b-ac98-6d30cbe8131b	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	92	Publicação	2021-02-05 07:30:40	\N	2025-11-23 02:00:38.465
8d9e9848-6166-4b5c-8ebb-7d9fe54aee0d	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	11383	Ato ordinatório	2021-02-19 23:08:31	\N	2025-11-23 02:00:38.465
b5d2ab6f-e546-4c61-b986-130564a92b16	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	581	Documento	2021-03-04 16:27:20	Outros documentos: tipo_de_documento	2025-11-23 02:00:38.465
d11f90ba-9a53-434d-8b1d-fc87d3b83978	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	11383	Ato ordinatório	2021-03-08 11:50:46	\N	2025-11-23 02:00:38.465
e7457e6b-a0c2-4478-82aa-97083c96d1ec	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	123	Remessa	2021-03-17 15:23:50	outros motivos: motivo_da_remessa	2025-11-23 02:00:38.465
26950332-1e2e-4ce0-b09d-9cf9cf3ee377	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	92	Publicação	2021-03-23 10:53:22	\N	2025-11-23 02:00:38.465
582583ee-0e8c-400c-927e-9cfab7cd0c63	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	11383	Ato ordinatório	2021-04-04 11:05:19	\N	2025-11-23 02:00:38.465
69e7c4b8-26da-4f00-89cf-a7aade74e886	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	85	Petição	2021-04-16 16:48:23	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.465
3074d050-88e6-435c-acfb-580fb2c2e748	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	11383	Ato ordinatório	2021-04-22 23:15:44	\N	2025-11-23 02:00:38.465
1a9cbe9a-5ee9-4628-9847-32860fe9e630	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	51	Conclusão	2021-07-06 12:18:12	para despacho: tipo_de_conclusao	2025-11-23 02:00:38.465
b75152a5-5d9e-41b6-aa4a-089e67158fe6	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	11010	Mero expediente	2021-07-06 13:33:52	\N	2025-11-23 02:00:38.465
f6261bd7-1744-4642-9a4c-fb9146e680ca	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	60	Expedição de documento	2021-07-06 13:34:10	Certidão: tipo_de_documento	2025-11-23 02:00:38.465
c3640a5c-7386-4085-934e-aecfa7436a03	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	60	Expedição de documento	2021-07-17 06:43:05	Certidão: tipo_de_documento	2025-11-23 02:00:38.465
d53df0af-7907-40a0-a692-3458a2369369	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	581	Documento	2021-07-17 21:25:22	Outros documentos: tipo_de_documento	2025-11-23 02:00:38.465
14d9681c-41ad-4ac4-96ef-bc550b35377b	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	123	Remessa	2022-04-19 13:58:30	outros motivos: motivo_da_remessa	2025-11-23 02:00:38.465
9cfa9ee3-8dd6-488c-a257-ff706b506246	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	92	Publicação	2022-04-20 05:07:12	\N	2025-11-23 02:00:38.465
d6f044e0-c3ce-4cd8-9f1d-9a77197b63cf	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	85	Petição	2022-04-27 21:45:25	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.465
2a63efb5-fcd5-491f-8e7a-b7cc7a1909a8	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	85	Petição	2022-04-29 16:28:25	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.465
6f2bbb5b-3d72-4649-8646-2b090371531f	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	60	Expedição de documento	2022-05-03 09:09:47	Certidão: tipo_de_documento	2025-11-23 02:00:38.465
8a8baf9e-1c15-4052-b2ec-1f148fc64dfe	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	51	Conclusão	2022-05-03 10:00:41	para despacho: tipo_de_conclusao	2025-11-23 02:00:38.465
26db7e51-a8a5-413f-b458-8357c9552332	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	221	Procedência em Parte	2022-06-30 16:00:04	\N	2025-11-23 02:00:38.465
d32db27e-66ee-44ad-ab9d-d581ff5c6ffb	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	60	Expedição de documento	2022-06-30 16:00:42	Certidão: tipo_de_documento	2025-11-23 02:00:38.465
19f5436d-c0e7-4ae8-9075-062e5cad0d1e	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	123	Remessa	2022-07-01 00:38:10	outros motivos: motivo_da_remessa	2025-11-23 02:00:38.465
c696b1e5-5f53-4def-979c-adc17282d7a0	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	92	Publicação	2022-07-04 04:12:13	\N	2025-11-23 02:00:38.465
e8f45651-5df9-436a-a2c5-403ade9573d1	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	85	Petição	2022-07-07 20:06:47	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.465
4de54669-2187-414f-a0e1-571628d67781	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	60	Expedição de documento	2022-07-11 07:23:08	Certidão: tipo_de_documento	2025-11-23 02:00:38.465
62fe9c8b-fef4-4cf7-88da-c0d915b58d2d	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	85	Petição	2022-07-12 10:15:37	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.465
9fd68ae0-2298-49d1-ac0b-2aee3c31390c	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	51	Conclusão	2022-11-21 11:18:41	para despacho: tipo_de_conclusao	2025-11-23 02:00:38.465
e6de7f63-9e39-4093-9482-5e7fea96c914	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	11010	Mero expediente	2022-11-21 11:47:31	\N	2025-11-23 02:00:38.465
9c5a6e3d-1fc5-4938-905b-25e406afc0fc	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	123	Remessa	2022-11-21 12:07:15	outros motivos: motivo_da_remessa	2025-11-23 02:00:38.465
8684ee0e-eb14-4bdf-a438-c0f629317f8c	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	123	Remessa	2022-11-21 13:08:27	outros motivos: motivo_da_remessa	2025-11-23 02:00:38.465
42783d35-30d6-414b-9645-8059d3be685a	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	36	Redistribuição	2022-11-21 15:09:02	dependência: tipo_de_distribuicao_redistribuicao	2025-11-23 02:00:38.465
45f85ce0-ea50-4f54-bf50-92398450e3c1	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	92	Publicação	2022-11-22 04:07:37	\N	2025-11-23 02:00:38.465
1363a7b8-fe47-46aa-ad5f-415bae4e620b	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	135	Apensamento	2022-11-27 20:58:00	\N	2025-11-23 02:00:38.465
846fe3f2-3d6d-4128-8781-1fa226cd5029	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	11383	Ato ordinatório	2022-11-30 14:33:32	\N	2025-11-23 02:00:38.465
1fad0282-ea53-43bf-8907-9b708d62a8f2	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	60	Expedição de documento	2022-11-30 14:34:05	Certidão: tipo_de_documento	2025-11-23 02:00:38.465
0de254ed-92a7-4202-ade7-a2d3942de155	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	123	Remessa	2022-12-01 00:37:51	outros motivos: motivo_da_remessa	2025-11-23 02:00:38.465
3e8b3351-b7fe-4f6e-bbd7-15cd82c56573	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	92	Publicação	2022-12-02 04:22:07	\N	2025-11-23 02:00:38.465
2420e185-eeb4-4eab-9e4d-918743f1bf3c	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	85	Petição	2022-12-05 10:35:41	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.465
1a5cc1ab-df54-4efa-ba31-29096fd074fe	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	60	Expedição de documento	2022-12-11 06:43:26	Certidão: tipo_de_documento	2025-11-23 02:00:38.465
c53eb21a-37ca-42aa-8075-6987f98f97e5	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	85	Petição	2022-12-12 19:25:11	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.465
4036aa48-dfd5-493b-9ebf-53607f8b5e60	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	85	Petição	2023-02-14 16:46:00	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.465
998396ec-88d5-4877-b8c0-75ee9626e970	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	60	Expedição de documento	2023-03-01 09:13:02	Certidão: tipo_de_documento	2025-11-23 02:00:38.465
9e9c0a5b-51b0-4084-96cc-bd3da0efc1d4	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	51	Conclusão	2023-03-01 09:51:38	para despacho: tipo_de_conclusao	2025-11-23 02:00:38.465
604cb298-ca47-4582-b06d-fb82e3a25fab	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	385	Com Resolução do Mérito	2023-03-03 12:05:40	\N	2025-11-23 02:00:38.465
dd21792a-246f-4e14-acc1-a8ec5e1fe793	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	60	Expedição de documento	2023-03-03 12:05:53	Certidão: tipo_de_documento	2025-11-23 02:00:38.465
b40d1282-7ca0-404c-91b2-0550a0f9cc97	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	123	Remessa	2023-03-03 12:06:24	outros motivos: motivo_da_remessa	2025-11-23 02:00:38.465
6863c20e-5d80-4c17-80be-0078cc2af838	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	92	Publicação	2023-03-06 04:20:26	\N	2025-11-23 02:00:38.465
d1a515ea-540f-4057-bd71-97c9bd8d7644	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	60	Expedição de documento	2023-03-14 06:42:01	Certidão: tipo_de_documento	2025-11-23 02:00:38.465
f85835d7-6f56-40c3-b0bc-634e8a24a8b4	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	85	Petição	2023-04-27 21:25:28	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.465
b9754f1f-cebc-4637-9461-91a0cbd3a05e	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	11383	Ato ordinatório	2024-05-14 10:13:09	\N	2025-11-23 02:00:38.465
23a6f516-2a4e-456f-916a-b8ff0561e4e3	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	123	Remessa	2024-05-14 10:41:08	outros motivos: motivo_da_remessa	2025-11-23 02:00:38.465
2b8bd75b-a63e-4023-9c3a-5b0fa286abd3	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	92	Publicação	2024-05-15 03:15:55	\N	2025-11-23 02:00:38.465
f9c898d4-5a33-465d-b787-bc093a2ef2b8	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	85	Petição	2024-06-10 21:05:21	Petição (outras): tipo_de_peticao	2025-11-23 02:00:38.465
67a9c4c3-a00f-4b69-8a0c-c410e10691d7	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	60	Expedição de documento	2024-10-23 15:10:30	Certidão: tipo_de_documento	2025-11-23 02:00:38.465
fcc5b975-270c-4272-94b5-5703ecd3fcd2	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	123	Remessa	2024-10-23 15:12:52	em grau de recurso: motivo_da_remessa	2025-11-23 02:00:38.465
\.


--
-- Data for Name: case_parts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.case_parts (id, "caseId", type, name, "cpfCnpj", phone, address, email, "civilStatus", profession, rg, "createdAt", "updatedAt", "birthDate") FROM stdin;
d4e68507-dcc5-4f5c-ba9c-237f9b901b47	66930a4f-e404-4419-97fa-bba0e07460a0	REU	Reginas Autobus								2025-11-16 04:49:25.107	2025-11-16 04:49:25.107	\N
7d89aa3f-8112-4dd4-bd23-243deac7f0f3	1efbd6c8-468b-4ede-a720-d3b8e10cc967	REU	reginas auto bus								2025-11-16 04:50:13.931	2025-11-16 12:59:30.542	\N
ef29c48f-1fef-444e-be51-854a66eeea42	1efbd6c8-468b-4ede-a720-d3b8e10cc967	AUTOR	mario araujo	076721667945	407768242						2025-11-16 04:52:43.221	2025-11-16 12:59:30.421	\N
46c37638-d467-4315-83aa-9a82afdd4d49	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	AUTOR	ANA LUIZA FONSECA GOMES	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:32.967	2025-11-22 17:17:32.967	\N
35dcc939-8c20-40fb-b9fd-c92be9392541	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	REU	LATAM AIRLINES BRASIL	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:32.969	2025-11-22 17:17:32.969	\N
505e3b3b-8a55-4980-8241-235a9592ea9a	fc7a3048-c5b5-4a37-89d1-590a416ef13a	AUTOR	WILLIAN LILIANE SANTANA HOLANDA	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:32.971	2025-11-22 17:17:32.971	\N
ada989c3-034b-45d9-88a1-410592deb9b1	fc7a3048-c5b5-4a37-89d1-590a416ef13a	REU	LATAM AIRLINES BRASIL	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:32.972	2025-11-22 17:17:32.972	\N
4f7859b5-bd22-4e6c-8b28-7de95bd8c736	5970c3f2-6fb6-4e10-aceb-5e6867e068a7	AUTOR	EDUARDO PEREIRA MARTINS	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:32.975	2025-11-22 17:17:32.975	\N
24df6d35-cc4d-4f07-8eff-972acec237ab	5970c3f2-6fb6-4e10-aceb-5e6867e068a7	REU	LATAM AIRLINES BRASIL	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:32.976	2025-11-22 17:17:32.976	\N
d775d9cf-b47c-4e3d-9dd8-cc86b98edde9	c17d3c11-806b-4978-8c0d-a777e2d84c9c	AUTOR	FAZENDA PÚBLICA DO ESTADO DE SÃO PAULO	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:32.986	2025-11-22 17:17:32.986	\N
7affdfef-af1d-4616-9597-4e06262ab810	c17d3c11-806b-4978-8c0d-a777e2d84c9c	REU	BT Latam Brasil Ltda.	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:32.987	2025-11-22 17:17:32.987	\N
3637d576-5e17-4407-89f5-71e375a92910	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	AUTOR	FAZENDA PÚBLICA DO ESTADO DE SÃO PAULO	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:32.989	2025-11-22 17:17:32.989	\N
eb2ba9d0-541c-4bfd-9844-a98b323f5b2b	8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	REU	BT Latam Brasil Ltda.	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:32.99	2025-11-22 17:17:32.99	\N
56d6b62b-bedc-4980-a0ba-17d08c0933c0	f84653cb-8d54-4f05-89c0-cf41d5b05840	AUTOR	FAZENDA PÚBLICA DO ESTADO DE SÃO PAULO	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:32.993	2025-11-22 17:17:32.993	\N
9fe8f542-2765-4fbd-b3c4-98fc13a715f1	f84653cb-8d54-4f05-89c0-cf41d5b05840	REU	Sencinet Latam Brasil Ltda	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:32.994	2025-11-22 17:17:32.994	\N
6aa44648-5458-430a-a797-93815e7ac37c	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	AUTOR	TAM LINHAS AEREAS S/A (LATAM AIRLINES BRASIL)	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:33	2025-11-22 17:17:33	\N
0a316313-13c4-474a-b4f3-75d33f8dbe15	a1a24dc4-0f93-470f-83a6-2f32d958f2a5	REU	FAZENDA PÚBLICA DO ESTADO DE SÃO PAULO	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:33.001	2025-11-22 17:17:33.001	\N
905e40f8-4072-4c4d-b329-550851f94f4a	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	AUTOR	TAM LINHAS AEREAS S/A (LATAM AIRLINES BRASIL)	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:33.004	2025-11-22 17:17:33.004	\N
3ff9b032-9909-41d4-9ad8-f686e2b8c85e	ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	REU	FAZENDA PÚBLICA DO ESTADO DE SÃO PAULO	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:33.005	2025-11-22 17:17:33.005	\N
cadbfe16-9776-42b2-8c9e-fdc34afffc55	e1528855-f03a-458b-8fd0-a7391f9627bb	REU	Medimix Latam Ltda - Epp	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:32.998	2025-11-22 18:32:47.362	\N
4cacabb0-46b2-4ad7-a92e-639d957fff4a	e1528855-f03a-458b-8fd0-a7391f9627bb	AUTOR	UNIÃO FEDERAL (FGTS)	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:32.997	2025-11-22 18:32:47.488	\N
fa01094f-4987-43d2-a289-45bebb7b6b46	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	REU	LATAM	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:32.95	2025-11-23 18:56:46.476	\N
11fc3cb6-6b96-4de4-8ea8-3eef5f20f790	889a572e-dc5e-4a96-b00f-3216e5fc1b3c	AUTOR	ANA LUISA VORONOFF DE MEDEIROS	\N	\N	\N	\N	\N	\N	\N	2025-11-22 17:17:32.948	2025-11-23 18:56:46.627	\N
fec13595-c23a-4fdf-a73f-67535b819a18	09e1409f-edad-4cbb-a4d2-b78242049a7c	AUTOR	Autor do Processo	123.456.789-00	(11) 91234-5678	Rua das Flores, 123	\N	\N	\N	\N	2025-11-01 23:16:39.125	2025-11-01 23:16:39.125	\N
2fcbc26d-5af6-4d77-991a-131f69da446e	09e1409f-edad-4cbb-a4d2-b78242049a7c	REU	Réu do Processo	987.654.321-00	(11) 98765-4321	Av. Paulista, 456	\N	\N	\N	\N	2025-11-01 23:16:39.126	2025-11-01 23:16:39.126	\N
9dbff3b4-3bad-40cb-8184-0e8120a471be	09e1409f-edad-4cbb-a4d2-b78242049a7c	REPRESENTANTE_LEGAL	Representante Legal	111.222.333-44	(11) 99999-8888	Rua do Advogado, 789	\N	\N	\N	\N	2025-11-01 23:16:39.127	2025-11-01 23:16:39.127	\N
97669651-76a0-492e-aff0-ad82a6c97480	9f187c55-4701-4601-a41d-0508c5485588	AUTOR	Autor do Processo	123.456.789-00	(11) 91234-5678	Rua das Flores, 123	\N	\N	\N	\N	2025-11-01 23:16:39.127	2025-11-01 23:16:39.127	\N
39dd6892-64d9-437e-b493-c494f2b5a6c4	9f187c55-4701-4601-a41d-0508c5485588	REU	Réu do Processo	987.654.321-00	(11) 98765-4321	Av. Paulista, 456	\N	\N	\N	\N	2025-11-01 23:16:39.128	2025-11-01 23:16:39.128	\N
d54e524f-dc71-4e19-bc6c-1be33d19ed46	9f187c55-4701-4601-a41d-0508c5485588	REPRESENTANTE_LEGAL	Representante Legal	111.222.333-44	(11) 99999-8888	Rua do Advogado, 789	\N	\N	\N	\N	2025-11-01 23:16:39.129	2025-11-01 23:16:39.129	\N
10aa1543-003b-4e27-9158-100fb3299615	23118458-39e9-4d59-999c-94adf5ed036b	AUTOR	Autor do Processo	123.456.789-00	(11) 91234-5678	Rua das Flores, 123	\N	\N	\N	\N	2025-11-01 23:16:39.13	2025-11-01 23:16:39.13	\N
41416a94-8569-4cf2-ac47-1929d51c7ead	23118458-39e9-4d59-999c-94adf5ed036b	REU	Réu do Processo	987.654.321-00	(11) 98765-4321	Av. Paulista, 456	\N	\N	\N	\N	2025-11-01 23:16:39.13	2025-11-01 23:16:39.13	\N
c4205142-688a-4faf-95ea-7b29c5f70d97	23118458-39e9-4d59-999c-94adf5ed036b	REPRESENTANTE_LEGAL	Representante Legal	111.222.333-44	(11) 99999-8888	Rua do Advogado, 789	\N	\N	\N	\N	2025-11-01 23:16:39.131	2025-11-01 23:16:39.131	\N
98c27d02-80f7-4eb4-a6dc-867c46d7abbe	36a877ae-0f07-4572-b82c-323e9735294a	AUTOR	Autor do Processo	123.456.789-00	(11) 91234-5678	Rua das Flores, 123	\N	\N	\N	\N	2025-11-01 23:16:39.132	2025-11-01 23:16:39.132	\N
ee2fc7b6-c040-44ba-a15d-2363e652c906	36a877ae-0f07-4572-b82c-323e9735294a	REU	Réu do Processo	987.654.321-00	(11) 98765-4321	Av. Paulista, 456	\N	\N	\N	\N	2025-11-01 23:16:39.133	2025-11-01 23:16:39.133	\N
5f39cc2e-6ca3-4713-a415-2e689dfabd67	2602745c-af26-441f-88e6-9e11972ba97e	AUTOR	Autor do Processo	123.456.789-00	(11) 91234-5678	Rua das Flores, 123	\N	\N	\N	\N	2025-11-01 23:16:39.134	2025-11-01 23:16:39.134	\N
16d88f16-ca43-4330-9cf4-29455f2d9f95	2602745c-af26-441f-88e6-9e11972ba97e	REU	Réu do Processo	987.654.321-00	(11) 98765-4321	Av. Paulista, 456	\N	\N	\N	\N	2025-11-01 23:16:39.135	2025-11-01 23:16:39.135	\N
e82a34e4-8a15-4e02-8b29-dea38e52d6e5	e9752652-2039-413f-ac1f-8842d10045ce	AUTOR	Autor do Processo	123.456.789-00	(11) 91234-5678	Rua das Flores, 123	\N	\N	\N	\N	2025-11-01 23:16:39.135	2025-11-01 23:16:39.135	\N
a190f556-67f4-4888-be95-d2308acb40cd	e9752652-2039-413f-ac1f-8842d10045ce	REU	Réu do Processo	987.654.321-00	(11) 98765-4321	Av. Paulista, 456	\N	\N	\N	\N	2025-11-01 23:16:39.136	2025-11-01 23:16:39.136	\N
c175eea2-d746-4265-9b61-396d898ed890	43e144f4-bc12-471f-8029-bf50e0b029c6	AUTOR	Autor do Processo	123.456.789-00	(11) 91234-5678	Rua das Flores, 123	\N	\N	\N	\N	2025-11-01 23:16:39.137	2025-11-01 23:16:39.137	\N
4f2d54a6-9538-42de-95b4-793ef45b3b32	43e144f4-bc12-471f-8029-bf50e0b029c6	REU	Réu do Processo	987.654.321-00	(11) 98765-4321	Av. Paulista, 456	\N	\N	\N	\N	2025-11-01 23:16:39.138	2025-11-01 23:16:39.138	\N
79fbc429-ecdc-4bec-b51a-5503b04b6ca3	dd3279ce-2053-4ff7-b269-53e9a757c73b	AUTOR	Autor do Processo	123.456.789-00	(11) 91234-5678	Rua das Flores, 123	\N	\N	\N	\N	2025-11-01 23:16:39.139	2025-11-01 23:16:39.139	\N
8ca1729e-a637-4f5f-a653-585370a7ea6a	dd3279ce-2053-4ff7-b269-53e9a757c73b	REU	Réu do Processo	987.654.321-00	(11) 98765-4321	Av. Paulista, 456	\N	\N	\N	\N	2025-11-01 23:16:39.14	2025-11-01 23:16:39.14	\N
eac6c4ac-2a16-4882-a44c-d93e138df9c2	dd3279ce-2053-4ff7-b269-53e9a757c73b	REPRESENTANTE_LEGAL	Representante Legal	111.222.333-44	(11) 99999-8888	Rua do Advogado, 789	\N	\N	\N	\N	2025-11-01 23:16:39.141	2025-11-01 23:16:39.141	\N
421da1f7-7336-435d-9fbb-9576e198d187	51b76c24-5faa-4943-849a-da72e62d0bdf	AUTOR	Autor do Processo	123.456.789-00	(11) 91234-5678	Rua das Flores, 123	\N	\N	\N	\N	2025-11-01 23:16:39.141	2025-11-01 23:16:39.141	\N
b527bffa-d9c4-4c66-b05f-430de42cd005	51b76c24-5faa-4943-849a-da72e62d0bdf	REU	Réu do Processo	987.654.321-00	(11) 98765-4321	Av. Paulista, 456	\N	\N	\N	\N	2025-11-01 23:16:39.142	2025-11-01 23:16:39.142	\N
bd8ab5f8-3391-4ca0-961d-4a74a4bf8ca0	c6294081-137a-4db6-912c-46c05608bbc9	AUTOR	Autor do Processo	123.456.789-00	(11) 91234-5678	Rua das Flores, 123	\N	\N	\N	\N	2025-11-01 23:16:39.143	2025-11-01 23:16:39.143	\N
f2e7e31a-d465-4cc9-8609-d305cc3e80fd	c6294081-137a-4db6-912c-46c05608bbc9	REU	Réu do Processo	987.654.321-00	(11) 98765-4321	Av. Paulista, 456	\N	\N	\N	\N	2025-11-01 23:16:39.144	2025-11-01 23:16:39.144	\N
3406fdd1-9ff1-4a59-a2aa-b8675bdd8351	c6294081-137a-4db6-912c-46c05608bbc9	REPRESENTANTE_LEGAL	Representante Legal	111.222.333-44	(11) 99999-8888	Rua do Advogado, 789	\N	\N	\N	\N	2025-11-01 23:16:39.145	2025-11-01 23:16:39.145	\N
5627303a-4673-421a-ae9c-7b8bc684aa5c	2a586c39-ad22-453c-8219-6e30ef36edc5	AUTOR	Carlos	076721667945	4077608242	12559 foynes ave	wr@gmail.com				2025-11-16 12:58:12.357	2025-11-16 12:58:12.357	\N
\.


--
-- Data for Name: cases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cases (id, "companyId", "clientId", "processNumber", court, subject, value, status, notes, "createdAt", "updatedAt", "lastSyncedAt", "ultimoAndamento", "informarCliente", "linkProcesso", "lastAcknowledgedAt", "aiSummary") FROM stdin;
3a72a2fd-2f3a-411b-a452-55b31a051ba6	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	b21b3785-4f43-4bd1-983e-af122e38044c	0001234-56.2024.5.03.0001	TRT - 3ª Região (MG)	Reclamação Trabalhista - Horas Extras e Adicional Noturno	50000	ACTIVE	Cliente busca reconhecimento de vínculo empregatício e pagamento de verbas rescisórias.	2025-11-22 19:57:50.608	2025-11-22 19:57:50.608	\N	\N	\N	https://pje.trt3.jus.br/primeirograu/Processo/ConsultaDocumento/listView.seam	\N	\N
09e1409f-edad-4cbb-a4d2-b78242049a7c	08572024-a309-49a2-b885-82276f1c5c09	c7b22cd0-db4e-47a3-a8f5-2c9a70e966b4	1000200-45.2024.8.26.0100	TJSP - 1ª Vara Cível	Ação de Cobrança	50000	ACTIVE	Processo de Ação de Cobrança em andamento.	2025-11-01 23:16:39.058	2025-11-01 23:16:39.058	\N	\N	\N	\N	\N	\N
9f187c55-4701-4601-a41d-0508c5485588	08572024-a309-49a2-b885-82276f1c5c09	1230a6cd-d7e8-4c5f-9134-e063f02f95c4	1000201-45.2024.8.26.0100	TRT 2ª Região - 5ª Vara do Trabalho	Reclamação Trabalhista	75000	ACTIVE	Processo de Reclamação Trabalhista em andamento.	2025-11-01 23:16:39.059	2025-11-01 23:16:39.059	\N	\N	\N	\N	\N	\N
23118458-39e9-4d59-999c-94adf5ed036b	08572024-a309-49a2-b885-82276f1c5c09	10671218-0d1a-4af7-8164-7ca058f7a80c	1000202-45.2024.8.26.0100	TJSP - 2ª Vara de Família	Divórcio Consensual	0	FINISHED	Processo de Divórcio Consensual em andamento.	2025-11-01 23:16:39.06	2025-11-01 23:16:39.06	\N	\N	\N	\N	\N	\N
36a877ae-0f07-4572-b82c-323e9735294a	08572024-a309-49a2-b885-82276f1c5c09	4bae363e-dc85-4867-99b2-72267f99fcb1	1000203-45.2024.8.26.0100	TJSP - 10ª Vara Criminal	Defesa Criminal	0	ACTIVE	Processo de Defesa Criminal em andamento.	2025-11-01 23:16:39.061	2025-11-01 23:16:39.061	\N	\N	\N	\N	\N	\N
2602745c-af26-441f-88e6-9e11972ba97e	08572024-a309-49a2-b885-82276f1c5c09	fcf2371f-7458-496f-863a-a4a983b482ea	1000204-45.2024.8.26.0100	TJSP - 3ª Vara Cível	Indenização por Danos Morais	30000	ACTIVE	Processo de Indenização por Danos Morais em andamento.	2025-11-01 23:16:39.062	2025-11-01 23:16:39.062	\N	\N	\N	\N	\N	\N
e9752652-2039-413f-ac1f-8842d10045ce	08572024-a309-49a2-b885-82276f1c5c09	989fbbc2-7296-4c3a-bc86-7a354b469873	1000205-45.2024.8.26.0100	TJSP - 1ª Vara Empresarial	Dissolução de Sociedade	500000	ACTIVE	Processo de Dissolução de Sociedade em andamento.	2025-11-01 23:16:39.063	2025-11-01 23:16:39.063	\N	\N	\N	\N	\N	\N
43e144f4-bc12-471f-8029-bf50e0b029c6	08572024-a309-49a2-b885-82276f1c5c09	18e8b834-480f-4751-a811-7343f71b4d30	1000206-45.2024.8.26.0100	TJSP - 4ª Vara Cível	Cobrança de Aluguel	15000	ARCHIVED	Processo de Cobrança de Aluguel em andamento.	2025-11-01 23:16:39.063	2025-11-01 23:16:39.063	\N	\N	\N	\N	\N	\N
dd3279ce-2053-4ff7-b269-53e9a757c73b	08572024-a309-49a2-b885-82276f1c5c09	00e7eb11-dde0-4e94-a188-62944da7f15f	1000207-45.2024.8.26.0100	TJSP - Juizado Especial Cível	Defeito em Produto	8000	ACTIVE	Processo de Defeito em Produto em andamento.	2025-11-01 23:16:39.064	2025-11-01 23:16:39.064	\N	\N	\N	\N	\N	\N
51b76c24-5faa-4943-849a-da72e62d0bdf	08572024-a309-49a2-b885-82276f1c5c09	73bf9e98-2a4c-4c19-95ce-96a16aca3178	1000208-45.2024.8.26.0100	TJSP - 5ª Vara Cível	Ação Possessória	120000	ACTIVE	Processo de Ação Possessória em andamento.	2025-11-01 23:16:39.065	2025-11-01 23:16:39.065	\N	\N	\N	\N	\N	\N
c6294081-137a-4db6-912c-46c05608bbc9	08572024-a309-49a2-b885-82276f1c5c09	2642faa5-b993-4b0a-9c0e-f46ad594d892	1000209-45.2024.8.26.0100	TJSP - 6ª Vara Cível	Revisão de Contrato	45000	ACTIVE	Processo de Revisão de Contrato em andamento.	2025-11-01 23:16:39.066	2025-11-01 23:16:39.066	\N	\N	\N	\N	\N	\N
fc7a3048-c5b5-4a37-89d1-590a416ef13a	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	96791773-a08b-4925-bf80-3f5830712bb3	0002080-13.2025.8.19.0209	TJRJ	WILLIAN LILIANE SANTANA HOLANDA vs LATAM AIRLINES BRASIL	0	ACTIVE	Regional da Barra da Tijuca - Cartório da Central de Mediação Pré-processual - Descrição: Arquivamento	2025-11-22 17:14:49.244	2025-11-23 02:00:13.355	2025-11-23 02:00:13.354	\N	\N	\N	\N	\N
5970c3f2-6fb6-4e10-aceb-5e6867e068a7	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	1dc78e1a-0c91-42d8-905f-8b87d8988b73	0002081-95.2025.8.19.0209	TJRJ	EDUARDO PEREIRA MARTINS vs LATAM AIRLINES BRASIL	0	ACTIVE	Regional da Barra da Tijuca - Cartório da Central de Mediação Pré-processual - Descrição: Arquivamento	2025-11-22 17:14:49.245	2025-11-23 02:00:13.506	2025-11-23 02:00:13.505	\N	\N	\N	\N	\N
d8a6685f-32c1-4fbc-80ff-92ed00a49a57	d719db14-5c49-4526-a851-6db07ed39f22	834d9931-1240-4041-8415-a9d6770de9bb	0008903-36.2022.8.19.0038	TJRJ	Indenização por Dano Moral	\N	ACTIVE		2025-11-03 20:03:57.223	2025-11-23 02:00:18.727	2025-11-23 02:00:18.726	Conclusão - 30/06/2025	Este é um teste de texto explicativo sobre o andamento do processo.\n\nO processo foi concluso ao juiz em 30/06/2025 para análise.\n\nAguardando decisão sobre o pedido de liminar.	https://www3.tjrj.jus.br/consultaprocessual/#/consultapublica?numProcessoCNJ=0008903-36.2022.8.19.0038	\N	\N
84437036-9f39-493e-9df8-b5d360d504fd	c3b2daac-22f6-4e50-be65-c509990b0ada	6a873850-b3ff-4ec8-8fa8-94db749600f3	00249252420208190206	TJRJ	Defeito, nulidade ou anulação	\N	ACTIVE		2025-11-03 00:22:47.475	2025-11-23 02:00:18.931	2025-11-23 02:00:18.93	Expedição de documento - 21/08/2025	Esse é o andamento. 		2025-11-07 01:17:31.765	\N
c8981037-b4ee-4611-9187-1564efec962c	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	bc4cc3f2-b79d-4333-a088-b7dde3faec92	1002345-67.2024.8.19.0001	TJRJ - Tribunal de Justiça do Rio de Janeiro	Ação de Cobrança - Contrato de Prestação de Serviços	120000	ACTIVE	Cobrança de valores inadimplidos referentes a contrato de consultoria.	2025-11-22 19:57:51.845	2025-11-22 19:57:51.845	\N	\N	\N	https://www3.tjrj.jus.br/ejud/	\N	\N
546b0ba2-718d-4c62-8598-47c9b06c9398	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	b224d7e9-4e27-4ade-9581-6f8c42680ded	5003456-78.2024.4.02.5101	TRF2 - Tribunal Regional Federal da 2ª Região	Mandado de Segurança - Suspensão de Exigibilidade de Crédito Tributário	350000	ACTIVE	Questionamento de lançamento de IRPJ e CSLL. Pedido liminar deferido.	2025-11-22 19:57:53.044	2025-11-22 19:57:53.044	\N	\N	Liminar concedida suspendendo a exigibilidade do crédito tributário até decisão final.	\N	\N	\N
ddb641d4-63cb-4949-82ea-b3a3e67bedd2	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	2d80b888-da2d-493f-a389-0a520a689c4a	0000733-94.2024.8.19.0203	TJRJ	ANA LUIZA FONSECA GOMES vs LATAM AIRLINES BRASIL	0	ACTIVE	Regional de Jacarepaguá - Cartório do Centro de Mediação Pré-processual - Descrição: Arquivamento	2025-11-22 17:14:49.242	2025-11-23 02:00:13.2	2025-11-23 02:00:13.199	\N	\N	\N	\N	\N
a8ef8835-722d-4dc4-939f-57cd30b08494	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	ef95c1b9-6b24-4eca-87b4-e2bdc8cfce4a	1234567-89.2025.8.19.0001	TJRJ	Ação de Cobrança Teste	\N	ACTIVE	\N	2025-11-15 02:26:59.48	2025-11-15 02:26:59.48	\N	\N	\N	\N	\N	\N
3b63208a-fd83-45c4-a123-39e21d2facc1	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	bfb035bd-75d5-40bb-a120-b5c85821b062	1234567-89.2024.8.19.0999	TJRJ	Ação Civil	10000	ACTIVE	Observações com 	2025-11-15 02:40:22.922	2025-11-15 02:40:22.922	\N	\N	\N	\N	\N	\N
eaf8ae33-5c14-4c64-b03f-98a391aa158d	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	fbf04c26-3e35-4fa8-a40d-7f71e455672d	0001234-57.2025.8.19.0001	TJRJ	Ação de Teste Editada	50000.5	ARCHIVED	Processo criado para teste de validação	2025-11-15 03:13:11.203	2025-11-15 03:13:11.752	\N	\N	Cliente informado sobre andamento do processo	\N	\N	\N
5f6ecc30-fd5f-469c-8733-cf47285241e2	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	425e5f95-6e7a-4085-9bf3-c000770de300	0001234-58.2025.8.19.0001	TJRJ	Processo Editado	50000.5	ARCHIVED	Processo para teste final	2025-11-15 03:14:17.377	2025-11-15 03:14:17.935	\N	\N	Processo em andamento	\N	\N	\N
b9d6a134-875c-46e6-a40c-0bf0e75390d8	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	21f69d90-cefb-4e3d-87c6-a7ef857d3d73	0000002-62.2024.8.19.0002	TJSP	Processo Teste 2	2000	ACTIVE	Processo de teste número 2	2025-11-15 03:41:06.557	2025-11-15 03:41:06.557	\N	\N	Informação para o cliente sobre processo 2	https://processo2.teste.com	\N	\N
aa01bad1-4220-4089-af3b-7b783d79a663	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	21f69d90-cefb-4e3d-87c6-a7ef857d3d73	0000003-66.2024.8.19.0003	TJSP	Processo Teste 3	3000	ACTIVE	Processo de teste número 3	2025-11-15 03:41:07.971	2025-11-15 03:41:07.971	\N	\N	Informação para o cliente sobre processo 3	https://processo3.teste.com	\N	\N
cd0ba72b-c4f8-4a71-8197-a83006da8b3f	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	21f69d90-cefb-4e3d-87c6-a7ef857d3d73	0000004-67.2024.8.19.0004	TJSP	Processo Teste 4	4000	ACTIVE	Processo de teste número 4	2025-11-15 03:41:10.448	2025-11-15 03:41:10.448	\N	\N	Informação para o cliente sobre processo 4	https://processo4.teste.com	\N	\N
5282502c-271c-4b10-9193-339bad98cf1b	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	21f69d90-cefb-4e3d-87c6-a7ef857d3d73	0000005-70.2024.8.19.0005	TJSP	Processo Teste 5	5000	ACTIVE	Processo de teste número 5	2025-11-15 03:41:12.307	2025-11-15 03:41:12.307	\N	\N	Informação para o cliente sobre processo 5	https://processo5.teste.com	\N	\N
997424a9-c2fb-4f70-afb4-a9d90156748b	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	21f69d90-cefb-4e3d-87c6-a7ef857d3d73	0000001-59.2024.8.19.0001	TJRJ	Processo Teste 1 EDITADO	5000	ACTIVE	Processo editado	2025-11-15 03:41:02.308	2025-11-15 03:41:12.35	\N	\N	Informação editada	https://processo1editado.teste.com	\N	\N
71f4b808-5dbc-4e36-8993-2247f4632069	c3b2daac-22f6-4e50-be65-c509990b0ada	10605280-52c4-48fa-8a1a-9d1233361bde	0001234-56.2024.8.19.0001	TJRJ	Processo Judicial 1	10000	ACTIVE	Processo em andamento	2025-11-15 04:00:57.127	2025-11-15 04:00:57.127	\N	\N	Cliente será informado sobre andamentos	https://processo1.tjrj.jus.br	\N	\N
656d4d6c-b400-4389-946f-0bb1009b56d8	c3b2daac-22f6-4e50-be65-c509990b0ada	e2352d70-c933-4124-b572-bee19e6c149a	0002234-56.2024.8.19.0002	TJSP	Processo Judicial 2	20000	ACTIVE	Processo em andamento	2025-11-15 04:00:57.127	2025-11-15 04:00:57.127	\N	\N	Cliente será informado sobre andamentos	https://processo2.tjrj.jus.br	\N	\N
4cf58ed1-81f7-496e-96e9-f4a0adf32586	0df8d66c-8e50-4ffd-b74f-37b658932f5a	8829c021-024e-4d4e-b536-7fa721a38a7f	0001001-11.2024.8.19.0001	TJRJ - 1ª Vara Cível	Ação de Indenização	50000	ACTIVE	Observações do processo 1	2025-11-16 02:35:20.805	2025-11-16 02:35:20.805	\N	\N	\N	\N	\N	\N
ba489fd7-6da9-46c0-9cb7-41c2607d1ac6	0df8d66c-8e50-4ffd-b74f-37b658932f5a	e65cf2c2-da9b-4e4c-b802-ec6452fb6b4f	0002002-22.2024.8.19.0002	TJRJ - 2ª Vara Cível	Ação Trabalhista	100000	ACTIVE	Observações do processo 2	2025-11-16 02:35:20.807	2025-11-16 02:35:20.807	\N	\N	\N	\N	\N	\N
d1bdb011-cb48-4fa7-a0d8-a624f2b052e4	0df8d66c-8e50-4ffd-b74f-37b658932f5a	8a4dbba6-58cc-455d-87ea-53748d612682	0003003-33.2024.8.19.0003	TJRJ - 3ª Vara Cível	Ação de Divórcio	150000	FINISHED	Observações do processo 3	2025-11-16 02:35:20.809	2025-11-16 02:35:20.809	\N	\N	\N	\N	\N	\N
d8f87aa3-835d-4b07-90e8-71c239c0f12d	c3b2daac-22f6-4e50-be65-c509990b0ada	364d9901-f3d2-4af2-8596-515f15af6e97	0003234-56.2024.8.19.0003	TJMG	Processo Judicial 3	30000	ACTIVE	Processo em andamento	2025-11-15 04:00:57.127	2025-11-16 04:48:54.895	\N	\N	Cliente será informado sobre andamentos as vezes	https://processo3.tjrj.jus.br	\N	\N
66930a4f-e404-4419-97fa-bba0e07460a0	c3b2daac-22f6-4e50-be65-c509990b0ada	fa51e798-5d91-4c64-8fda-92db33b0c53b	0004234-56.2024.8.19.0004	TJPR	Processo Judicial 4	40000	ACTIVE	Processo em andamento	2025-11-15 04:00:57.127	2025-11-16 04:49:24.983	\N	\N	Cliente será informado sobre andamentos	https://processo4.tjrj.jus.br	\N	\N
c17d3c11-806b-4978-8c0d-a777e2d84c9c	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	e633ac49-5b7a-495d-9118-ebc7498e6426	0016910-46.2013.8.26.0229	TJSP	Execução Fiscal - BT Latam Brasil Ltda.	0	ACTIVE	Assunto: Dívida Ativa - Foro 3 - Núcleo 4.0 Execuções Fiscais Estaduais - Recebido em: 18/12/2013	2025-11-22 17:14:49.252	2025-11-23 02:00:37.848	2025-11-23 02:00:37.848	Expedição de documento - 29/01/2025	No dia 29 de janeiro de 2025, foram expedidos documentos e houve uma decisão judicial. O processo está aguardando uma decisão importante. Fique atento, pois é importante acompanhar os próximos passos.	\N	\N	\N
2a586c39-ad22-453c-8219-6e30ef36edc5	c3b2daac-22f6-4e50-be65-c509990b0ada	32bd5bd6-1c47-48af-b01e-275713c859a5	0006234-56.2024.8.19.0006	TJRJ	Processo Judicial 6	60000	ACTIVE	Processo em andamento	2025-11-15 04:00:57.127	2025-11-16 12:58:12.231	\N	\N	Cliente será informado sobre andamentos	https://processo6.tjrj.jus.br	\N	\N
1efbd6c8-468b-4ede-a720-d3b8e10cc967	c3b2daac-22f6-4e50-be65-c509990b0ada	13384d9b-71a2-4bf3-b009-0e90a6edc830	0005234-56.2024.8.19.0005	TJRS	Processo Judicial 5	50000	ACTIVE	Processo em andamento	2025-11-15 04:00:57.127	2025-11-16 12:59:30.299	\N	\N	Cliente será informado sobre andamentos	https://processo5.tjrj.jus.br	\N	\N
712c42e9-aafa-46c4-89a5-2bc721fb73db	c3b2daac-22f6-4e50-be65-c509990b0ada	7a00f140-5593-43fc-b0aa-208d7ef875c5	8981801-11.2025.8.19.0001	TJRJ - Tribunal de Justiça do Rio de Janeiro	Teste de Integração com IA	50000	ACTIVE	Processo criado para testar funcionalidade de IA	2025-11-21 16:27:22.999	2025-11-21 16:27:22.999	\N	\N	\N	\N	\N	\N
a1a24dc4-0f93-470f-83a6-2f32d958f2a5	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	853e7d6b-f010-4002-90e2-98cd5281016b	1000101-09.2021.8.26.0576	TJSP	Embargos à Execução Fiscal - TAM LINHAS AEREAS S/A (LATAM AIRLINES BRASIL)	0	ACTIVE	Assunto: Inexequibilidade do Título / Inexigibilidade da Obrigação - Unidade 13 - Núcleo 4.0 Execuções Fiscais Estaduais - Recebido em: 04/01/2021	2025-11-22 17:14:49.25	2025-11-23 16:13:04.445	2025-11-23 16:13:02.146	Remessa - 03/12/2024	No dia 3 de dezembro de 2024, houve a remessa do processo para grau de recurso e a expedição de uma certidão. Os andamentos anteriores incluem petições e expedições de documentos entre outubro e novembro. É importante que a TAM Linhas Aéreas esteja atenta a qualquer comunicação do tribunal sobre prazos ou novas decisões.	\N	\N	\N
e1528855-f03a-458b-8fd0-a7391f9627bb	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	b2c53479-861a-45b5-828e-e538897fc355	3001454-27.2013.8.26.0642	TJSP	Execução Fiscal - Medimix Latam Ltda - Epp	0	ACTIVE	Assunto: FGTS/Fundo de Garantia Por Tempo de Serviço - Foro 6 - Núcleo 4.0 Execuções Fiscais Estaduais - Recebido em: 04/12/2013	2025-11-22 17:14:49.255	2025-11-23 02:00:39.139	2025-11-23 02:00:39.138	Petição - 29/10/2019	O processo de execução fiscal da Medimix Latam Ltda está em andamento. O último movimento foi uma petição enviada em 29/10/2019. Não há prazos ou ações necessárias do cliente no momento. Fique atento a novas atualizações.		\N	\N
889a572e-dc5e-4a96-b00f-3216e5fc1b3c	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	7c8a6160-9640-4cbf-9ed2-8f3085e497f4	0112772-58.2024.8.19.0001	TJRJ	ANA LUISA VORONOFF DE MEDEIROS vs LATAM	0	ACTIVE	Comarca da Capital - Cartório da 24ª Vara Cível - Descrição: Remessa	2025-11-22 17:14:49.235	2025-11-23 18:56:46.318	2025-11-23 16:37:01.646	Petição - 29/08/2025	Seu processo contra a LATAM está avançando. No dia 29/08/2025, uma nova petição foi protocolada. A última decisão foi favorável a você, confirmando a procedência do seu pedido em 04/08/2025. Fique atenta a possíveis novas orientações ou prazos que possam surgir.	https://www3.tjrj.jus.br/consultaprocessual/#/consultapublica?numProcessoCNJ=0112772-58.2024.8.19.0001	\N	\N
f8060e65-fbef-4d29-abad-63a51cf10c70	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	998468ed-ec3d-449e-9630-bff8e36cc25f	8004567-89.2024.8.13.0024	TJMG - Tribunal de Justiça de Minas Gerais	Ação de Reparação de Danos Morais e Materiais - Relação de Consumo	25000	ACTIVE	Produto defeituoso não substituído pelo fornecedor. Pedido de danos morais e materiais.	2025-11-22 19:57:54.241	2025-11-22 19:57:54.241	\N	\N	Processo em fase inicial. Audiência de conciliação designada para próximo mês.	https://pje.tjmg.jus.br/	\N	\N
8e9ac233-fcb4-4f75-8a9e-f96aa9782f39	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	e633ac49-5b7a-495d-9118-ebc7498e6426	0016909-61.2013.8.26.0229	TJSP	Execução Fiscal - BT Latam Brasil Ltda.	0	ACTIVE	Assunto: Dívida Ativa - Foro 3 - Núcleo 4.0 Execuções Fiscais Estaduais - Recebido em: 18/12/2013	2025-11-22 17:14:49.253	2025-11-23 02:00:38.163	2025-11-23 02:00:38.162	Petição - 18/12/2024	Seu processo de execução fiscal está em andamento. Recentemente, houve a conversão dos autos de físicos para eletrônicos e a expedição de uma certidão. Não há prazos ou audiências marcadas no momento. Fique atento para possíveis próximas etapas.	\N	\N	\N
ffc2d488-df6a-4dfb-9ed4-f0b2ec0e93b1	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	853e7d6b-f010-4002-90e2-98cd5281016b	1000102-91.2021.8.26.0576	TJSP	Embargos à Execução Fiscal - TAM LINHAS AEREAS S/A (LATAM AIRLINES BRASIL)	0	ACTIVE	Assunto: Inexequibilidade do Título / Inexigibilidade da Obrigação - Unidade 13 - Núcleo 4.0 Execuções Fiscais Estaduais - Recebido em: 04/01/2021	2025-11-22 17:14:49.251	2025-11-23 02:00:38.469	2025-11-23 02:00:38.468	Conclusão - 29/01/2025	Seu processo está atualmente aguardando uma decisão, com conclusão marcada para 29 de janeiro de 2025. Além disso, houve uma remessa em grau de recurso no dia 23 de outubro de 2024. Não há ações necessárias de sua parte no momento.	\N	\N	\N
f84653cb-8d54-4f05-89c0-cf41d5b05840	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	e633ac49-5b7a-495d-9118-ebc7498e6426	1503044-42.2023.8.26.0229	TJSP	Execução Fiscal - Sencinet Latam Brasil Ltda	0	ACTIVE	Assunto: ICMS/ Imposto sobre Circulação de Mercadorias - Foro 3 - Núcleo 4.0 Execuções Fiscais Estaduais - Recebido em: 11/09/2023	2025-11-22 17:14:49.254	2025-11-23 02:00:38.827	2025-11-23 02:00:38.827	Petição - 18/06/2025	O processo está em andamento e os últimos atos incluem a publicação de informações no dia 24/10/2023 e a expedição de certidões. Não há prazos ou ações necessárias por parte do cliente no momento. O acompanhamento continuará para verificar novos desenvolvimentos.	\N	\N	\N
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (id, "companyId", name, cpf, rg, email, phone, address, city, state, "zipCode", notes, active, "createdAt", "updatedAt", "birthDate", "maritalStatus", profession, tag, "personType", "representativeName", "representativeCpf") FROM stdin;
86895787-ccd9-4364-8c52-8be2c1027b0d	c3b2daac-22f6-4e50-be65-c509990b0ada	Cesinha da Silva	99999999999	123456789	\N	\N	\N	\N	\N	\N	\N	t	2025-11-03 01:01:11.355	2025-11-03 01:01:11.355	1980-01-01 00:00:00	\N	\N	\N	FISICA	\N	\N
61f1353c-29cd-4635-ac55-837aab3b8ecc	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	João Silva Atualizado	12345678901	\N	joao@teste.com	(11) 98765-4321	\N	\N	\N	\N	\N	t	2025-11-15 02:22:22.659	2025-11-15 02:22:22.819	\N	\N	\N	\N	FISICA	\N	\N
bfb035bd-75d5-40bb-a120-b5c85821b062	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Cliente Atualizado	12345678900	\N	xss@test.com	\N	Rua Teste	\N	\N	\N	Nota importanteformatada	t	2025-11-15 02:40:20.325	2025-11-15 02:40:23.027	\N	\N	Engenheiro	\N	FISICA	\N	\N
70b2b2e6-cc09-45d9-be25-a81245a383a4	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	João Silva Atualizado	12345678901	\N	joao@teste.com	(11) 98765-4321	\N	\N	\N	\N	\N	t	2025-11-15 02:40:31.04	2025-11-15 02:40:31.192	\N	\N	\N	\N	FISICA	\N	\N
47090daf-bdae-4ac1-98c9-50921a98e63d	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Cliente Para Deletar	99999999999	\N	deletar@teste.com	(11) 99999-9999	\N	\N	\N	\N	\N	f	2025-11-15 03:44:05.224	2025-11-15 03:44:05.265	\N	\N	\N	\N	FISICA	\N	\N
7a00f140-5593-43fc-b0aa-208d7ef875c5	c3b2daac-22f6-4e50-be65-c509990b0ada	Cliente Teste AI 1763742440675	\N	\N	teste.ai.1763742440675@example.com	11999998888	Rua Teste, 123	\N	\N	\N	\N	t	2025-11-21 16:27:20.686	2025-11-21 16:27:20.686	\N	\N	\N	\N	FISICA	\N	\N
dc967571-b132-4d1e-9e7b-fc7de7f3fdc2	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	João Silva Santos	12345678901	\N	joao.silva@email.com	21987654321	\N	\N	\N	\N	\N	t	2025-11-21 18:37:35.501	2025-11-21 18:37:35.501	\N	\N	\N	\N	FISICA	\N	\N
5bf2d041-9efe-4dfd-9a53-71b5b749827e	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Maria Oliveira Costa	98765432109	\N	maria.oliveira@email.com	21987654322	\N	\N	\N	\N	\N	t	2025-11-21 18:37:35.512	2025-11-21 18:37:35.512	\N	\N	\N	\N	FISICA	\N	\N
2fae4996-3c72-4169-902a-83f4ba173a96	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Pedro Souza Lima	45678912345	\N	pedro.souza@email.com	21987654323	\N	\N	\N	\N	\N	t	2025-11-21 18:37:35.521	2025-11-21 18:37:35.521	\N	\N	\N	\N	FISICA	\N	\N
959d1015-35d5-4774-b7fd-c8a16b093a9a	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Ana Paula Ferreira	78912345678	\N	ana.ferreira@email.com	21987654324	\N	\N	\N	\N	\N	t	2025-11-21 18:37:35.531	2025-11-21 18:37:35.531	\N	\N	\N	\N	FISICA	\N	\N
1a45c6f3-42a6-45c2-ae16-391f4bc1b641	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Carlos Alberto Mendes	32165498712	\N	carlos.mendes@email.com	21987654325	\N	\N	\N	\N	\N	t	2025-11-21 18:37:35.54	2025-11-21 18:37:35.54	\N	\N	\N	\N	FISICA	\N	\N
a75c0c93-8259-47f3-a7bf-9a3331fde015	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	leu leu	07672166794									t	2025-11-22 19:00:58.73	2025-11-22 19:00:58.73	\N				FISICA	\N	\N
6a873850-b3ff-4ec8-8fa8-94db749600f3	c3b2daac-22f6-4e50-be65-c509990b0ada	Cliente Teste AdvWell	12345678900		cliente@teste.com	11988887777						t	2025-11-02 23:03:51.567	2025-11-02 23:23:48.312	1979-07-09 00:00:00	Casado(a)		\N	FISICA	\N	\N
834d9931-1240-4041-8415-a9d6770de9bb	d719db14-5c49-4526-a851-6db07ed39f22	Wellington	07672166794									t	2025-11-03 19:57:17.9	2025-11-03 19:57:17.9	\N			\N	FISICA	\N	\N
ef95c1b9-6b24-4eca-87b4-e2bdc8cfce4a	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	João Silva Atualizado	12345678901	\N	joao@teste.com	(11) 98765-4321	\N	\N	\N	\N	\N	t	2025-11-15 02:26:55.962	2025-11-15 02:26:56.164	\N	\N	\N	\N	FISICA	\N	\N
5b5c49d7-d469-48e6-9478-a60e1db01cb0	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Cliente Teste Completo	12345678901	\N	cliente.teste@example.com	(21) 98765-4321	Rua Teste, 123 - Bairro Teste - Cidade/UF - 12345-678	\N	\N	\N	Cliente criado para teste de validação	t	2025-11-15 03:12:06.165	2025-11-15 03:12:06.165	1990-01-15 00:00:00	\N	\N	\N	FISICA	\N	\N
fbf04c26-3e35-4fa8-a40d-7f71e455672d	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Cliente Teste Editado	12345678902	\N	cliente.teste2@example.com	(21) 99999-9999	Rua Teste, 123 - Bairro Teste - Cidade/UF - 12345-678	\N	\N	\N	Cliente criado para teste de validação	t	2025-11-15 03:13:07.199	2025-11-15 03:13:11.719	\N	\N	\N	\N	FISICA	\N	\N
fa51e798-5d91-4c64-8fda-92db33b0c53b	c3b2daac-22f6-4e50-be65-c509990b0ada	Ana Paula Oliveira	12345678901	\N	ana.oliveira@email.com	(11) 98765-1111	Rua das Flores, 123	São Paulo	SP	01000-000	Cliente VIP	t	2025-11-15 04:00:41.829	2025-11-15 04:00:41.829	1985-03-15 00:00:00	Casada	Advogada	\N	FISICA	\N	\N
13384d9b-71a2-4bf3-b009-0e90a6edc830	c3b2daac-22f6-4e50-be65-c509990b0ada	Carlos Eduardo Santos	23456789012	\N	carlos.santos@email.com	(11) 98765-2222	Av. Paulista, 456	São Paulo	SP	01310-100	Cliente desde 2020	t	2025-11-15 04:00:41.829	2025-11-15 04:00:41.829	1978-07-22 00:00:00	Solteiro	Empresário	\N	FISICA	\N	\N
32bd5bd6-1c47-48af-b01e-275713c859a5	c3b2daac-22f6-4e50-be65-c509990b0ada	Beatriz Silva Costa	34567890123	\N	beatriz.costa@email.com	(21) 98765-3333	Rua Copacabana, 789	Rio de Janeiro	RJ	22070-010	Novo cliente	t	2025-11-15 04:00:41.829	2025-11-15 04:00:41.829	1990-11-08 00:00:00	Divorciada	Médica	\N	FISICA	\N	\N
c3bc0f86-0fa3-49a1-ac1c-d630aa6643cc	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	João Silva Teste	\N	\N	joao.silva@teste.com	(21) 98765-4321	Rua das Flores, 123 - Centro - Rio de Janeiro/RJ	\N	\N	\N	\N	t	2025-11-21 16:43:25.453	2025-11-21 16:43:25.453	\N	\N	\N	\N	FISICA	\N	\N
78c2c57b-342a-431c-bf2b-76d7d8ab3c8f	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Maria Santos Teste	\N	\N	maria.santos@teste.com	(21) 98765-4322	Av. Brasil, 456 - Copacabana - Rio de Janeiro/RJ	\N	\N	\N	\N	t	2025-11-21 16:43:25.462	2025-11-21 16:43:25.462	\N	\N	\N	\N	FISICA	\N	\N
10605280-52c4-48fa-8a1a-9d1233361bde	c3b2daac-22f6-4e50-be65-c509990b0ada	Fernando Gomes Pereira	67890123456		fernando.pereira@email.com	(51) 98765-6666	Rua da Praia, 890	Porto Alegre	RS	90010-280	Cliente regular	t	2025-11-15 04:00:41.829	2025-11-16 01:03:43.108	1988-12-25 00:00:00	Casado	Comerciante	vip	FISICA	\N	\N
e2352d70-c933-4124-b572-bee19e6c149a	c3b2daac-22f6-4e50-be65-c509990b0ada	Daniel Ferreira Lima	45678901234		daniel.lima@email.com	(31) 98765-4444	Rua Afonso Pena, 234	Belo Horizonte	MG	30130-001	Cliente corporativo	t	2025-11-15 04:00:41.829	2025-11-16 01:03:51.53	1982-05-30 00:00:00	Casado	Engenheiro	teste	FISICA	\N	\N
364d9901-f3d2-4af2-8596-515f15af6e97	c3b2daac-22f6-4e50-be65-c509990b0ada	Elaine Rodrigues Alves	56789012345		elaine.alves@email.com	(41) 98765-5555	Av. Cândido de Abreu, 567	Curitiba	PR	80530-000	Indicação de cliente	t	2025-11-15 04:00:41.829	2025-11-16 01:04:02.695	1995-09-12 00:00:00	Solteira	Professora	novidade	FISICA	\N	\N
a783b90e-f218-4991-8cf2-36faffded391	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Empresa XYZ Ltda Teste	\N	\N	contato@empresaxyz.com	(21) 3333-4444	Rua Comercial, 789 - Centro - Rio de Janeiro/RJ	\N	\N	\N	\N	t	2025-11-21 16:43:25.472	2025-11-21 16:43:25.472	\N	\N	\N	\N	FISICA	\N	\N
2d80b888-da2d-493f-a389-0a520a689c4a	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	ANA LUIZA FONSECA GOMES	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	2025-11-22 17:33:42.129	2025-11-22 17:33:42.129	\N	\N	\N	\N	FISICA	\N	\N
96791773-a08b-4925-bf80-3f5830712bb3	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	WILLIAN LILIANE SANTANA HOLANDA	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	2025-11-22 17:33:42.134	2025-11-22 17:33:42.134	\N	\N	\N	\N	FISICA	\N	\N
1dc78e1a-0c91-42d8-905f-8b87d8988b73	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	EDUARDO PEREIRA MARTINS	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	2025-11-22 17:33:42.139	2025-11-22 17:33:42.139	\N	\N	\N	\N	FISICA	\N	\N
853e7d6b-f010-4002-90e2-98cd5281016b	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	TAM LINHAS AEREAS S/A (LATAM AIRLINES BRASIL)	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	2025-11-22 17:33:42.154	2025-11-22 17:33:42.154	\N	\N	\N	\N	FISICA	\N	\N
7c8a6160-9640-4cbf-9ed2-8f3085e497f4	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	ANA LUISA VORONOFF DE MEDEIROS	07672166794									t	2025-11-22 17:33:42.15	2025-11-22 18:45:11.701	\N				FISICA	\N	\N
e633ac49-5b7a-495d-9118-ebc7498e6426	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	FAZENDA PÚBLICA DO ESTADO DE SÃO PAULO		12345679								t	2025-11-22 17:33:42.143	2025-11-22 18:45:46.743	\N				FISICA	\N	\N
b2c53479-861a-45b5-828e-e538897fc355	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	UNIÃO FEDERAL (FGTS)	07672166794									t	2025-11-22 17:33:42.161	2025-11-22 18:46:39.069	\N				FISICA	\N	\N
fd863926-e5f2-42c4-ae51-10dc6ed3c5ae	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	João da Silva Santos	123.456.789-00	MG-12.345.678	joao.silva@email.com	(31) 99999-8888	Rua das Flores, 123, Apto 45	Belo Horizonte	MG	30130-100	Cliente desde 2020. Contrato de consultoria ativo.	t	2025-11-22 19:06:24.231	2025-11-22 19:06:24.231	1985-03-15 00:00:00	Casado	Engenheiro Civil	VIP	FISICA	\N	\N
23aaa907-6c3a-4521-8fba-e52a087a9157	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	João da Silva Santos	123.456.789-00	MG-12.345.678	joao.silva@email.com	(31) 99999-8888	Rua das Flores, 123, Apto 45	Belo Horizonte	MG	30130-100	Cliente desde 2020. Contrato de consultoria ativo.	t	2025-11-22 19:06:37.215	2025-11-22 19:06:37.215	1985-03-15 00:00:00	Casado	Engenheiro Civil	VIP	FISICA	\N	\N
65182dc0-49e8-4fce-9534-fe3db396189c	d719db14-5c49-4526-a851-6db07ed39f22	teste										f	2025-11-04 03:09:37.531	2025-11-04 03:09:42.959	\N			\N	FISICA	\N	\N
425e5f95-6e7a-4085-9bf3-c000770de300	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Cliente Editado	12345678903	\N	cliente.final@example.com	(21) 99999-8888	Rua Teste Final, 123	\N	\N	\N	Cliente para teste final	t	2025-11-15 03:14:12.295	2025-11-15 03:14:17.902	\N	\N	\N	\N	FISICA	\N	\N
8829c021-024e-4d4e-b536-7fa721a38a7f	0df8d66c-8e50-4ffd-b74f-37b658932f5a	Cliente Teste 1	00000000001	\N	cliente1@example.com	(21) 99991-0001	Rua Cliente 1, 100	\N	\N	\N	\N	t	2025-11-16 02:35:20.799	2025-11-16 02:35:20.799	1981-01-01 00:00:00	Casado	Engenheiro	\N	FISICA	\N	\N
e65cf2c2-da9b-4e4c-b802-ec6452fb6b4f	0df8d66c-8e50-4ffd-b74f-37b658932f5a	Cliente Teste 2	00000000002	\N	cliente2@example.com	(21) 99992-0002	Rua Cliente 2, 200	\N	\N	\N	\N	t	2025-11-16 02:35:20.801	2025-11-16 02:35:20.801	1982-02-02 00:00:00	Solteiro	Professor	\N	FISICA	\N	\N
8a4dbba6-58cc-455d-87ea-53748d612682	0df8d66c-8e50-4ffd-b74f-37b658932f5a	Cliente Teste 3	00000000003	\N	cliente3@example.com	(21) 99993-0003	Rua Cliente 3, 300	\N	\N	\N	\N	t	2025-11-16 02:35:20.803	2025-11-16 02:35:20.803	1983-03-03 00:00:00	Divorciado	Médico	\N	FISICA	\N	\N
73c4f6ac-b5c8-4b01-b265-57be37495130	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Teste Simples	\N	\N	teste@teste.com	\N	\N	\N	\N	\N	\N	t	2025-11-21 17:09:19.085	2025-11-21 17:09:19.085	\N	\N	\N	\N	FISICA	\N	\N
c8d834e4-fc7d-427b-a35f-3412b17b1eb3	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	João da Silva	\N	\N	joao@example.com	21987654321	Rua Teste, 123	\N	\N	\N	\N	t	2025-11-21 17:09:19.095	2025-11-21 17:09:19.095	\N	\N	\N	\N	FISICA	\N	\N
56550ff4-46fe-4472-af75-feef4ef638c9	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	José Carlos da Silva Júnior	\N	\N	jose.junior@example.com	(21) 98765-4321	Rua João Paulo II, 123 - Apt 45	\N	\N	\N	\N	t	2025-11-21 17:09:19.103	2025-11-21 17:09:19.103	\N	\N	\N	\N	FISICA	\N	\N
1dadcc83-b253-424d-b1e9-83cc8440847e	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Tech Solutions Ltda	12.345.678/0001-90	\N	contato@techsolutions.com.br	(11) 3333-4444	Av. Paulista, 1000, Sala 501	São Paulo	SP	01310-100	Empresa de tecnologia. Contrato anual de assessoria jurídica empresarial.	t	2025-11-22 19:08:58.674	2025-11-22 19:08:58.674	\N	\N	\N	Corporativo	JURIDICA	\N	\N
feb9328a-5f6a-4254-b131-184d4e106206	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Maria Oliveira Costa	987.654.321-00	SP-98.765.432	maria.costa@email.com	(11) 98765-4321	Av. Brasil, 456, Casa 2	São Paulo	SP	01000-000	Especialista em cardiologia. Cliente referenciado.	t	2025-11-22 19:09:20.401	2025-11-22 19:09:20.401	1990-07-22 00:00:00	Solteira	Médica	Prioritário	FISICA	\N	\N
ca62cf24-0842-4691-8810-97899b88b564	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Construtora ABC S.A.	98.765.432/0001-23	\N	juridico@construtorabc.com.br	(21) 2222-3333	Rua Construção, 789, Sala 1001	Rio de Janeiro	RJ	20000-000	Construtora especializada em obras comerciais. Contrato de assessoria jurídica permanente.	t	2025-11-22 19:09:20.443	2025-11-22 19:09:20.443	\N	\N	\N	Corporativo	JURIDICA	\N	\N
885198a9-f20a-46aa-8e28-f53fa92cb74c	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Carlos Eduardo Pereira	456.789.123-45	RJ-45.678.912	carlos.pereira@email.com	(21) 99876-5432	Rua das Palmeiras, 321, Apto 102	Rio de Janeiro	RJ	22000-000	Proprietário de rede de restaurantes.	t	2025-11-22 19:09:20.476	2025-11-22 19:09:20.476	1978-11-05 00:00:00	Divorciado	Empresário	VIP	FISICA	\N	\N
b28c72ad-0458-44d0-a9fc-a774e40c5418	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Farmácia Saúde Total ME	11.222.333/0001-44	\N	contato@farmaciasaudetotal.com.br	(31) 3344-5566	Av. Saúde, 100, Loja 5	Belo Horizonte	MG	30100-000	Rede de farmácias com 3 unidades. Consultoria trabalhista e regulatória.	t	2025-11-22 19:09:20.517	2025-11-22 19:09:20.517	\N	\N	\N	Regular	JURIDICA	\N	\N
f61a7aec-4ede-41f1-9625-8568284a5358	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	lel leu	02924982000133									t	2025-11-22 19:12:26.704	2025-11-22 19:12:26.704	\N				JURIDICA	\N	\N
11c6f613-4d1f-499d-9c0c-14ad9dc2af5f	9cbae4e7-10b4-4df8-85e8-9b6973e21d02	teste										t	2025-11-04 21:14:32.801	2025-11-04 21:14:32.801	\N			\N	FISICA	\N	\N
8b9f8adb-f73f-4fb5-9276-18960a0a6f07	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Teste Cliente Simples	\N	\N	teste@example.com	\N	\N	\N	\N	\N	\N	t	2025-11-15 03:18:29.199	2025-11-15 03:18:29.199	\N	\N	\N	\N	FISICA	\N	\N
2ffa6979-0656-4745-9764-9cd74d99acd1	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Teste Cliente Completo	12345678900	\N	teste2@example.com	(21) 99999-9999	Rua Teste, 123	\N	\N	\N	Teste	t	2025-11-15 03:18:29.288	2025-11-15 03:18:29.288	1990-01-01 00:00:00	\N	\N	\N	FISICA	\N	\N
010f3ad1-b455-4be0-9b43-b55e3e197df0	4eef674f-b389-4757-bc9e-e950092eec89	Cliente Teste Atualizado	12345678901	\N	cliente.teste@advwell.pro	(21) 98765-4321	Rua Teste, 456	\N	\N	\N	Cliente criado em teste completo	t	2025-11-16 04:19:06.533	2025-11-16 04:19:06.657	\N	\N	\N	\N	FISICA	\N	\N
627c80c3-b959-409b-9718-cc3cfd85ad83	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Teste 2	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	2025-11-21 17:19:13.62	2025-11-21 17:19:13.62	\N	\N	\N	\N	FISICA	\N	\N
998468ed-ec3d-449e-9630-bff8e36cc25f	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Ana Carolina Mendes Silva	111.222.333-44	MG-11.222.333	ana.mendes@email.com	(31) 98888-7777	Rua das Acácias, 234, Apto 501	Belo Horizonte	MG	30140-100	Cliente VIP. Atendimento preferencial. Contrato de consultoria imobiliária.	t	2025-11-22 19:41:48.781	2025-11-22 19:41:48.781	1988-05-20 00:00:00	Casada	Arquiteta	VIP	FISICA	\N	\N
b224d7e9-4e27-4ade-9581-6f8c42680ded	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Pedro Henrique Alves Costa	222.333.444-55	SP-22.333.444	pedro.alves@email.com	(11) 97777-6666	Av. Rebouças, 1500, Casa 10	São Paulo	SP	05401-200	Indicado por Dr. Silva. Contrato de assessoria jurídica médica e tributária.	t	2025-11-22 19:41:48.808	2025-11-22 19:41:48.808	1992-09-15 00:00:00	Solteiro	Médico Cardiologista	Profissional	FISICA	\N	\N
bc4cc3f2-b79d-4333-a088-b7dde3faec92	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Construtora Prime Engenharia Ltda	33.444.555/0001-66	\N	juridico@primeengenharia.com.br	(21) 3344-5566	Av. das Américas, 3000, Sala 1205	Rio de Janeiro	RJ	22640-100	Construtora especializada em obras residenciais de alto padrão. Contrato anual de assessoria trabalhista e tributária. Responsável: Dr. Marcos.	t	2025-11-22 19:41:48.833	2025-11-22 19:41:48.833	\N	\N	\N	Corporativo	JURIDICA	Marcos Antonio Ferreira	333.444.555-66
b21b3785-4f43-4bd1-983e-af122e38044c	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Supermercados Boa Vida S.A.	44.555.666/0001-77		contato@boavida.com.br	(31) 2233-4455	Rua Comercial, 800, Centro	Contagem	MG	32040-000	Rede de supermercados com 5 unidades em MG. Contrato de consultoria jurídica empresarial completa. Diretora: Juliana.	t	2025-11-22 19:41:48.863	2025-11-22 19:44:26.362	\N	Casado(a)		Varejo	JURIDICA	Juliana Rodrigues Santos	444.555.666-77
4bbd107b-a2e3-4572-b652-9fbe5db4764a	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Maria Aparecida da Silva	123.456.789-00	\N	maria.silva@email.com	(11) 98765-4321	Rua das Flores, 123	Rio de Janeiro	RJ	01234-567	\N	t	2025-11-01 23:16:38.984	2025-11-01 23:16:38.984	\N	\N	\N	\N	FISICA	\N	\N
23c7695c-cacc-4f51-b79d-2f2d0c17a74e	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	José Carlos Santos	234.567.890-11	\N	jose.santos@email.com	(11) 97654-3210	Rua das Flores, 123	Rio de Janeiro	RJ	01234-567	\N	t	2025-11-01 23:16:38.984	2025-11-01 23:16:38.984	\N	\N	\N	\N	FISICA	\N	\N
50d70b86-b166-42d6-9dba-884a88e78941	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Ana Paula Ferreira	345.678.901-22	\N	ana.ferreira@email.com	(11) 96543-2109	Rua das Flores, 123	Rio de Janeiro	RJ	01234-567	\N	t	2025-11-01 23:16:38.985	2025-11-01 23:16:38.985	\N	\N	\N	\N	FISICA	\N	\N
43b385c6-cc94-4ae3-8b2b-5b6d90e1542c	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Ricardo Oliveira Lima	456.789.012-33	\N	ricardo.lima@email.com	(11) 95432-1098	Rua das Flores, 123	Rio de Janeiro	RJ	01234-567	\N	t	2025-11-01 23:16:38.986	2025-11-01 23:16:38.986	\N	\N	\N	\N	FISICA	\N	\N
e0b06200-99ea-40e3-894d-a918993c53fe	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Fernanda Costa Almeida	567.890.123-44	\N	fernanda.almeida@email.com	(11) 94321-0987	Rua das Flores, 123	Rio de Janeiro	RJ	01234-567	\N	t	2025-11-01 23:16:38.987	2025-11-01 23:16:38.987	\N	\N	\N	\N	FISICA	\N	\N
367913af-e42a-449b-8fe1-6a1f92091f22	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	TechSolutions Ltda	12.345.678/0001-99	\N	contato@techsolutions.com	(11) 3333-4444	Rua das Flores, 123	Rio de Janeiro	RJ	01234-567	\N	t	2025-11-01 23:16:38.988	2025-11-01 23:16:38.988	\N	\N	\N	\N	FISICA	\N	\N
37877f82-0032-49d1-9e15-fb5a08e2f309	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Construtora Boa Vista SA	23.456.789/0001-88	\N	juridico@boavista.com	(11) 2222-3333	Rua das Flores, 123	Rio de Janeiro	RJ	01234-567	\N	t	2025-11-01 23:16:38.989	2025-11-01 23:16:38.989	\N	\N	\N	\N	FISICA	\N	\N
3cc5e9c5-88a8-4899-8278-0de3b2065eda	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Marcelo Souza Pereira	678.901.234-55	\N	marcelo.pereira@email.com	(11) 93210-9876	Rua das Flores, 123	Rio de Janeiro	RJ	01234-567	\N	t	2025-11-01 23:16:38.99	2025-11-01 23:16:38.99	\N	\N	\N	\N	FISICA	\N	\N
db4d908c-a8de-45a2-b382-539935d79499	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Patricia Rodrigues Martins	789.012.345-66	\N	patricia.martins@email.com	(11) 92109-8765	Rua das Flores, 123	Rio de Janeiro	RJ	01234-567	\N	t	2025-11-01 23:16:38.991	2025-11-01 23:16:38.991	\N	\N	\N	\N	FISICA	\N	\N
02d36009-39c0-4e1a-962e-3d792ede9e8f	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Comércio Global Importadora	34.567.890/0001-77	\N	comercial@comercioglobal.com	(11) 4444-5555	Rua das Flores, 123	Rio de Janeiro	RJ	01234-567	\N	t	2025-11-01 23:16:38.992	2025-11-01 23:16:38.992	\N	\N	\N	\N	FISICA	\N	\N
a0fd51f8-0c82-4c25-97bd-c5cfb4801141	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Roberto Alves da Costa	890.123.456-77	\N	roberto.costa@email.com	(11) 91098-7654	Rua das Flores, 123	Rio de Janeiro	RJ	01234-567	\N	t	2025-11-01 23:16:38.992	2025-11-01 23:16:38.992	\N	\N	\N	\N	FISICA	\N	\N
6288690d-59ec-4107-a9a8-114e0421fc30	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Juliana Mendes Silva	901.234.567-88	\N	juliana.silva@email.com	(11) 90987-6543	Rua das Flores, 123	Rio de Janeiro	RJ	01234-567	\N	t	2025-11-01 23:16:38.993	2025-11-01 23:16:38.993	\N	\N	\N	\N	FISICA	\N	\N
3584a5f7-785c-4232-a233-b22190746d85	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Eduardo Fernandes Ribeiro	012.345.678-99	\N	eduardo.ribeiro@email.com	(11) 89876-5432	Rua das Flores, 123	Rio de Janeiro	RJ	01234-567	\N	t	2025-11-01 23:16:38.994	2025-11-01 23:16:38.994	\N	\N	\N	\N	FISICA	\N	\N
5eba954b-60dc-4590-8d58-fcda89c684d0	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Gabriela Santos Araújo	123.456.780-00	\N	gabriela.araujo@email.com	(11) 88765-4321	Rua das Flores, 123	Rio de Janeiro	RJ	01234-567	\N	t	2025-11-01 23:16:38.995	2025-11-01 23:16:38.995	\N	\N	\N	\N	FISICA	\N	\N
498b1b0c-ca23-468e-ae04-9fa755f30c19	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Tech Innovations Inc	45.678.901/0001-66	\N	contato@techinnovations.com	(11) 5555-6666	Rua das Flores, 123	Rio de Janeiro	RJ	01234-567	\N	t	2025-11-01 23:16:38.996	2025-11-01 23:16:38.996	\N	\N	\N	\N	FISICA	\N	\N
c7b22cd0-db4e-47a3-a8f5-2c9a70e966b4	08572024-a309-49a2-b885-82276f1c5c09	Maria Aparecida da Silva	123.456.789-00	\N	maria.silva@email.com	(11) 98765-4321	Rua das Flores, 123	Belo Horizonte	MG	01234-567	\N	t	2025-11-01 23:16:38.997	2025-11-01 23:16:38.997	\N	\N	\N	\N	FISICA	\N	\N
1230a6cd-d7e8-4c5f-9134-e063f02f95c4	08572024-a309-49a2-b885-82276f1c5c09	José Carlos Santos	234.567.890-11	\N	jose.santos@email.com	(11) 97654-3210	Rua das Flores, 123	Belo Horizonte	MG	01234-567	\N	t	2025-11-01 23:16:38.998	2025-11-01 23:16:38.998	\N	\N	\N	\N	FISICA	\N	\N
10671218-0d1a-4af7-8164-7ca058f7a80c	08572024-a309-49a2-b885-82276f1c5c09	Ana Paula Ferreira	345.678.901-22	\N	ana.ferreira@email.com	(11) 96543-2109	Rua das Flores, 123	Belo Horizonte	MG	01234-567	\N	t	2025-11-01 23:16:38.999	2025-11-01 23:16:38.999	\N	\N	\N	\N	FISICA	\N	\N
4bae363e-dc85-4867-99b2-72267f99fcb1	08572024-a309-49a2-b885-82276f1c5c09	Ricardo Oliveira Lima	456.789.012-33	\N	ricardo.lima@email.com	(11) 95432-1098	Rua das Flores, 123	Belo Horizonte	MG	01234-567	\N	t	2025-11-01 23:16:39	2025-11-01 23:16:39	\N	\N	\N	\N	FISICA	\N	\N
fcf2371f-7458-496f-863a-a4a983b482ea	08572024-a309-49a2-b885-82276f1c5c09	Fernanda Costa Almeida	567.890.123-44	\N	fernanda.almeida@email.com	(11) 94321-0987	Rua das Flores, 123	Belo Horizonte	MG	01234-567	\N	t	2025-11-01 23:16:39.001	2025-11-01 23:16:39.001	\N	\N	\N	\N	FISICA	\N	\N
989fbbc2-7296-4c3a-bc86-7a354b469873	08572024-a309-49a2-b885-82276f1c5c09	TechSolutions Ltda	12.345.678/0001-99	\N	contato@techsolutions.com	(11) 3333-4444	Rua das Flores, 123	Belo Horizonte	MG	01234-567	\N	t	2025-11-01 23:16:39.002	2025-11-01 23:16:39.002	\N	\N	\N	\N	FISICA	\N	\N
18e8b834-480f-4751-a811-7343f71b4d30	08572024-a309-49a2-b885-82276f1c5c09	Construtora Boa Vista SA	23.456.789/0001-88	\N	juridico@boavista.com	(11) 2222-3333	Rua das Flores, 123	Belo Horizonte	MG	01234-567	\N	t	2025-11-01 23:16:39.003	2025-11-01 23:16:39.003	\N	\N	\N	\N	FISICA	\N	\N
00e7eb11-dde0-4e94-a188-62944da7f15f	08572024-a309-49a2-b885-82276f1c5c09	Marcelo Souza Pereira	678.901.234-55	\N	marcelo.pereira@email.com	(11) 93210-9876	Rua das Flores, 123	Belo Horizonte	MG	01234-567	\N	t	2025-11-01 23:16:39.004	2025-11-01 23:16:39.004	\N	\N	\N	\N	FISICA	\N	\N
73bf9e98-2a4c-4c19-95ce-96a16aca3178	08572024-a309-49a2-b885-82276f1c5c09	Patricia Rodrigues Martins	789.012.345-66	\N	patricia.martins@email.com	(11) 92109-8765	Rua das Flores, 123	Belo Horizonte	MG	01234-567	\N	t	2025-11-01 23:16:39.005	2025-11-01 23:16:39.005	\N	\N	\N	\N	FISICA	\N	\N
2642faa5-b993-4b0a-9c0e-f46ad594d892	08572024-a309-49a2-b885-82276f1c5c09	Comércio Global Importadora	34.567.890/0001-77	\N	comercial@comercioglobal.com	(11) 4444-5555	Rua das Flores, 123	Belo Horizonte	MG	01234-567	\N	t	2025-11-01 23:16:39.005	2025-11-01 23:16:39.005	\N	\N	\N	\N	FISICA	\N	\N
8ec1a92c-68e8-4e1f-88e3-d57d1aa65af0	08572024-a309-49a2-b885-82276f1c5c09	Roberto Alves da Costa	890.123.456-77	\N	roberto.costa@email.com	(11) 91098-7654	Rua das Flores, 123	Belo Horizonte	MG	01234-567	\N	t	2025-11-01 23:16:39.007	2025-11-01 23:16:39.007	\N	\N	\N	\N	FISICA	\N	\N
3882e721-6bcd-47ab-a701-6e4223796955	08572024-a309-49a2-b885-82276f1c5c09	Juliana Mendes Silva	901.234.567-88	\N	juliana.silva@email.com	(11) 90987-6543	Rua das Flores, 123	Belo Horizonte	MG	01234-567	\N	t	2025-11-01 23:16:39.007	2025-11-01 23:16:39.007	\N	\N	\N	\N	FISICA	\N	\N
a1ebeaf8-fc21-4870-a8cb-3f1a34dd9056	08572024-a309-49a2-b885-82276f1c5c09	Eduardo Fernandes Ribeiro	012.345.678-99	\N	eduardo.ribeiro@email.com	(11) 89876-5432	Rua das Flores, 123	Belo Horizonte	MG	01234-567	\N	t	2025-11-01 23:16:39.008	2025-11-01 23:16:39.008	\N	\N	\N	\N	FISICA	\N	\N
7ef27146-a6ef-45fb-969d-d2e8dadc405a	08572024-a309-49a2-b885-82276f1c5c09	Gabriela Santos Araújo	123.456.780-00	\N	gabriela.araujo@email.com	(11) 88765-4321	Rua das Flores, 123	Belo Horizonte	MG	01234-567	\N	t	2025-11-01 23:16:39.009	2025-11-01 23:16:39.009	\N	\N	\N	\N	FISICA	\N	\N
e777ac0b-7f4f-4b67-acad-ee1fdd4c96b1	08572024-a309-49a2-b885-82276f1c5c09	Tech Innovations Inc	45.678.901/0001-66	\N	contato@techinnovations.com	(11) 5555-6666	Rua das Flores, 123	Belo Horizonte	MG	01234-567	\N	t	2025-11-01 23:16:39.01	2025-11-01 23:16:39.01	\N	\N	\N	\N	FISICA	\N	\N
2f980ca0-abb6-4fa2-9f19-bef6b6bba5cb	4eef674f-b389-4757-bc9e-e950092eec89	Cliente Teste Atualizado	12345678901	\N	cliente.teste@advwell.pro	(21) 98765-4321	Rua Teste, 456	\N	\N	\N	Cliente criado em teste completo	t	2025-11-16 04:20:48.832	2025-11-16 04:20:48.929	\N	\N	\N	\N	FISICA	\N	\N
37a12474-fbaf-43ac-8bf2-d03422e2fac2	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Teste										t	2025-11-21 17:22:02.934	2025-11-21 17:22:02.934	\N				FISICA	\N	\N
1713b3b8-526f-4433-9fa0-daf3185ca27a	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Teste 2	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	2025-11-21 17:22:02.943	2025-11-21 17:22:02.943	\N	\N	\N	\N	FISICA	\N	\N
45301b0c-2837-4802-998b-677135c7b180	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Teste 3	\N	\N		\N	\N	\N	\N	\N	\N	t	2025-11-21 17:22:02.952	2025-11-21 17:22:02.952	\N	\N	\N	\N	FISICA	\N	\N
54ce6115-f4d5-44f7-ac97-771427d9c2af	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Teste 4	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	2025-11-21 17:22:02.961	2025-11-21 17:22:02.961	\N	\N	\N	\N	FISICA	\N	\N
9d128c6c-598b-4a17-8dcc-2b305a87fe79	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Wellington	07672166794									t	2025-11-21 17:26:52.347	2025-11-21 17:26:52.347	\N				FISICA	\N	\N
9794afdf-ba4e-49ca-a4ba-18116fa952b2	8def413f-b55a-46e3-9db8-758fcdcd879a	Cliente Teste Upload	12345678900	\N	cliente1762294163@test.com	(11) 98765-4321	\N	\N	\N	\N	\N	t	2025-11-04 22:09:24.789	2025-11-04 22:09:24.789	\N	\N	\N	\N	FISICA	\N	\N
7c479db8-3e5c-485d-ad8a-b5977da18a62	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Cliente Teste Validação		\N		21999999999		\N	\N	\N		t	2025-11-21 17:42:06.646	2025-11-21 17:42:06.646	\N	\N	\N	\N	FISICA	\N	\N
4422005b-dab9-4e3e-a159-47ff9a99a501	09fb2517-f437-4abb-870f-6cd294e3c93b	Cliente Teste Upload	12345678900	\N	cliente1762295161@test.com	(11) 98765-4321	\N	\N	\N	\N	\N	t	2025-11-04 22:26:02.938	2025-11-04 22:26:02.938	\N	\N	\N	\N	FISICA	\N	\N
bbc08b88-8125-4532-9e07-9263615d1809	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Cliente Teste 2	10000000002	\N	cliente2@teste.com	(11) 92222-2222	Rua Teste 2, número 2	São Paulo	SP	01000-002	Cliente de teste número 2	t	2025-11-15 03:40:59.709	2025-11-15 03:40:59.709	1990-01-02 00:00:00	Solteiro	Profissão 2	\N	FISICA	\N	\N
076af37c-ea02-4686-9bf9-4f29224b6b5a	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Cliente Teste 3	10000000003	\N	cliente3@teste.com	(11) 93333-3333	Rua Teste 3, número 3	São Paulo	SP	01000-003	Cliente de teste número 3	t	2025-11-15 03:40:59.753	2025-11-15 03:40:59.753	1990-01-03 00:00:00	Solteiro	Profissão 3	\N	FISICA	\N	\N
991367eb-f178-42e6-b2e6-adbae002fea4	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Cliente Teste 4	10000000004	\N	cliente4@teste.com	(11) 94444-4444	Rua Teste 4, número 4	São Paulo	SP	01000-004	Cliente de teste número 4	t	2025-11-15 03:40:59.792	2025-11-15 03:40:59.792	1990-01-04 00:00:00	Solteiro	Profissão 4	\N	FISICA	\N	\N
38faab37-649f-4dbe-9647-2d9d175a1cfc	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Cliente Teste 5	10000000005	\N	cliente5@teste.com	(11) 95555-5555	Rua Teste 5, número 5	São Paulo	SP	01000-005	Cliente de teste número 5	t	2025-11-15 03:40:59.835	2025-11-15 03:40:59.835	1990-01-05 00:00:00	Solteiro	Profissão 5	\N	FISICA	\N	\N
21f69d90-cefb-4e3d-87c6-a7ef857d3d73	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Cliente Teste 1 EDITADO	10000000001	\N	cliente1editado@teste.com	(11) 91111-1111	Rua Teste 1 EDITADA	São Paulo	SP	01000-001	Cliente editado com sucesso	t	2025-11-15 03:40:59.667	2025-11-15 03:40:59.88	\N	Casado	Profissão Editada	\N	FISICA	\N	\N
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, name, cnpj, email, phone, address, active, "createdAt", "updatedAt", city, state, "zipCode", logo, "apiKey") FROM stdin;
08572024-a309-49a2-b885-82276f1c5c09	Mendes & Pereira Advogados	34.567.890/0001-12	contato@mendespereira.com.br	(31) 3234-5678	Av. Afonso Pena, 500	t	2025-11-01 23:16:37.116	2025-11-03 00:22:13.781	Belo Horizonte	MG	30130-001	\N	\N
c3b2daac-22f6-4e50-be65-c509990b0ada	AdvTom		contato@advwell.pro	(11) 99999-9999	Rua Principal, 123	t	2025-11-02 23:02:49.607	2025-11-03 19:25:39.267	São Paulo	SP	01000-000	\N	\N
cdab847f-a4c6-42f8-a8e4-8d8f43201cb2	DrBrito	\N	adv@gmail.com	\N	\N	t	2025-11-04 19:28:23.561	2025-11-04 19:28:23.561	\N	\N	\N	\N	\N
b5820aeb-d0dd-47ca-8b79-c253614a61bb	Wel Brito	\N	euwrbrito@gmail.com	\N	\N	t	2025-11-04 20:13:47.178	2025-11-04 20:13:47.178	\N	\N	\N	\N	\N
9cbae4e7-10b4-4df8-85e8-9b6973e21d02	WRBrito Adv	\N	chatwellpro@gmail.com	\N	\N	t	2025-11-04 20:30:04.795	2025-11-04 20:30:04.795	\N	\N	\N	\N	\N
256ad0d5-a35c-44d1-a1f4-f1e359999181	Test Company 1762288678	\N	test1762288678@example.com	\N	\N	t	2025-11-04 20:37:58.579	2025-11-04 20:37:58.579	\N	\N	\N	\N	\N
34136ba3-53d6-47b1-ac5b-001d9f8d9584	Test Company 1762288688	\N	test1762288688@example.com	\N	\N	t	2025-11-04 20:38:08.91	2025-11-04 20:38:08.91	\N	\N	\N	\N	\N
2c752818-b9ff-4fe4-a819-cf6f08d58ecc	Debug Company 1762288816	\N	testdebug1762288816@example.com	\N	\N	t	2025-11-04 20:40:16.268	2025-11-04 20:40:16.268	\N	\N	\N	\N	\N
f76b195f-56f7-4bb1-be06-0451e507a6f4	Test Company 1762288848	\N	appadvwell+test1762288848@gmail.com	\N	\N	t	2025-11-04 20:40:48.735	2025-11-04 20:40:48.735	\N	\N	\N	\N	\N
8def413f-b55a-46e3-9db8-758fcdcd879a	Test Company Upload 1762294163	\N	testupload1762294163@example.com	\N	\N	t	2025-11-04 22:09:23.317	2025-11-04 22:09:23.317	\N	\N	\N	\N	\N
09fb2517-f437-4abb-870f-6cd294e3c93b	Test Company Upload 1762295161	\N	testupload1762295161@example.com	\N	\N	t	2025-11-04 22:26:01.552	2025-11-04 22:26:01.552	\N	\N	\N	\N	\N
ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Costa & Associados Advocacia	23.456.789/0001-01	juridico@costaassociados.adv.br	(21) 2345-6789	Rua do Ouvidor, 250	t	2025-11-01 23:16:37.115	2025-11-02 23:42:04.577	Rio de Janeiro	RJ	20040-030	\N	30f62d35-091c-41ee-97d5-97d7dcf4b8f6
ce9de189-53e7-47a6-93d3-68c97a6a1b3b	Teste tati	\N	we@gmail.com	\N	\N	t	2025-11-13 22:27:25.469	2025-11-13 22:27:25.469	\N	\N	\N	\N	\N
b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Empresa Teste Final	\N	empresa.final@teste.com	(21) 3333-5555	Av Teste Final, 789	t	2025-11-15 02:21:52.249	2025-11-15 03:14:17.866	Rio de Janeiro	RJ	20000-000	\N	\N
0df8d66c-8e50-4ffd-b74f-37b658932f5a	Escritório AdvWell Teste	12345678000199	teste@advwell.pro	(21) 99999-9999	Rua Teste, 123	t	2025-11-16 02:35:20.221	2025-11-16 02:35:20.221	Rio de Janeiro	RJ	20000-000	\N	\N
4eef674f-b389-4757-bc9e-e950092eec89	Empresa Teste Sistema	\N	teste.sistema.completo@advwell.test	(21) 3333-4444	Av. Teste, 1000	t	2025-11-16 04:18:45.095	2025-11-16 04:19:07.704	Rio de Janeiro	RJ	20000-000	\N	\N
d719db14-5c49-4526-a851-6db07ed39f22	AdvWell	\N	appadvwell@gmail.com	\N	\N	t	2025-11-03 19:56:14.352	2025-11-22 18:09:14.63	\N	\N	\N	\N	4ecd4aed-5725-402c-af35-0a6fc9113d87
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documents (id, "companyId", "caseId", "clientId", name, description, "storageType", "fileUrl", "fileKey", "fileSize", "fileType", "externalUrl", "externalType", "uploadedBy", "createdAt", "updatedAt") FROM stdin;
3970a08e-a58e-446d-a46d-6421c4abde59	8def413f-b55a-46e3-9db8-758fcdcd879a	\N	9794afdf-ba4e-49ca-a4ba-18116fa952b2	Documento de Teste - Upload S3	Arquivo de teste para validar upload no bucket S3: joyinchat.com	upload	https://joyinchat.com.s3.us-east-1.amazonaws.com/company-8def413f-b55a-46e3-9db8-758fcdcd879a/documents/e359a34f-d47d-4355-9901-085996d62ca3.txt	company-8def413f-b55a-46e3-9db8-758fcdcd879a/documents/e359a34f-d47d-4355-9901-085996d62ca3.txt	535	text/plain	\N	\N	685eae64-3642-4b1b-a4a6-31e3ed1ce2e2	2025-11-04 22:09:25.039	2025-11-04 22:09:25.039
76e5a408-e91d-4e71-b1f5-130145d49c40	9cbae4e7-10b4-4df8-85e8-9b6973e21d02	\N	11c6f613-4d1f-499d-9c0c-14ad9dc2af5f	relatorio_financeiro_2025-11-01.pdf	\N	upload	https://joyinchat.com.s3.us-east-1.amazonaws.com/company-9cbae4e7-10b4-4df8-85e8-9b6973e21d02/documents/fcca3ad2-1cb5-42e3-9654-4a7546311bc0.pdf	company-9cbae4e7-10b4-4df8-85e8-9b6973e21d02/documents/fcca3ad2-1cb5-42e3-9654-4a7546311bc0.pdf	1741	application/pdf	\N	\N	b56293f8-9e46-412f-90a6-5187795f7bd5	2025-11-04 22:11:36.882	2025-11-04 22:11:36.882
99ff03ac-17be-4a3e-a7f1-fba8a4b450df	09fb2517-f437-4abb-870f-6cd294e3c93b	\N	4422005b-dab9-4e3e-a159-47ff9a99a501	Documento de Teste - Upload S3	Arquivo de teste para validar upload no bucket S3: joyinchat.com	upload	https://joyinchat.com.s3.us-east-1.amazonaws.com/testupload1762295161-at-example.com/documents/f62c06d9-4231-43cd-bdc8-4c89c365e5f7.txt	testupload1762295161-at-example.com/documents/f62c06d9-4231-43cd-bdc8-4c89c365e5f7.txt	535	text/plain	\N	\N	52fcb26d-6842-4c16-a353-bf9f065e84d9	2025-11-04 22:26:03.096	2025-11-04 22:26:03.096
97e44315-04e9-4a32-843d-c6123ef85692	9cbae4e7-10b4-4df8-85e8-9b6973e21d02	\N	11c6f613-4d1f-499d-9c0c-14ad9dc2af5f	erros_advtom.png	\N	upload	https://joyinchat.com.s3.us-east-1.amazonaws.com/chatwellpro-at-gmail.com/documents/6ed204fa-13cb-4347-9eae-b84edf1d6a91.png	chatwellpro-at-gmail.com/documents/6ed204fa-13cb-4347-9eae-b84edf1d6a91.png	75802	image/png	\N	\N	b56293f8-9e46-412f-90a6-5187795f7bd5	2025-11-04 22:27:56.423	2025-11-04 22:27:56.423
e22dff81-281c-4bcf-96d1-068399b4b12c	9cbae4e7-10b4-4df8-85e8-9b6973e21d02	\N	11c6f613-4d1f-499d-9c0c-14ad9dc2af5f	erros_advtom.png	\N	upload	https://joyinchat.com.s3.us-east-1.amazonaws.com/chatwellpro-at-gmail.com/documents/905a7478-1a07-47d1-a229-d162f5c79cd8.png	chatwellpro-at-gmail.com/documents/905a7478-1a07-47d1-a229-d162f5c79cd8.png	75802	image/png	\N	\N	b56293f8-9e46-412f-90a6-5187795f7bd5	2025-11-04 22:31:31.011	2025-11-04 22:31:31.011
6de6ae6d-6114-4f72-a1fa-6d66dd60d1bd	9cbae4e7-10b4-4df8-85e8-9b6973e21d02	\N	11c6f613-4d1f-499d-9c0c-14ad9dc2af5f	relatorio_financeiro_2025-11-01.pdf	\N	upload	https://joyinchat.com.s3.us-east-1.amazonaws.com/chatwellpro-at-gmail.com/documents/879bb2cf-0438-4370-ab0a-31b33e0b297b.pdf	chatwellpro-at-gmail.com/documents/879bb2cf-0438-4370-ab0a-31b33e0b297b.pdf	1741	application/pdf	\N	\N	b56293f8-9e46-412f-90a6-5187795f7bd5	2025-11-04 22:33:53.677	2025-11-04 22:33:53.677
3fc2a1ba-54b4-4f6a-a543-e70fe66d0d25	c3b2daac-22f6-4e50-be65-c509990b0ada	\N	6a873850-b3ff-4ec8-8fa8-94db749600f3	Bai Coco 1.png	\N	link	\N	\N	\N	\N	https://app.advwell.pro/documents	google_drive	58847a5a-e8e4-44e8-ba15-a6a691f52aba	2025-11-07 01:32:20.369	2025-11-07 01:32:20.369
5d843f59-3a61-4d44-9c1d-2df5e35102ee	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	\N	5b5c49d7-d469-48e6-9478-a60e1db01cb0	Documento Teste Completo	Documento criado para teste de validação	link	\N	\N	\N	\N	https://docs.google.com/document/d/1234567890	google_docs	9da7aeb5-f862-403d-90b3-df9df5368806	2025-11-15 03:12:06.344	2025-11-15 03:12:06.344
74fd45fb-ab46-44cd-a8d8-5f7bde6eaf15	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	\N	425e5f95-6e7a-4085-9bf3-c000770de300	Documento do Cliente	Documento vinculado apenas ao cliente	link	\N	\N	\N	\N	https://drive.google.com/file/d/123	google_drive	9da7aeb5-f862-403d-90b3-df9df5368806	2025-11-15 03:14:17.483	2025-11-15 03:14:17.483
ad7e9646-dc55-4281-8284-52f5f846f9db	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	5f6ecc30-fd5f-469c-8733-cf47285241e2	\N	Documento do Processo	Documento vinculado apenas ao processo	link	\N	\N	\N	\N	https://docs.google.com/document/d/456	google_docs	9da7aeb5-f862-403d-90b3-df9df5368806	2025-11-15 03:14:17.518	2025-11-15 03:14:17.518
51d3c2ad-cf44-4f64-9765-8e80a7345a8b	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	\N	21f69d90-cefb-4e3d-87c6-a7ef857d3d73	Documento Teste 2	Descrição do documento 2	link	\N	\N	\N	\N	https://drive.google.com/documento2	google_drive	9da7aeb5-f862-403d-90b3-df9df5368806	2025-11-15 03:41:12.769	2025-11-15 03:41:12.769
9b84cde5-e4f0-40a7-be1d-d6020308fcab	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	\N	21f69d90-cefb-4e3d-87c6-a7ef857d3d73	Documento Teste 3	Descrição do documento 3	link	\N	\N	\N	\N	https://drive.google.com/documento3	google_drive	9da7aeb5-f862-403d-90b3-df9df5368806	2025-11-15 03:41:12.807	2025-11-15 03:41:12.807
9442f7d6-0437-4abd-a1d4-12fd82520a30	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	\N	21f69d90-cefb-4e3d-87c6-a7ef857d3d73	Documento Teste 4	Descrição do documento 4	link	\N	\N	\N	\N	https://drive.google.com/documento4	google_drive	9da7aeb5-f862-403d-90b3-df9df5368806	2025-11-15 03:41:12.847	2025-11-15 03:41:12.847
ed3867ed-157b-4524-bd75-d5f770ab9631	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	\N	21f69d90-cefb-4e3d-87c6-a7ef857d3d73	Documento Teste 5	Descrição do documento 5	link	\N	\N	\N	\N	https://drive.google.com/documento5	google_drive	9da7aeb5-f862-403d-90b3-df9df5368806	2025-11-15 03:41:12.887	2025-11-15 03:41:12.887
a62ce906-b471-471a-a7e9-d7eeb7232314	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	\N	21f69d90-cefb-4e3d-87c6-a7ef857d3d73	Documento Teste 1 EDITADO	Descrição editada	link	\N	\N	\N	\N	https://drive.google.com/documento1editado	google_drive	9da7aeb5-f862-403d-90b3-df9df5368806	2025-11-15 03:41:12.729	2025-11-15 03:41:12.93
d8b470a8-7b4a-42b2-8e69-e21aabf27840	c3b2daac-22f6-4e50-be65-c509990b0ada	84437036-9f39-493e-9df8-b5d360d504fd	\N	Documento 1	Descrição do documento 1	link	\N	\N	\N	\N	https://drive.google.com/file/doc1	google_drive	58847a5a-e8e4-44e8-ba15-a6a691f52aba	2025-11-15 04:01:43.703	2025-11-15 04:01:43.703
92e09b01-da4c-4f12-80b8-104c0f000859	c3b2daac-22f6-4e50-be65-c509990b0ada	71f4b808-5dbc-4e36-8993-2247f4632069	\N	Documento 2	Descrição do documento 2	link	\N	\N	\N	\N	https://drive.google.com/file/doc2	google_drive	58847a5a-e8e4-44e8-ba15-a6a691f52aba	2025-11-15 04:01:43.703	2025-11-15 04:01:43.703
b4e0f465-4001-46a1-84fe-1c6f6e03c033	c3b2daac-22f6-4e50-be65-c509990b0ada	656d4d6c-b400-4389-946f-0bb1009b56d8	\N	Documento 3	Descrição do documento 3	link	\N	\N	\N	\N	https://drive.google.com/file/doc3	google_drive	58847a5a-e8e4-44e8-ba15-a6a691f52aba	2025-11-15 04:01:43.703	2025-11-15 04:01:43.703
a7eb1ee6-be88-4c8c-b795-9e3763956cf1	c3b2daac-22f6-4e50-be65-c509990b0ada	d8f87aa3-835d-4b07-90e8-71c239c0f12d	\N	Documento 4	Descrição do documento 4	link	\N	\N	\N	\N	https://drive.google.com/file/doc4	google_drive	58847a5a-e8e4-44e8-ba15-a6a691f52aba	2025-11-15 04:01:43.703	2025-11-15 04:01:43.703
1d3441d4-fa8a-4c6a-8206-8bd490fc8b18	c3b2daac-22f6-4e50-be65-c509990b0ada	66930a4f-e404-4419-97fa-bba0e07460a0	\N	Documento 5	Descrição do documento 5	link	\N	\N	\N	\N	https://drive.google.com/file/doc5	google_drive	58847a5a-e8e4-44e8-ba15-a6a691f52aba	2025-11-15 04:01:43.703	2025-11-15 04:01:43.703
3ed6a5cd-a205-4136-9240-791063ff32a2	c3b2daac-22f6-4e50-be65-c509990b0ada	1efbd6c8-468b-4ede-a720-d3b8e10cc967	\N	Documento 6	Descrição do documento 6	link	\N	\N	\N	\N	https://drive.google.com/file/doc6	google_drive	58847a5a-e8e4-44e8-ba15-a6a691f52aba	2025-11-15 04:01:43.703	2025-11-15 04:01:43.703
3bfe5c0b-2d25-43c9-9b57-a881809ec25e	c3b2daac-22f6-4e50-be65-c509990b0ada	\N	13384d9b-71a2-4bf3-b009-0e90a6edc830	terste	\N	upload	https://joyinchat.com.s3.us-east-1.amazonaws.com/wasolutionscorp-at-gmail.com/documents/a0763a35-3471-43f8-a1e2-eda44e0941c5.png	wasolutionscorp-at-gmail.com/documents/a0763a35-3471-43f8-a1e2-eda44e0941c5.png	1311537	image/png	\N	\N	58847a5a-e8e4-44e8-ba15-a6a691f52aba	2025-11-15 04:15:04.667	2025-11-15 04:15:04.667
85688ef9-77b6-433a-bc5e-4d2ce375d0ed	c3b2daac-22f6-4e50-be65-c509990b0ada	\N	fa51e798-5d91-4c64-8fda-92db33b0c53b	bai	\N	upload	https://joyinchat.com.s3.us-east-1.amazonaws.com/wasolutionscorp-at-gmail.com/documents/992c6883-1694-42bc-ae5e-53d433e9a660.png	wasolutionscorp-at-gmail.com/documents/992c6883-1694-42bc-ae5e-53d433e9a660.png	1311537	image/png	\N	\N	58847a5a-e8e4-44e8-ba15-a6a691f52aba	2025-11-15 05:20:28.148	2025-11-15 05:20:28.148
8177c14c-ea95-40c4-aa0b-52b638bba77c	c3b2daac-22f6-4e50-be65-c509990b0ada	\N	fa51e798-5d91-4c64-8fda-92db33b0c53b	teste rg	\N	upload	https://joyinchat.com.s3.us-east-1.amazonaws.com/wasolutionscorp-at-gmail.com/documents/7d7e81b9-381a-4d96-a212-f60031ecd206.jpg	wasolutionscorp-at-gmail.com/documents/7d7e81b9-381a-4d96-a212-f60031ecd206.jpg	178313	image/jpeg	\N	\N	58847a5a-e8e4-44e8-ba15-a6a691f52aba	2025-11-15 06:55:13.759	2025-11-15 06:55:13.759
a6db6d06-f834-4fc5-8669-6f61d1f6a740	0df8d66c-8e50-4ffd-b74f-37b658932f5a	\N	8829c021-024e-4d4e-b536-7fa721a38a7f	Contrato de Prestação de Serviços	Contrato assinado com o Cliente 1	link	\N	\N	\N	\N	https://drive.google.com/file/exemplo1	google_drive	75b6ad8c-f7a6-47ae-ba9a-a88329565390	2025-11-16 02:35:20.814	2025-11-16 02:35:20.814
e995a9aa-2c8d-4ea0-9549-787d1deb33b9	0df8d66c-8e50-4ffd-b74f-37b658932f5a	4cf58ed1-81f7-496e-96e9-f4a0adf32586	\N	Petição Inicial - Processo 1	Petição inicial do processo	link	\N	\N	\N	\N	https://drive.google.com/file/exemplo2	google_drive	75b6ad8c-f7a6-47ae-ba9a-a88329565390	2025-11-16 02:35:20.817	2025-11-16 02:35:20.817
2279c884-94cf-4306-8626-7a7f33c4bc57	4eef674f-b389-4757-bc9e-e950092eec89	\N	010f3ad1-b455-4be0-9b43-b55e3e197df0	Procuração - Teste	Documento teste Google Drive	link	\N	\N	\N	\N	https://drive.google.com/file/d/test123	google_drive	9508bb44-2e01-4d08-9d29-f251a3574cd0	2025-11-16 04:19:07.323	2025-11-16 04:19:07.323
59553ba4-9195-4099-a37f-559b117777eb	4eef674f-b389-4757-bc9e-e950092eec89	\N	010f3ad1-b455-4be0-9b43-b55e3e197df0	Contrato - Teste	Google Docs	link	\N	\N	\N	\N	https://docs.google.com/document/d/test456	google_docs	9508bb44-2e01-4d08-9d29-f251a3574cd0	2025-11-16 04:19:07.363	2025-11-16 04:19:07.363
939a601e-c01e-4938-b256-59ad4199f285	c3b2daac-22f6-4e50-be65-c509990b0ada	\N	6a873850-b3ff-4ec8-8fa8-94db749600f3	teste	\N	upload	https://advwell-app.s3.us-east-1.amazonaws.com/wasolutionscorp-at-gmail.com/documents/1bb29060-ab2e-4925-a94d-ae4a7f4b2b36.png	wasolutionscorp-at-gmail.com/documents/1bb29060-ab2e-4925-a94d-ae4a7f4b2b36.png	37108	image/png	\N	\N	58847a5a-e8e4-44e8-ba15-a6a691f52aba	2025-11-16 16:31:12.387	2025-11-16 16:31:12.387
bfe8e1d8-781f-45e2-b778-c9f86cc89c18	c3b2daac-22f6-4e50-be65-c509990b0ada	\N	6a873850-b3ff-4ec8-8fa8-94db749600f3	dsc	\N	upload	https://advwell-app.s3.us-east-1.amazonaws.com/wasolutionscorp-at-gmail.com/documents/74adf0a3-82de-4581-8308-a66b7422fd00.pdf	wasolutionscorp-at-gmail.com/documents/74adf0a3-82de-4581-8308-a66b7422fd00.pdf	45310	application/pdf	\N	\N	58847a5a-e8e4-44e8-ba15-a6a691f52aba	2025-11-21 15:06:20.483	2025-11-21 15:06:20.483
f170f9ad-05bd-4b7f-b5f0-d43b9ee521f0	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	\N	bc4cc3f2-b79d-4333-a088-b7dde3faec92	TESTE PRIME	\N	upload	https://advwell-app.s3.us-east-1.amazonaws.com/admin-at-costaassociados.adv.br/documents/612c85a3-4bfb-4239-ad5e-9b47e3e91a31.pdf	admin-at-costaassociados.adv.br/documents/612c85a3-4bfb-4239-ad5e-9b47e3e91a31.pdf	45293	application/pdf	\N	\N	4487d487-e82a-4191-be0d-1ce543aaf438	2025-11-22 20:12:12.219	2025-11-22 20:12:12.219
\.


--
-- Data for Name: email_campaigns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_campaigns (id, "companyId", name, subject, body, status, "totalRecipients", "sentCount", "failedCount", "scheduledAt", "sentAt", "createdBy", "createdAt", "updatedAt") FROM stdin;
e7a49b69-39fb-4f65-b1b2-1fdb2b3e7c90	c3b2daac-22f6-4e50-be65-c509990b0ada	Perícia Marcada	Perícia Marcada - Ação Necessária	\n<!DOCTYPE html>\n<html>\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <style>\n        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }\n        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }\n        .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px 20px; text-align: center; }\n        .header h1 { color: #ffffff; margin: 0; font-size: 28px; }\n        .icon { width: 80px; height: 80px; background-color: #ffffff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 40px; margin-bottom: 20px; }\n        .content { padding: 40px 30px; color: #333333; line-height: 1.6; }\n        .greeting { font-size: 18px; font-weight: 600; color: #16a34a; margin-bottom: 20px; }\n        .message { font-size: 16px; margin-bottom: 20px; }\n        .info-box { background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 20px; margin: 25px 0; border-radius: 4px; }\n        .info-box strong { color: #15803d; }\n        .action-box { background-color: #fef3c7; border: 2px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 8px; text-align: center; }\n        .action-box .title { color: #d97706; font-weight: bold; font-size: 18px; margin-bottom: 10px; }\n        .button { display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff !important; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; box-shadow: 0 4px 6px rgba(22, 163, 74, 0.3); }\n        .footer { background-color: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }\n        .signature { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-style: italic; color: #6b7280; }\n    </style>\n</head>\n<body>\n    <div class="container">\n        <div class="header">\n            <div class="icon">🏥</div>\n            <h1>Perícia Médica Marcada</h1>\n        </div>\n        <div class="content">\n            <div class="greeting">Olá, {nome_cliente}!</div>\n\n            <div class="message">\n                Informamos que a <strong>perícia médica</strong> do seu processo foi agendada.\n            </div>\n\n            <div class="info-box">\n                <strong>⚠️ IMPORTANTE:</strong> É fundamental que você compareça à perícia na data e horário marcados.\n                O não comparecimento pode prejudicar o andamento do seu processo.\n            </div>\n\n            <div class="action-box">\n                <div class="title">🔔 AÇÃO NECESSÁRIA</div>\n                <p>Por favor, entre em contato com nosso escritório <strong>com urgência</strong> para confirmar o recebimento desta notificação e obter os detalhes completos sobre:</p>\n                <ul style="text-align: left; display: inline-block; margin: 10px 0;">\n                    <li>Data e horário da perícia</li>\n                    <li>Local do atendimento</li>\n                    <li>Documentos necessários</li>\n                    <li>Orientações importantes</li>\n                </ul>\n            </div>\n\n            <div style="text-align: center;">\n                <a href="tel:+5511999999999" class="button">📞 Ligar Agora</a>\n            </div>\n\n            <div class="signature">\n                Atenciosamente,<br>\n                <strong>{nome_empresa}</strong>\n            </div>\n        </div>\n        <div class="footer">\n            <p>Este é um email automático. Por favor, não responda.</p>\n            <p>Para mais informações, entre em contato conosco.</p>\n            <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">\n                © {data} {nome_empresa}. Todos os direitos reservados.\n            </p>\n        </div>\n    </div>\n</body>\n</html>\n    	draft	7	0	0	\N	\N	58847a5a-e8e4-44e8-ba15-a6a691f52aba	2025-11-16 14:08:46.017	2025-11-16 14:08:46.017
\.


--
-- Data for Name: event_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_assignments (id, "eventId", "userId", "createdAt") FROM stdin;
\.


--
-- Data for Name: financial_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.financial_transactions (id, "companyId", "clientId", "caseId", type, description, amount, date, "createdAt", "updatedAt") FROM stdin;
a135a903-4e1c-43fd-8aa7-9a5244b89e6a	4eef674f-b389-4757-bc9e-e950092eec89	010f3ad1-b455-4be0-9b43-b55e3e197df0	\N	EXPENSE	Custas - Teste	500	2025-11-16 04:19:06	2025-11-16 04:19:06.929	2025-11-16 04:19:06.929
4a26520d-2184-4ccd-b96f-4bb474d0bdd6	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	c8d834e4-fc7d-427b-a35f-3412b17b1eb3	\N	INCOME	HON	400	2025-11-21 00:00:00	2025-11-21 17:16:30.299	2025-11-21 17:16:30.299
67ee9801-6810-450f-b2e7-4e66f9b9c885	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	4bbd107b-a2e3-4572-b652-9fbe5db4764a	\N	INCOME	Honorários - Ação de Cobrança	5000	2024-01-15 00:00:00	2025-11-01 23:16:39.385	2025-11-01 23:16:39.385
9116a0c3-1c16-44ab-88ee-cfdadc5c7241	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	23c7695c-cacc-4f51-b79d-2f2d0c17a74e	\N	INCOME	Honorários - Reclamação Trabalhista	6000	2024-02-15 00:00:00	2025-11-01 23:16:39.386	2025-11-01 23:16:39.386
7a03c5ce-85f9-4ba7-b3fa-87d1089eb45b	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	50d70b86-b166-42d6-9dba-884a88e78941	\N	INCOME	Honorários - Divórcio Consensual	7000	2024-03-15 00:00:00	2025-11-01 23:16:39.387	2025-11-01 23:16:39.387
c786e60c-51f6-4e42-8069-bf079321fa10	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	43b385c6-cc94-4ae3-8b2b-5b6d90e1542c	\N	INCOME	Honorários - Defesa Criminal	8000	2024-04-15 00:00:00	2025-11-01 23:16:39.387	2025-11-01 23:16:39.387
2b759557-8b15-4f51-9b89-4732147c0a1b	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	e0b06200-99ea-40e3-894d-a918993c53fe	\N	INCOME	Honorários - Indenização por Danos Morais	9000	2024-05-15 00:00:00	2025-11-01 23:16:39.388	2025-11-01 23:16:39.388
c597768a-4c93-4ded-91f6-f73359b89c77	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	367913af-e42a-449b-8fe1-6a1f92091f22	\N	INCOME	Honorários - Dissolução de Sociedade	10000	2024-06-15 00:00:00	2025-11-01 23:16:39.389	2025-11-01 23:16:39.389
eca9a4d8-3190-4dbc-a3f7-224d67f56a97	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	37877f82-0032-49d1-9e15-fb5a08e2f309	\N	INCOME	Honorários - Cobrança de Aluguel	11000	2024-07-15 00:00:00	2025-11-01 23:16:39.39	2025-11-01 23:16:39.39
daa08e5f-a119-4857-8a37-6e1408174d82	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	7c479db8-3e5c-485d-ad8a-b5977da18a62	e1528855-f03a-458b-8fd0-a7391f9627bb	INCOME	Honorários teste	1000	2025-11-21 00:00:00	2025-11-21 17:42:08.646	2025-11-22 18:04:17.63
020751bc-abc5-48f4-87c3-95400283c9c8	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	4bbd107b-a2e3-4572-b652-9fbe5db4764a	\N	EXPENSE	Despesa - Custas Processuais	500	2024-02-10 00:00:00	2025-11-01 23:16:39.39	2025-11-01 23:16:39.39
317029ac-6dcd-41d7-a4ed-fae58291dc04	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	23c7695c-cacc-4f51-b79d-2f2d0c17a74e	\N	EXPENSE	Despesa - Material de Escritório	800	2024-03-10 00:00:00	2025-11-01 23:16:39.391	2025-11-01 23:16:39.391
0072eaef-3ae1-40e6-9a54-b0dcd3b73197	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	50d70b86-b166-42d6-9dba-884a88e78941	\N	EXPENSE	Despesa - Software Jurídico	1100	2024-04-10 00:00:00	2025-11-01 23:16:39.392	2025-11-01 23:16:39.392
0cd4ef2e-63f9-4d30-8f41-7ff2cd20a07b	08572024-a309-49a2-b885-82276f1c5c09	c7b22cd0-db4e-47a3-a8f5-2c9a70e966b4	09e1409f-edad-4cbb-a4d2-b78242049a7c	INCOME	Honorários - Ação de Cobrança	5000	2024-01-15 00:00:00	2025-11-01 23:16:39.393	2025-11-01 23:16:39.393
28c7abaa-df98-4f0a-8704-197f3c99eb61	08572024-a309-49a2-b885-82276f1c5c09	1230a6cd-d7e8-4c5f-9134-e063f02f95c4	9f187c55-4701-4601-a41d-0508c5485588	INCOME	Honorários - Reclamação Trabalhista	6000	2024-02-15 00:00:00	2025-11-01 23:16:39.393	2025-11-01 23:16:39.393
5db7a001-2d3f-4950-a2f9-b36a06a9d261	08572024-a309-49a2-b885-82276f1c5c09	10671218-0d1a-4af7-8164-7ca058f7a80c	23118458-39e9-4d59-999c-94adf5ed036b	INCOME	Honorários - Divórcio Consensual	7000	2024-03-15 00:00:00	2025-11-01 23:16:39.394	2025-11-01 23:16:39.394
70df9459-3841-4721-8b93-6e1a1fc040e9	08572024-a309-49a2-b885-82276f1c5c09	4bae363e-dc85-4867-99b2-72267f99fcb1	36a877ae-0f07-4572-b82c-323e9735294a	INCOME	Honorários - Defesa Criminal	8000	2024-04-15 00:00:00	2025-11-01 23:16:39.395	2025-11-01 23:16:39.395
f7e5ba35-0220-48a3-b9be-79c4a48f076f	08572024-a309-49a2-b885-82276f1c5c09	fcf2371f-7458-496f-863a-a4a983b482ea	2602745c-af26-441f-88e6-9e11972ba97e	INCOME	Honorários - Indenização por Danos Morais	9000	2024-05-15 00:00:00	2025-11-01 23:16:39.396	2025-11-01 23:16:39.396
5667c860-4437-4013-afd5-d4861bafd566	08572024-a309-49a2-b885-82276f1c5c09	989fbbc2-7296-4c3a-bc86-7a354b469873	e9752652-2039-413f-ac1f-8842d10045ce	INCOME	Honorários - Dissolução de Sociedade	10000	2024-06-15 00:00:00	2025-11-01 23:16:39.397	2025-11-01 23:16:39.397
d1b7022a-36db-42f4-b44c-9d78908307dc	08572024-a309-49a2-b885-82276f1c5c09	18e8b834-480f-4751-a811-7343f71b4d30	43e144f4-bc12-471f-8029-bf50e0b029c6	INCOME	Honorários - Cobrança de Aluguel	11000	2024-07-15 00:00:00	2025-11-01 23:16:39.397	2025-11-01 23:16:39.397
7f0026a7-9ccb-4f27-9e97-87d8b760e2b5	08572024-a309-49a2-b885-82276f1c5c09	c7b22cd0-db4e-47a3-a8f5-2c9a70e966b4	\N	EXPENSE	Despesa - Custas Processuais	500	2024-02-10 00:00:00	2025-11-01 23:16:39.398	2025-11-01 23:16:39.398
0c3bf56f-c6ff-44d6-ace2-b6e94dc54198	08572024-a309-49a2-b885-82276f1c5c09	1230a6cd-d7e8-4c5f-9134-e063f02f95c4	\N	EXPENSE	Despesa - Material de Escritório	800	2024-03-10 00:00:00	2025-11-01 23:16:39.399	2025-11-01 23:16:39.399
a077f059-7f91-48cd-bd05-4a975441cabd	08572024-a309-49a2-b885-82276f1c5c09	10671218-0d1a-4af7-8164-7ca058f7a80c	\N	EXPENSE	Despesa - Software Jurídico	1100	2024-04-10 00:00:00	2025-11-01 23:16:39.4	2025-11-01 23:16:39.4
087e6e7b-2f43-48b1-a0ed-b2a8f6862881	0df8d66c-8e50-4ffd-b74f-37b658932f5a	8829c021-024e-4d4e-b536-7fa721a38a7f	4cf58ed1-81f7-496e-96e9-f4a0adf32586	EXPENSE	Custas processuais	500	2024-11-05 00:00:00	2025-11-16 02:35:20.813	2025-11-16 03:49:08.74
9c25318c-9a4f-4e7e-be80-ee92d406656b	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	dc967571-b132-4d1e-9e7b-fc7de7f3fdc2	\N	INCOME	Honorários - Ação de Cobrança	5000	2024-11-01 00:00:00	2025-11-21 18:37:41.846	2025-11-21 18:37:41.846
2bae998b-16bc-4bd9-9215-fa72ec1ad08e	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	5bf2d041-9efe-4dfd-9a53-71b5b749827e	\N	INCOME	Honorários - Ação Trabalhista	8000	2024-11-05 00:00:00	2025-11-21 18:37:41.856	2025-11-21 18:37:41.856
3a8c1437-03fd-447f-bfa7-edb24669947b	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	2fae4996-3c72-4169-902a-83f4ba173a96	\N	INCOME	Honorários - Divórcio	3000	2024-11-10 00:00:00	2025-11-21 18:37:41.864	2025-11-21 18:37:41.864
229ab491-f163-4615-a7a9-51f34dd8995a	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	959d1015-35d5-4774-b7fd-c8a16b093a9a	\N	INCOME	Honorários - Indenização	15000	2024-11-15 00:00:00	2025-11-21 18:37:41.872	2025-11-21 18:37:41.872
659e60ea-f478-4d19-9a48-f64969acd1ad	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	dc967571-b132-4d1e-9e7b-fc7de7f3fdc2	\N	EXPENSE	Custas Processuais	500	2024-11-20 00:00:00	2025-11-21 18:37:41.881	2025-11-21 18:37:41.881
2ffedb0e-66e7-42a6-95f8-5234ea6c94d8	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	61f1353c-29cd-4635-ac55-837aab3b8ecc	\N	INCOME	Honorários Teste	1500	2025-11-15 02:22:24.916	2025-11-15 02:22:24.917	2025-11-15 02:22:24.917
e7a1824e-6181-4a47-886f-fd4fd17b4749	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	ef95c1b9-6b24-4eca-87b4-e2bdc8cfce4a	\N	INCOME	Honorários Teste	1500	2025-11-15 02:26:59.595	2025-11-15 02:26:59.596	2025-11-15 02:26:59.596
2198fdb1-8430-4faa-a4cc-e7694dabe020	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	bfb035bd-75d5-40bb-a120-b5c85821b062	\N	INCOME	Pagamento  com link	5000	2024-11-15 00:00:00	2025-11-15 02:40:22.981	2025-11-15 02:40:22.981
f10c0c40-3c9f-47e8-9397-d491fd425d93	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	70b2b2e6-cc09-45d9-be25-a81245a383a4	\N	INCOME	Honorários Teste	1500	2025-11-15 02:40:31.344	2025-11-15 02:40:31.344	2025-11-15 02:40:31.344
b8ac1f5c-7d3e-4632-ade7-7f4aa76249c2	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	5b5c49d7-d469-48e6-9478-a60e1db01cb0	\N	EXPENSE	Despesa de Teste	500	2025-11-15 00:00:00	2025-11-15 03:12:06.309	2025-11-15 03:12:06.309
e6319583-3d3b-4ce4-bae2-2c3dab934cdd	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	fbf04c26-3e35-4fa8-a40d-7f71e455672d	eaf8ae33-5c14-4c64-b03f-98a391aa158d	INCOME	Honorários de Teste	5000	2025-11-15 00:00:00	2025-11-15 03:13:11.245	2025-11-15 03:13:11.245
2c0b8ec7-f1da-4358-bc06-c94ee134d86c	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	fbf04c26-3e35-4fa8-a40d-7f71e455672d	\N	EXPENSE	Despesa de Teste	500	2025-11-15 00:00:00	2025-11-15 03:13:11.28	2025-11-15 03:13:11.28
7d64d9e4-047c-48d5-90e1-d0a1ad5946f4	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	425e5f95-6e7a-4085-9bf3-c000770de300	5f6ecc30-fd5f-469c-8733-cf47285241e2	INCOME	Honorários Teste	5000	2025-11-15 00:00:00	2025-11-15 03:14:17.416	2025-11-15 03:14:17.416
032b15e1-20b6-4eb7-ba9a-b44d19088e42	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	425e5f95-6e7a-4085-9bf3-c000770de300	\N	EXPENSE	Despesa Teste	500	2025-11-15 00:00:00	2025-11-15 03:14:17.45	2025-11-15 03:14:17.45
03f2aa98-ccf8-4b40-a209-c64e14eb14dc	c3b2daac-22f6-4e50-be65-c509990b0ada	86895787-ccd9-4364-8c52-8be2c1027b0d	\N	INCOME	serv b	100	2025-11-15 00:00:00	2025-11-15 03:16:50.108	2025-11-15 03:16:50.108
680f9926-c7f0-49af-89fb-04389548c387	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	21f69d90-cefb-4e3d-87c6-a7ef857d3d73	\N	INCOME	Receita Teste 2	1000	2024-11-02 00:00:00	2025-11-15 03:41:12.474	2025-11-15 03:41:12.474
c38a317e-c474-4861-810f-38357afa0a47	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	21f69d90-cefb-4e3d-87c6-a7ef857d3d73	\N	INCOME	Receita Teste 3	1500	2024-11-03 00:00:00	2025-11-15 03:41:12.514	2025-11-15 03:41:12.514
7085c8ad-eae4-43a8-84da-14967dc8515d	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	21f69d90-cefb-4e3d-87c6-a7ef857d3d73	\N	EXPENSE	Despesa Teste 4	2000	2024-11-04 00:00:00	2025-11-15 03:41:12.556	2025-11-15 03:41:12.556
2c123802-20d2-449a-a471-d335ef4955da	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	21f69d90-cefb-4e3d-87c6-a7ef857d3d73	\N	EXPENSE	Despesa Teste 5	2500	2024-11-05 00:00:00	2025-11-15 03:41:12.604	2025-11-15 03:41:12.604
c983fdd8-14f7-49a4-b67a-ec572fe7360f	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	21f69d90-cefb-4e3d-87c6-a7ef857d3d73	\N	INCOME	Receita Teste 1 EDITADA	2500	2024-11-01 00:00:00	2025-11-15 03:41:12.433	2025-11-15 03:41:12.65
719dd8c7-3f84-485d-a461-70422cb5f05c	c3b2daac-22f6-4e50-be65-c509990b0ada	86895787-ccd9-4364-8c52-8be2c1027b0d	84437036-9f39-493e-9df8-b5d360d504fd	INCOME	Honorários Advocatícios - Parcela 1	1000	2025-11-14 04:01:13.586	2025-11-15 04:01:13.586	2025-11-15 04:01:13.586
e3a88980-68af-4a75-8690-b6a939fe703f	c3b2daac-22f6-4e50-be65-c509990b0ada	6a873850-b3ff-4ec8-8fa8-94db749600f3	84437036-9f39-493e-9df8-b5d360d504fd	INCOME	Honorários Advocatícios - Parcela 2	2000	2025-11-13 04:01:13.586	2025-11-15 04:01:13.586	2025-11-15 04:01:13.586
eb9799d4-3c58-4dec-8449-82e7b87082c8	c3b2daac-22f6-4e50-be65-c509990b0ada	fa51e798-5d91-4c64-8fda-92db33b0c53b	84437036-9f39-493e-9df8-b5d360d504fd	INCOME	Honorários Advocatícios - Parcela 3	3000	2025-11-12 04:01:13.586	2025-11-15 04:01:13.586	2025-11-15 04:01:13.586
2b29a8cd-b434-4bd6-8ead-8ea8b5c6796d	c3b2daac-22f6-4e50-be65-c509990b0ada	13384d9b-71a2-4bf3-b009-0e90a6edc830	84437036-9f39-493e-9df8-b5d360d504fd	INCOME	Honorários Advocatícios - Parcela 4	4000	2025-11-11 04:01:13.586	2025-11-15 04:01:13.586	2025-11-15 04:01:13.586
81a6436c-32da-43f7-98c5-ce882f3f7284	c3b2daac-22f6-4e50-be65-c509990b0ada	32bd5bd6-1c47-48af-b01e-275713c859a5	84437036-9f39-493e-9df8-b5d360d504fd	EXPENSE	Despesa Processual 5	5000	2025-11-10 04:01:13.586	2025-11-15 04:01:13.586	2025-11-15 04:01:13.586
7ae4936f-d694-4e4c-871f-1002db8a956a	c3b2daac-22f6-4e50-be65-c509990b0ada	e2352d70-c933-4124-b572-bee19e6c149a	84437036-9f39-493e-9df8-b5d360d504fd	EXPENSE	Despesa Processual 6	6000	2025-11-09 04:01:13.586	2025-11-15 04:01:13.586	2025-11-15 04:01:13.586
1e9a229b-b692-44a1-a5cd-17ec318d81c4	0df8d66c-8e50-4ffd-b74f-37b658932f5a	8829c021-024e-4d4e-b536-7fa721a38a7f	4cf58ed1-81f7-496e-96e9-f4a0adf32586	INCOME	Honorários advocatícios - Cliente 1	15000	2024-11-01 00:00:00	2025-11-16 02:35:20.81	2025-11-16 02:35:20.81
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, "userId", resource, "canView", "canEdit", "canDelete", "createdAt", "updatedAt") FROM stdin;
9a3f204b-d650-448a-98be-6e8b4350a49d	d37f2103-8685-4739-a309-c36f69e29cb8	cases	t	t	f	2025-11-07 01:56:40.43	2025-11-07 01:56:40.43
e9152e8e-4cf4-4955-b55f-e9a7c1b5777d	ca2cd4c3-b59c-40e9-865b-7ce14c9a7b4c	clients	t	f	f	2025-11-01 23:16:37.634	2025-11-01 23:16:37.634
7de181ce-6c26-4524-8aed-428b2792610f	ca2cd4c3-b59c-40e9-865b-7ce14c9a7b4c	cases	t	f	f	2025-11-01 23:16:37.634	2025-11-01 23:16:37.634
7c6f256d-1f15-4359-a165-294e4413ab7a	e9fbbd88-d4b2-400f-80cb-f05c697adf70	clients	t	t	f	2025-11-01 23:16:37.707	2025-11-01 23:16:37.707
eea4f3a9-55ee-4ca8-8258-42332c0e4363	e9fbbd88-d4b2-400f-80cb-f05c697adf70	cases	t	t	f	2025-11-01 23:16:37.707	2025-11-01 23:16:37.707
abc5ec16-05b1-46b6-a719-19edb62720c9	e9fbbd88-d4b2-400f-80cb-f05c697adf70	financial	t	f	f	2025-11-01 23:16:37.707	2025-11-01 23:16:37.707
7eaf5eef-cf44-42d5-a0c7-4d7fbb453c21	41f0bb89-88d7-4ad7-afed-38ba611bf0fb	clients	t	t	t	2025-11-01 23:16:37.779	2025-11-01 23:16:37.779
19d311e1-91d6-400c-8a4d-5d93a681d3eb	41f0bb89-88d7-4ad7-afed-38ba611bf0fb	cases	t	t	t	2025-11-01 23:16:37.779	2025-11-01 23:16:37.779
941051d6-660f-49fc-a85c-c658e96de71a	41f0bb89-88d7-4ad7-afed-38ba611bf0fb	financial	t	t	f	2025-11-01 23:16:37.779	2025-11-01 23:16:37.779
8ee50079-471a-4ce4-ac6c-35792432b6dd	96340535-acb9-463e-a2b8-ffc62b0b2230	cases	t	f	f	2025-11-01 23:16:37.852	2025-11-01 23:16:37.852
3e4ede0d-6eeb-47bb-8c76-8d89d85b504c	96340535-acb9-463e-a2b8-ffc62b0b2230	financial	t	t	t	2025-11-01 23:16:37.852	2025-11-01 23:16:37.852
9041fc28-ae66-48a1-98c6-628140e8cf73	e51b6ae9-1bc3-47c3-97cb-6d83f54d1443	clients	t	f	f	2025-11-01 23:16:37.996	2025-11-01 23:16:37.996
3e3015b2-b6af-4249-a3bb-68c487cbc3f7	e51b6ae9-1bc3-47c3-97cb-6d83f54d1443	cases	t	f	f	2025-11-01 23:16:37.996	2025-11-01 23:16:37.996
95889b6a-549a-4ffd-8997-5b1d776cf464	df0bfcdf-b705-4ed6-99a8-43b9217b8b21	clients	t	t	f	2025-11-01 23:16:38.069	2025-11-01 23:16:38.069
013e0465-6c26-4fed-b95f-f0b9c9c77861	df0bfcdf-b705-4ed6-99a8-43b9217b8b21	cases	t	t	f	2025-11-01 23:16:38.069	2025-11-01 23:16:38.069
ddb199a5-c7c6-463b-8a91-83875beaecce	df0bfcdf-b705-4ed6-99a8-43b9217b8b21	financial	t	f	f	2025-11-01 23:16:38.069	2025-11-01 23:16:38.069
0eaf327d-7294-40aa-a102-4b1d4e462dea	3830d9f7-8030-4c03-8858-8a7ba96b2ecd	clients	t	t	t	2025-11-01 23:16:38.141	2025-11-01 23:16:38.141
929edaac-021c-4876-bb20-3a283c7ef463	3830d9f7-8030-4c03-8858-8a7ba96b2ecd	cases	t	t	t	2025-11-01 23:16:38.141	2025-11-01 23:16:38.141
61526180-4cb0-46d9-b513-1bdd46a76290	3830d9f7-8030-4c03-8858-8a7ba96b2ecd	financial	t	t	f	2025-11-01 23:16:38.141	2025-11-01 23:16:38.141
48409b90-129a-4705-9b5b-525da70b84f7	ee627ab2-c1e8-4910-af81-c8a567e4e0ee	cases	t	f	f	2025-11-01 23:16:38.219	2025-11-01 23:16:38.219
a90c14c2-a675-4acc-a006-7cabe84509e6	ee627ab2-c1e8-4910-af81-c8a567e4e0ee	financial	t	t	t	2025-11-01 23:16:38.219	2025-11-01 23:16:38.219
\.


--
-- Data for Name: schedule_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schedule_events (id, "companyId", title, description, type, date, "endDate", "clientId", "caseId", completed, "createdBy", "createdAt", "updatedAt", "googleMeetLink", priority) FROM stdin;
acad3b4a-c92e-4ae5-959c-7c9ee13145e2	c3b2daac-22f6-4e50-be65-c509990b0ada	Reuniao com Cliente		COMPROMISSO	2025-11-25 12:00:00	2025-11-25 13:00:00	\N	\N	f	58847a5a-e8e4-44e8-ba15-a6a691f52aba	2025-11-16 02:01:32.778	2025-11-16 02:01:38.693	\N	MEDIA
0bb8d0c3-39fb-4f0c-8ad3-d1800dec1eae	0df8d66c-8e50-4ffd-b74f-37b658932f5a	Reunião com Cliente 1	Discutir andamento do processo	COMPROMISSO	2024-11-20 10:00:00	2024-11-20 11:00:00	8829c021-024e-4d4e-b536-7fa721a38a7f	4cf58ed1-81f7-496e-96e9-f4a0adf32586	f	75b6ad8c-f7a6-47ae-ba9a-a88329565390	2025-11-16 02:35:20.818	2025-11-16 02:35:20.818	\N	MEDIA
e1a25c52-63ce-4737-aefe-58ae3c8220dc	0df8d66c-8e50-4ffd-b74f-37b658932f5a	Elaborar petição inicial	Processo do Cliente 2	TAREFA	2024-11-18 14:00:00	\N	e65cf2c2-da9b-4e4c-b802-ec6452fb6b4f	ba489fd7-6da9-46c0-9cb7-41c2607d1ac6	f	75b6ad8c-f7a6-47ae-ba9a-a88329565390	2025-11-16 02:35:20.821	2025-11-16 02:35:20.821	\N	MEDIA
9f202a8f-376c-4196-96e5-d1287b201cee	0df8d66c-8e50-4ffd-b74f-37b658932f5a	Prazo para contestação	Prazo de 15 dias corridos	PRAZO	2024-11-25 23:59:00	\N	8829c021-024e-4d4e-b536-7fa721a38a7f	4cf58ed1-81f7-496e-96e9-f4a0adf32586	f	75b6ad8c-f7a6-47ae-ba9a-a88329565390	2025-11-16 02:35:20.822	2025-11-16 02:35:20.822	\N	MEDIA
f37e2550-cd4f-4e4d-ab49-88218c5ac12c	0df8d66c-8e50-4ffd-b74f-37b658932f5a	Audiência de Conciliação	Fórum Central - Sala 302	AUDIENCIA	2024-12-10 09:00:00	2024-12-10 10:00:00	8a4dbba6-58cc-455d-87ea-53748d612682	d1bdb011-cb48-4fa7-a0d8-a624f2b052e4	f	75b6ad8c-f7a6-47ae-ba9a-a88329565390	2025-11-16 02:35:20.823	2025-11-16 02:35:20.823	\N	MEDIA
44ac1e83-5f84-485b-a23e-83fbe9f6e847	0df8d66c-8e50-4ffd-b74f-37b658932f5a	Reunião Google Meet - Estratégia Processual	Link: https://meet.google.com/abc-defg-hij\nDiscutir estratégia para recurso	GOOGLE_MEET	2024-11-22 15:00:00	2024-11-22 16:00:00	8829c021-024e-4d4e-b536-7fa721a38a7f	4cf58ed1-81f7-496e-96e9-f4a0adf32586	f	75b6ad8c-f7a6-47ae-ba9a-a88329565390	2025-11-16 02:35:20.824	2025-11-16 02:35:20.824	\N	MEDIA
19c77931-4687-4f34-bcd2-97137b065542	0df8d66c-8e50-4ffd-b74f-37b658932f5a	Reunião Google Meet - Teste Automático	Esta é uma reunião de teste para verificar a geração automática do link do Google Meet	GOOGLE_MEET	2024-11-25 10:00:00	2024-11-25 11:00:00	\N	\N	f	75b6ad8c-f7a6-47ae-ba9a-a88329565390	2025-11-16 02:55:18.847	2025-11-16 02:55:18.847	https://calendar.google.com/calendar/u/0/r/eventedit?text=Reuni%C3%A3o%20Google%20Meet%20-%20Teste%20Autom%C3%A1tico&dates=20241125T100000/20241125T110000&details=Esta%20%C3%A9%20uma%20reuni%C3%A3o%20de%20teste%20para%20verificar%20a%20gera%C3%A7%C3%A3o%20autom%C3%A1tica%20do%20link%20do%20Google%20Meet%0A%0AReuni%C3%A3o%20por%20Google%20Meet%20-%20Ap%C3%B3s%20criar%2C%20clique%20em%20%22Adicionar%20Google%20Meet%22%20para%20gerar%20o%20link.	MEDIA
6b1887b9-179e-47a1-8c8b-878cac1d0f30	0df8d66c-8e50-4ffd-b74f-37b658932f5a	Reuniao com Cliente	esta reuniao e um teste do aplicativo	GOOGLE_MEET	2025-12-21 14:00:00	2025-12-21 15:00:00	8829c021-024e-4d4e-b536-7fa721a38a7f	\N	f	75b6ad8c-f7a6-47ae-ba9a-a88329565390	2025-11-16 03:23:22.333	2025-11-16 03:23:22.333	https://calendar.google.com/calendar/u/0/r/eventedit?text=Reuniao%20com%20Cliente&dates=20251221T140000/20251221T150000&details=esta%20reuniao%20e%20um%20teste%20do%20aplicativo%0A%0AReuni%C3%A3o%20por%20Google%20Meet%20-%20Ap%C3%B3s%20criar%2C%20clique%20em%20%22Adicionar%20Google%20Meet%22%20para%20gerar%20o%20link.	MEDIA
00668427-9aae-47d6-9a72-1b4a833ec74f	4eef674f-b389-4757-bc9e-e950092eec89	Reunião - Teste	Teste	COMPROMISSO	2025-11-18 04:20:39	2025-11-18 05:20:39	\N	\N	f	9508bb44-2e01-4d08-9d29-f251a3574cd0	2025-11-16 04:20:40.011	2025-11-16 04:20:40.011	\N	MEDIA
82802ebc-d5a8-4508-bc9a-9a53c906a50f	4eef674f-b389-4757-bc9e-e950092eec89	Audiência - Teste	\N	AUDIENCIA	2025-11-26 04:20:40	2025-11-26 06:20:40	\N	\N	f	9508bb44-2e01-4d08-9d29-f251a3574cd0	2025-11-16 04:20:40.044	2025-11-16 04:20:40.044	\N	MEDIA
9f5505e6-9e7f-4ec6-b883-ff6ecb3cc057	4eef674f-b389-4757-bc9e-e950092eec89	Prazo - Teste	\N	PRAZO	2025-12-06 04:20:40	\N	\N	\N	f	9508bb44-2e01-4d08-9d29-f251a3574cd0	2025-11-16 04:20:40.075	2025-11-16 04:20:40.075	\N	MEDIA
7b9e07aa-7009-48fc-b9d5-77f0a85bb1cb	4eef674f-b389-4757-bc9e-e950092eec89	Reunião Online - Teste	\N	GOOGLE_MEET	2025-11-19 04:20:40	2025-11-19 05:20:40	\N	\N	f	9508bb44-2e01-4d08-9d29-f251a3574cd0	2025-11-16 04:20:40.107	2025-11-16 04:20:40.107	https://calendar.google.com/calendar/u/0/r/eventedit?text=Reuni%C3%A3o%20Online%20-%20Teste&dates=20251119T042000/20251119T052000&details=Reuni%C3%A3o%20por%20Google%20Meet%20-%20Ap%C3%B3s%20criar%2C%20clique%20em%20%22Adicionar%20Google%20Meet%22%20para%20gerar%20o%20link.	MEDIA
f96aebaf-0e14-40b2-9cc0-ebf2f1329511	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Audiência Teste		AUDIENCIA	2025-11-22 17:42:08.652	\N	7c479db8-3e5c-485d-ad8a-b5977da18a62	\N	f	4487d487-e82a-4191-be0d-1ce543aaf438	2025-11-21 17:42:08.66	2025-11-21 17:42:08.66	\N	MEDIA
a8c65ec0-e19c-4f26-a5ad-0c456ff47b4b	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Reunião com Cliente Maria	\N	COMPROMISSO	2025-11-28 18:37:41.883	\N	5bf2d041-9efe-4dfd-9a53-71b5b749827e	\N	f	4487d487-e82a-4191-be0d-1ce543aaf438	2025-11-21 18:37:41.899	2025-11-21 18:37:41.899	\N	MEDIA
d3e19fb6-cc93-4804-afc1-6b8e447b8420	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Google Meet - Análise de Caso	\N	GOOGLE_MEET	2025-11-28 18:37:41.883	\N	2fae4996-3c72-4169-902a-83f4ba173a96	\N	f	4487d487-e82a-4191-be0d-1ce543aaf438	2025-11-21 18:37:41.914	2025-11-21 18:37:41.914	https://calendar.google.com/calendar/u/0/r/eventedit?text=Google%20Meet%20-%20An%C3%A1lise%20de%20Caso&dates=20251128T183700/20251128T193700&details=Reuni%C3%A3o%20por%20Google%20Meet%20-%20Ap%C3%B3s%20criar%2C%20clique%20em%20%22Adicionar%20Google%20Meet%22%20para%20gerar%20o%20link.	MEDIA
d4209a1e-84c6-425f-9977-c244f148b1bf	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	REUN	ASS	COMPROMISSO	2025-11-21 12:16:00	2025-11-21 13:16:00	959d1015-35d5-4774-b7fd-c8a16b093a9a	\N	t	4487d487-e82a-4191-be0d-1ce543aaf438	2025-11-21 17:17:08.876	2025-11-22 18:29:51.708	\N	MEDIA
992d270f-1273-4d7f-ad8a-0475230dfe5c	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Reuniao	conferencia com cliente	GOOGLE_MEET	2025-11-24 13:00:00	2025-11-24 14:00:00	9d128c6c-598b-4a17-8dcc-2b305a87fe79	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	f	4487d487-e82a-4191-be0d-1ce543aaf438	2025-11-22 18:34:47.892	2025-11-22 18:34:47.892	https://calendar.google.com/calendar/u/0/r/eventedit?text=Reuniao&dates=20251124T130000/20251124T140000&details=conferencia%20com%20cliente%0A%0AReuni%C3%A3o%20por%20Google%20Meet%20-%20Ap%C3%B3s%20criar%2C%20clique%20em%20%22Adicionar%20Google%20Meet%22%20para%20gerar%20o%20link.	MEDIA
117ab686-7bef-425e-a2f4-aef6d9076cd2	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Tarefa de Teste - Criada pelo Sistema	Esta é uma tarefa criada automaticamente. Você pode editar ou excluir para testar.	TAREFA	2025-11-25 07:51:15.57	\N	\N	\N	f	4dc40a36-3e78-4644-abcc-7274625ddb2d	2025-11-23 07:51:15.57	2025-11-23 07:51:15.57	\N	MEDIA
b080bb90-9239-4db0-88e7-b5e0781d319e	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Revisar petição inicial	Revisar petição antes de protocolar	TAREFA	2025-11-25 00:00:00	\N	dc967571-b132-4d1e-9e7b-fc7de7f3fdc2	ddb641d4-63cb-4949-82ea-b3a3e67bedd2	f	4487d487-e82a-4191-be0d-1ce543aaf438	2025-11-21 18:37:41.923	2025-11-23 07:53:26.611	\N	MEDIA
6b27079e-3372-4176-bfc9-ed367630a893	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	minha tar	vcv	TAREFA	2025-11-25 00:00:00	\N	\N	\N	f	4487d487-e82a-4191-be0d-1ce543aaf438	2025-11-23 07:53:41.513	2025-11-23 07:53:41.513	\N	MEDIA
f58374ce-aa80-4bbf-8f5d-fb1543b0cbda	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Atualizar cliente sobre andamento		TAREFA	2025-11-23 18:57:58.114	\N	5bf2d041-9efe-4dfd-9a53-71b5b749827e	\N	f	4487d487-e82a-4191-be0d-1ce543aaf438	2025-11-21 18:37:41.939	2025-11-23 18:57:58.264	\N	MEDIA
\.


--
-- Data for Name: smtp_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.smtp_configs (id, "companyId", host, port, "user", password, "fromEmail", "fromName", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: system_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_config (id, key, value, "createdAt", "updatedAt") FROM stdin;
94481422-ec74-4764-8c39-df19dd0dba85	smtp_enabled	true	2025-11-01 23:16:39.419	2025-11-01 23:16:39.419
3d97094b-6e47-4e4b-82d9-d5987ac2ed8b	datajud_sync_enabled	true	2025-11-01 23:16:39.42	2025-11-01 23:16:39.42
e0a8b1ef-b14e-4f54-a68d-df1ac6806cc4	max_upload_size_mb	50	2025-11-01 23:16:39.421	2025-11-01 23:16:39.421
4814cfa2-18b4-4455-9d69-5c316250b533	session_timeout_minutes	120	2025-11-01 23:16:39.421	2025-11-01 23:16:39.421
d5df1743-444a-4d4c-904e-009e34331695	system_version	1.0.0	2025-11-01 23:16:39.422	2025-11-01 23:16:39.422
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, "companyId", name, email, password, role, active, "resetToken", "resetTokenExpiry", "createdAt", "updatedAt", "emailVerified", "emailVerificationToken", "emailVerificationExpiry", "failedLoginAttempts", "lastFailedLoginAt", "accountLockedUntil", phone, mobile, "birthDate", "profilePhoto", "profilePhotoUrl") FROM stdin;
4dc40a36-3e78-4644-abcc-7274625ddb2d	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Teste Chatwoot	teste.chatwoot@advwell.pro	$2a$10$1hbA/yJJEuoWCPHCj7qQpOzSPA2VBpiwmoRnRNrGD5qwGOHKMK2j2	ADMIN	t	\N	\N	2025-11-08 00:40:48.712	2025-11-08 00:41:00.971	t	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
9c157dd1-c634-4e94-a72b-2755580ccc7e	ce9de189-53e7-47a6-93d3-68c97a6a1b3b	Tom	we@gmail.com	$2a$10$FgE5uC2oGiNZ8THeI/3ZU.bm9GmYP9LEa6NBYs0OOJCEYmIyjBvAK	ADMIN	t	\N	\N	2025-11-13 22:27:25.474	2025-11-13 22:27:25.474	f	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzZXQiLCJpYXQiOjE3NjMwNzI4NDUsImV4cCI6MTc2MzA3NjQ0NX0.QfXC6-SvHSxkqDmcow19SxBQy2xq7JZBScXpSh5DH-4	2025-11-14 22:27:25.467	0	\N	\N	\N	\N	\N	\N	\N
de421d34-519e-479c-9d02-cf3f2aaec511	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Usuario Teste 1	usuarionovo1@teste.com	$2a$12$opDDCMdpSczJVkRspd3bGOTSobe.lNhKJ82j.2zovMrAT0OId2ogC	USER	t	\N	\N	2025-11-15 03:43:23.086	2025-11-15 03:43:23.086	f	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
9e69afe8-b5bb-482b-af16-bbc7a4c033be	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Usuario Teste 2	usuarionovo2@teste.com	$2a$12$3adyNARFv3BPkOMOt6V2c.xaNeBQm8.PSxJ7LJiQjNnXMvsPZWjBS	USER	t	\N	\N	2025-11-15 03:43:23.421	2025-11-15 03:43:23.421	f	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
670b0298-7b4e-478a-a7e2-685c51093581	08572024-a309-49a2-b885-82276f1c5c09	Administrador - Mendes	admin@mendespereira.com.br	$2b$10$EQ6Djf2jEj8SXqTJ2VSsOuOlHiuEHiN5Kq9QbkwSbDua1wopA7rUK	ADMIN	t	\N	\N	2025-11-01 23:16:37.924	2025-11-01 23:16:37.924	t	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
ca2cd4c3-b59c-40e9-865b-7ce14c9a7b4c	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Ana Silva Santos	user1@costaassociados.adv.br	$2a$10$yf8W1hY8h9Dpbj5/gJX.VepmRtg/2daRnBAlgMj9P/tdlZgsuowku	USER	t	\N	\N	2025-11-01 23:16:37.634	2025-11-01 23:16:37.634	t	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
e9fbbd88-d4b2-400f-80cb-f05c697adf70	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Carlos Eduardo Oliveira	user2@costaassociados.adv.br	$2a$10$YHp7LXazTOUoolxHgMgxHu8WjVAUyGLxaRdNC0L5Npox9jtRyEdKO	USER	t	\N	\N	2025-11-01 23:16:37.707	2025-11-01 23:16:37.707	t	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
41f0bb89-88d7-4ad7-afed-38ba611bf0fb	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Mariana Costa Ferreira	user3@costaassociados.adv.br	$2a$10$RXFzrjr.VwgSZIlqblhCwes1lSgvgRBg.4M4gBp9BI0DDdjfxTRHO	USER	t	\N	\N	2025-11-01 23:16:37.779	2025-11-01 23:16:37.779	t	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
96340535-acb9-463e-a2b8-ffc62b0b2230	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Pedro Henrique Almeida	user4@costaassociados.adv.br	$2a$10$QepBUnceq0cYUeurlPyhWuCuALNU8OppI/QTnbEbF2Wy3CxOVvNiS	USER	t	\N	\N	2025-11-01 23:16:37.852	2025-11-01 23:16:37.852	t	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
e51b6ae9-1bc3-47c3-97cb-6d83f54d1443	08572024-a309-49a2-b885-82276f1c5c09	Ana Silva Santos	user1@mendespereira.com.br	$2a$10$08eGB4Ol1bvmk0NVtQLhxOwmC4wlL258PkWtrODfGUmX9s.zxOR82	USER	t	\N	\N	2025-11-01 23:16:37.996	2025-11-01 23:16:37.996	t	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
df0bfcdf-b705-4ed6-99a8-43b9217b8b21	08572024-a309-49a2-b885-82276f1c5c09	Carlos Eduardo Oliveira	user2@mendespereira.com.br	$2a$10$r.YwjBjWLHHjZYp7r4HEYOPzzOLciTs63EKzHnm8fxI77e3B.x2we	USER	t	\N	\N	2025-11-01 23:16:38.069	2025-11-01 23:16:38.069	t	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
3830d9f7-8030-4c03-8858-8a7ba96b2ecd	08572024-a309-49a2-b885-82276f1c5c09	Mariana Costa Ferreira	user3@mendespereira.com.br	$2a$10$cGfi0EecErqMAQtVqcQPIu6Sw/zyDQ3lLhSqBjPyznxOKEb0MV.Se	USER	t	\N	\N	2025-11-01 23:16:38.141	2025-11-01 23:16:38.141	t	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
ee627ab2-c1e8-4910-af81-c8a567e4e0ee	08572024-a309-49a2-b885-82276f1c5c09	Pedro Henrique Almeida	user4@mendespereira.com.br	$2a$10$Ydwg4zS2zBOn2yyabQVVzOcGVl54PNEcEDn8uQpT.DBXqtQtCUBM2	USER	t	\N	\N	2025-11-01 23:16:38.219	2025-11-01 23:16:38.219	t	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
5559bf86-3214-468b-8583-0b57e2288d44	cdab847f-a4c6-42f8-a8e4-8d8f43201cb2	Rodrigo	adv@gmail.com	$2a$10$Myveh5GJwtuH2HskfK9aIuBas8oLaDAbjbhO8e35D8RslXRurDbdm	ADMIN	t	\N	\N	2025-11-04 19:28:23.563	2025-11-04 19:28:23.563	t	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
685eae64-3642-4b1b-a4a6-31e3ed1ce2e2	8def413f-b55a-46e3-9db8-758fcdcd879a	Test Upload	testupload1762294163@example.com	$2a$10$DPDshPxtamMH5Tl9mWl8oepVmkwZAIOSW5NZkQJ19g3p0ngaCLLzK	ADMIN	t	\N	\N	2025-11-04 22:09:23.319	2025-11-04 22:09:23.319	t	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzZXQiLCJpYXQiOjE3NjIyOTQxNjMsImV4cCI6MTc2MjI5Nzc2M30.omg9lWypmwJ7pcLVJdTtF5cQfh1Q1Qgl3lQwuRwUUh4	2025-11-05 22:09:23.315	0	\N	\N	\N	\N	\N	\N	\N
d37f2103-8685-4739-a309-c36f69e29cb8	d719db14-5c49-4526-a851-6db07ed39f22	leo	w@gmail.com	$2a$10$84Z2NYHiOVCAIcbjPU3W6.1KfeNzviFIMXkQlPOi0RhW1VcPXKgu2	USER	t	\N	\N	2025-11-07 01:56:40.427	2025-11-07 01:56:40.427	f	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
0927c7fa-70db-4581-a621-cfb5bcafcbd7	256ad0d5-a35c-44d1-a1f4-f1e359999181	Test User	test1762288678@example.com	$2a$10$MEpQ5whbpMiQwB3VpoOJzOkAF9rbsMG9ZF6wwpr/GonNbUsFlhLKa	ADMIN	t	\N	\N	2025-11-04 20:37:58.581	2025-11-04 20:37:58.581	f	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzZXQiLCJpYXQiOjE3NjIyODg2NzgsImV4cCI6MTc2MjI5MjI3OH0.TbTwPOoE4LPNXphNhMh3zieP6yo9xuA81gI21wDiA-s	2025-11-05 20:37:58.578	0	\N	\N	\N	\N	\N	\N	\N
fe8c5ef6-1118-45ec-a21a-351d26c5d4bf	34136ba3-53d6-47b1-ac5b-001d9f8d9584	Test User	test1762288688@example.com	$2a$10$xDDl4zAvYZLDh/xxXClwDucC1heqLTgduy9D5AoyHDA5ZGBAEF5L.	ADMIN	t	\N	\N	2025-11-04 20:38:08.911	2025-11-04 20:38:08.911	f	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzZXQiLCJpYXQiOjE3NjIyODg2ODgsImV4cCI6MTc2MjI5MjI4OH0.ZLqJ2A-sXUlrldSrji6EpM83TXD93mlVzb10BwvBsnA	2025-11-05 20:38:08.908	0	\N	\N	\N	\N	\N	\N	\N
458894ab-ca63-4e80-963c-e887ddd5e9f3	2c752818-b9ff-4fe4-a819-cf6f08d58ecc	Debug Test	testdebug1762288816@example.com	$2a$10$gokANMry/KTvBibSl7yAhOuWqmKTtxA2g5ZuZ2npgk8IgR518yvV.	ADMIN	t	\N	\N	2025-11-04 20:40:16.27	2025-11-04 20:40:16.27	f	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzZXQiLCJpYXQiOjE3NjIyODg4MTYsImV4cCI6MTc2MjI5MjQxNn0.eJbA93PPweh44xmVtRoupg_5QbsYvPm5jw4jVwNh0Cg	2025-11-05 20:40:16.266	0	\N	\N	\N	\N	\N	\N	\N
2945da43-4e9c-48e6-a83f-376539300720	f76b195f-56f7-4bb1-be06-0451e507a6f4	Test Real Email	appadvwell+test1762288848@gmail.com	$2a$10$/uCE6j0AZWVeqw.g9jT6IO4ezuXwiWGwTia8y9l.51KJFsUkFgkYC	ADMIN	t	\N	\N	2025-11-04 20:40:48.736	2025-11-04 20:40:48.736	f	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzZXQiLCJpYXQiOjE3NjIyODg4NDgsImV4cCI6MTc2MjI5MjQ0OH0.VeafYMH34Pl_WKS5oOxtPW4oYodMMbbI9YdBY4E3rrI	2025-11-05 20:40:48.733	0	\N	\N	\N	\N	\N	\N	\N
b56293f8-9e46-412f-90a6-5187795f7bd5	9cbae4e7-10b4-4df8-85e8-9b6973e21d02	Well Brito	chatwellpro@gmail.com	$2a$10$51t8aKoX/qM.SHlaEtqEReeorgncSZikdmOmPAOTiT.vX0NcTGZVq	ADMIN	t	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzZXQiLCJpYXQiOjE3NjIyODgyOTYsImV4cCI6MTc2MjI5MTg5Nn0.PwWE_fFD1mEIxN4OqmL2JqhwgEZMc_yrdjyT_tLt2nY	2025-11-04 21:31:36.554	2025-11-04 20:30:04.797	2025-11-04 20:52:39.448	t	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
52fcb26d-6842-4c16-a353-bf9f065e84d9	09fb2517-f437-4abb-870f-6cd294e3c93b	Test Upload	testupload1762295161@example.com	$2a$10$gy6fZlPZTPn4qX6SLFXKP.v.z/14CtSuT9ZnTLilqwXg8LzEczQFa	ADMIN	t	\N	\N	2025-11-04 22:26:01.554	2025-11-04 22:26:01.554	t	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzZXQiLCJpYXQiOjE3NjIyOTUxNjEsImV4cCI6MTc2MjI5ODc2MX0.qnXAUqq_fyHRJrpYxHRLdYigPMheDJtrY0N0LqnGgDo	2025-11-05 22:26:01.55	0	\N	\N	\N	\N	\N	\N	\N
9da7aeb5-f862-403d-90b3-df9df5368806	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Teste Validação	teste.validacao@example.com	$2a$10$Rz.YTqpivcjFnajcWjRBx.EbLrwrdkRPSCXFXsPN1qdBkRKZzYWta	ADMIN	t	\N	\N	2025-11-15 02:21:52.251	2025-11-15 03:04:22.395	t	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzZXQiLCJpYXQiOjE3NjMxNzMzMTIsImV4cCI6MTc2MzE3NjkxMn0.UXptFLPL15dl_A2N0Rq2kfg8aT1N3_bK5hL00szcons	2025-11-16 02:21:52.247	0	2025-11-15 03:04:22.394	\N	\N	\N	\N	\N	\N
53404120-8284-4de5-88e5-3df9b9a48aef	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Usuário Teste Completo	usuario.teste.1763176326@example.com	$2a$12$eWExKNLr6MSOo6n47VqSeO5efH.RI7vSFS/AL.lmgfJigvCHVo2Aa	USER	t	\N	\N	2025-11-15 03:12:06.663	2025-11-15 03:12:06.663	f	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
dac0fea4-9528-41fb-807b-6750bfc6dcb8	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Usuário Teste Completo	usuario.teste.1763176391@example.com	$2a$12$QSIFd.5QVJgonXRcNQsjsup/4.MIR0kMlcko9OgcmKKND8Ct96XIK	USER	t	\N	\N	2025-11-15 03:13:11.651	2025-11-15 03:13:11.651	f	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
5c380e5c-dace-41b7-b1ad-7e98ef656fbf	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Usuário Teste Final	usuario.final.1763176457@example.com	$2a$12$7lD8fjI4Ux/0Fp080esz/u11K20l9kAIweMPxU/eDAdBRttr8Wfza	USER	t	\N	\N	2025-11-15 03:14:17.833	2025-11-15 03:14:17.833	f	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
58847a5a-e8e4-44e8-ba15-a6a691f52aba	c3b2daac-22f6-4e50-be65-c509990b0ada	Super Administrator	wasolutionscorp@gmail.com	$2b$10$gREiu.w4LhJBX2Wkd4E.0.VJd/Xtm2epGqzk6M51kiA6W3bmy6Pp2	SUPER_ADMIN	t	\N	\N	2025-11-01 23:16:37.111	2025-11-23 00:05:29.19	t	\N	\N	5	2025-11-23 00:05:29.189	2025-11-23 00:20:29.189	\N	\N	\N	\N	\N
e01bad66-b42b-4c66-91e1-a55c79e87725	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Usuario Teste 3	usuarionovo3@teste.com	$2a$12$iHWanDOnBJZOxjL6xv2gBegBOiDcqFAvQc/7LkoWiVXQ2vzDya80.	USER	t	\N	\N	2025-11-15 03:43:23.74	2025-11-15 03:43:23.74	f	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
4abcf9b7-7e2c-4a26-96ab-ecd2de61f46c	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Usuario Teste 4	usuarionovo4@teste.com	$2a$12$E5aTw8SBfmZIvCTBqt6E/.VbdbHYWOYmZKx/6r5JciiX59SxyVyLS	USER	t	\N	\N	2025-11-15 03:43:24.062	2025-11-15 03:43:24.062	f	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
ed647f48-1868-41d4-af70-f3147b041b07	b72b72ed-96a9-47c6-b2d7-4bb2c0905b55	Usuario Teste 5	usuarionovo5@teste.com	$2a$12$X2mOBkc2QK6D4JiBiGfEJeWB6KEbBdR3L8RzwS1R0zFTGWNNvj9sa	USER	t	\N	\N	2025-11-15 03:43:24.38	2025-11-15 03:43:24.38	f	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
8d9a38ad-ed78-4489-aa14-91ecd5fb2a38	0df8d66c-8e50-4ffd-b74f-37b658932f5a	Usuário Teste	usuario@advwell.pro	$2a$12$raizdqtbj7xXPGoe6qYr8u1csJ8tnwUwA5YCNTyV6gfmNqfIfoQrC	USER	t	\N	\N	2025-11-16 02:35:20.796	2025-11-16 02:35:20.796	f	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
75b6ad8c-f7a6-47ae-ba9a-a88329565390	0df8d66c-8e50-4ffd-b74f-37b658932f5a	Admin Teste	admin@advwell.pro	$2a$12$5OAf3frMBAiwd9wAEvoQ/eMtMKFisk3FikFkU5s6wI8JHkvJzlKhO	ADMIN	t	\N	\N	2025-11-16 02:35:20.513	2025-11-16 02:35:20.513	t	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
9508bb44-2e01-4d08-9d29-f251a3574cd0	4eef674f-b389-4757-bc9e-e950092eec89	Teste Sistema Completo	teste.sistema.completo@advwell.test	$2a$12$/ircXMIfOMv9dFfUPa0tSO2vJhAUimuczCnI2Qjn7EglW0R8peXdK	ADMIN	t	\N	\N	2025-11-16 04:18:45.097	2025-11-16 14:19:00.57	t	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzZXQiLCJpYXQiOjE3NjMyNjY3MjUsImV4cCI6MTc2MzI3MDMyNX0.5lNUis8bsajayEayqNsGZGWqvfg1UdEuw9cUrgWqdOk	2025-11-17 04:18:45.092	3	2025-11-16 14:19:00.569	\N	\N	\N	\N	\N	\N
1e494790-fd7c-4e27-98d2-5b10cf5e2c6a	b5820aeb-d0dd-47ca-8b79-c253614a61bb	Well Brito	euwrbrito@gmail.com	$2b$10$EQ6Djf2jEj8SXqTJ2VSsOuOlHiuEHiN5Kq9QbkwSbDua1wopA7rUK	ADMIN	t	\N	\N	2025-11-04 20:13:47.18	2025-11-04 20:13:47.18	f	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVzZXQiLCJpYXQiOjE3NjIyODcyMjcsImV4cCI6MTc2MjI5MDgyN30.HVZ6TN24hG70t2eAgXQPmukkajYDygdo-Ck6qkjTy3s	2025-11-05 20:13:47.175	0	\N	\N	\N	\N	\N	\N	\N
9e18c37c-cccc-4301-94f3-bd931f5ad443	d719db14-5c49-4526-a851-6db07ed39f22	Super Admin - AdvWell	appadvwell@gmail.com	$2b$10$IIwzGyqIpOPcgGAredkSJengpDqWLKl2Os94C1japDJWm5pOAyYGW	SUPER_ADMIN	t	\N	\N	2025-11-03 19:56:14.353	2025-11-22 18:14:09.451	t	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
4487d487-e82a-4191-be0d-1ce543aaf438	ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544	Administrador - Costa	admin@costaassociados.adv.br	$2b$10$1wP6O6PwWocpIeSV61CJIuX545WFwnUOYJajBoPM0O9aWD/uPpSMu	ADMIN	t	\N	\N	2025-11-01 23:16:37.563	2025-11-23 07:54:47.858	t	\N	\N	0	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: accounts_payable accounts_payable_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT accounts_payable_pkey PRIMARY KEY (id);


--
-- Name: ai_configs ai_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_configs
    ADD CONSTRAINT ai_configs_pkey PRIMARY KEY (id);


--
-- Name: campaign_recipients campaign_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_recipients
    ADD CONSTRAINT campaign_recipients_pkey PRIMARY KEY (id);


--
-- Name: case_documents case_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.case_documents
    ADD CONSTRAINT case_documents_pkey PRIMARY KEY (id);


--
-- Name: case_movements case_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.case_movements
    ADD CONSTRAINT case_movements_pkey PRIMARY KEY (id);


--
-- Name: case_parts case_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.case_parts
    ADD CONSTRAINT case_parts_pkey PRIMARY KEY (id);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: companies companies_apiKey_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT "companies_apiKey_key" UNIQUE ("apiKey");


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: email_campaigns email_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_campaigns
    ADD CONSTRAINT email_campaigns_pkey PRIMARY KEY (id);


--
-- Name: event_assignments event_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_assignments
    ADD CONSTRAINT event_assignments_pkey PRIMARY KEY (id);


--
-- Name: financial_transactions financial_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_transactions
    ADD CONSTRAINT financial_transactions_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: schedule_events schedule_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_events
    ADD CONSTRAINT schedule_events_pkey PRIMARY KEY (id);


--
-- Name: smtp_configs smtp_configs_company_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.smtp_configs
    ADD CONSTRAINT smtp_configs_company_unique UNIQUE ("companyId");


--
-- Name: smtp_configs smtp_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.smtp_configs
    ADD CONSTRAINT smtp_configs_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: accounts_payable_companyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "accounts_payable_companyId_idx" ON public.accounts_payable USING btree ("companyId");


--
-- Name: accounts_payable_createdBy_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "accounts_payable_createdBy_idx" ON public.accounts_payable USING btree ("createdBy");


--
-- Name: accounts_payable_dueDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "accounts_payable_dueDate_idx" ON public.accounts_payable USING btree ("dueDate");


--
-- Name: accounts_payable_isRecurring_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "accounts_payable_isRecurring_idx" ON public.accounts_payable USING btree ("isRecurring");


--
-- Name: accounts_payable_parentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "accounts_payable_parentId_idx" ON public.accounts_payable USING btree ("parentId");


--
-- Name: accounts_payable_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_payable_status_idx ON public.accounts_payable USING btree (status);


--
-- Name: ai_configs_companyId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ai_configs_companyId_key" ON public.ai_configs USING btree ("companyId");


--
-- Name: campaigns_company_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX campaigns_company_idx ON public.email_campaigns USING btree ("companyId");


--
-- Name: campaigns_created_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX campaigns_created_by_idx ON public.email_campaigns USING btree ("createdBy");


--
-- Name: campaigns_scheduled_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX campaigns_scheduled_idx ON public.email_campaigns USING btree ("scheduledAt");


--
-- Name: campaigns_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX campaigns_status_idx ON public.email_campaigns USING btree (status);


--
-- Name: cases_processNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "cases_processNumber_key" ON public.cases USING btree ("processNumber");


--
-- Name: cases_updates_pending_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cases_updates_pending_idx ON public.cases USING btree ("lastSyncedAt", "lastAcknowledgedAt") WHERE ("lastSyncedAt" IS NOT NULL);


--
-- Name: companies_cnpj_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX companies_cnpj_key ON public.companies USING btree (cnpj);


--
-- Name: companies_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX companies_email_key ON public.companies USING btree (email);


--
-- Name: event_assignments_eventId_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "event_assignments_eventId_userId_key" ON public.event_assignments USING btree ("eventId", "userId");


--
-- Name: idx_clients_tag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_tag ON public.clients USING btree (tag);


--
-- Name: idx_schedule_events_caseid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schedule_events_caseid ON public.schedule_events USING btree ("caseId");


--
-- Name: idx_schedule_events_clientid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schedule_events_clientid ON public.schedule_events USING btree ("clientId");


--
-- Name: idx_schedule_events_companyid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schedule_events_companyid ON public.schedule_events USING btree ("companyId");


--
-- Name: idx_schedule_events_completed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schedule_events_completed ON public.schedule_events USING btree (completed);


--
-- Name: idx_schedule_events_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schedule_events_date ON public.schedule_events USING btree (date);


--
-- Name: idx_schedule_events_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schedule_events_type ON public.schedule_events USING btree (type);


--
-- Name: permissions_userId_resource_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "permissions_userId_resource_key" ON public.permissions USING btree ("userId", resource);


--
-- Name: recipients_campaign_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX recipients_campaign_email_idx ON public.campaign_recipients USING btree ("campaignId", "recipientEmail");


--
-- Name: recipients_campaign_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX recipients_campaign_idx ON public.campaign_recipients USING btree ("campaignId");


--
-- Name: recipients_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX recipients_email_idx ON public.campaign_recipients USING btree ("recipientEmail");


--
-- Name: recipients_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX recipients_status_idx ON public.campaign_recipients USING btree (status);


--
-- Name: smtp_configs_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX smtp_configs_active_idx ON public.smtp_configs USING btree ("isActive");


--
-- Name: smtp_configs_company_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX smtp_configs_company_idx ON public.smtp_configs USING btree ("companyId");


--
-- Name: system_config_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX system_config_key_key ON public.system_config USING btree (key);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: accounts_payable accounts_payable_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT "accounts_payable_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accounts_payable accounts_payable_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT "accounts_payable_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ai_configs ai_configs_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_configs
    ADD CONSTRAINT "ai_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: campaign_recipients campaign_recipients_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_recipients
    ADD CONSTRAINT "campaign_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public.email_campaigns(id) ON DELETE CASCADE;


--
-- Name: case_documents case_documents_caseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.case_documents
    ADD CONSTRAINT "case_documents_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public.cases(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: case_movements case_movements_caseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.case_movements
    ADD CONSTRAINT "case_movements_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public.cases(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: case_parts case_parts_caseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.case_parts
    ADD CONSTRAINT "case_parts_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public.cases(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cases cases_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT "cases_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cases cases_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT "cases_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: clients clients_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "clients_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: documents documents_caseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT "documents_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public.cases(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: documents documents_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT "documents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: documents documents_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT "documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: documents documents_uploadedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT "documents_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: email_campaigns email_campaigns_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_campaigns
    ADD CONSTRAINT "email_campaigns_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: email_campaigns email_campaigns_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_campaigns
    ADD CONSTRAINT "email_campaigns_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: event_assignments event_assignments_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_assignments
    ADD CONSTRAINT "event_assignments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public.schedule_events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: event_assignments event_assignments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_assignments
    ADD CONSTRAINT "event_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: financial_transactions financial_transactions_caseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_transactions
    ADD CONSTRAINT "financial_transactions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public.cases(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: financial_transactions financial_transactions_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_transactions
    ADD CONSTRAINT "financial_transactions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: financial_transactions financial_transactions_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_transactions
    ADD CONSTRAINT "financial_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: permissions permissions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT "permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: schedule_events schedule_events_caseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_events
    ADD CONSTRAINT "schedule_events_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public.cases(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: schedule_events schedule_events_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_events
    ADD CONSTRAINT "schedule_events_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: schedule_events schedule_events_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_events
    ADD CONSTRAINT "schedule_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: schedule_events schedule_events_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_events
    ADD CONSTRAINT "schedule_events_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: smtp_configs smtp_configs_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.smtp_configs
    ADD CONSTRAINT "smtp_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: users users_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict FTepCpsgxV7CmQLtzZw8WS7iOYa9xb7W05PRwqHa1eIUJwTinmHlGkgtBjJ1FSC

