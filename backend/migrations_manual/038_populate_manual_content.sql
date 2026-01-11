-- Migration: Populate Manual Content
-- Date: 2026-01-11
-- Description: Inserir conteudo completo do manual para todas as abas do AdvWell

-- ============================================================================
-- LIMPAR CONTEUDO EXISTENTE
-- ============================================================================
DELETE FROM "ManualFAQ";
DELETE FROM "ManualArticle";
DELETE FROM "ManualCategory";

-- ============================================================================
-- CATEGORIAS
-- ============================================================================
INSERT INTO "ManualCategory" ("name", "slug", "description", "icon", "order", "active") VALUES
('Inicio Rapido', 'inicio-rapido', 'Guia rapido para comecar a usar o AdvWell', 'Rocket', 1, true),
('Agenda', 'agenda', 'Gerenciamento de compromissos, tarefas e audiencias', 'Calendar', 2, true),
('Pessoas', 'pessoas', 'Gestao de clientes, adversos, advogados e usuarios', 'Users', 3, true),
('Processos', 'processos', 'Gerenciamento de processos judiciais e nao judiciais', 'Scale', 4, true),
('Financeiro', 'financeiro', 'Controle financeiro, contas e assinaturas', 'DollarSign', 5, true),
('Marketing', 'marketing', 'Gestao de leads, campanhas e analytics', 'BarChart3', 6, true),
('Documentos', 'documentos', 'Geracao e upload de documentos', 'FileText', 7, true),
('Integracoes', 'integracoes', 'Configuracao de integracoes externas', 'Settings', 8, true),
('Administracao', 'administracao', 'Configuracoes administrativas e de seguranca', 'Shield', 9, true);

-- ============================================================================
-- ARTIGOS - INICIO RAPIDO
-- ============================================================================
INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Bem-vindo ao AdvWell', 'bem-vindo', 'Visao geral do sistema e primeiros passos', '
<h2>Bem-vindo ao AdvWell!</h2>
<p>O AdvWell e um sistema completo de gestao para escritorios de advocacia, desenvolvido para otimizar seu dia a dia e aumentar a produtividade.</p>

<h3>Principais Funcionalidades</h3>
<ul>
  <li><strong>Gestao de Processos:</strong> Acompanhe processos judiciais e nao judiciais com integracao DataJud</li>
  <li><strong>Agenda Integrada:</strong> Compromissos, tarefas, audiencias e prazos em um so lugar</li>
  <li><strong>Controle Financeiro:</strong> Gerencie honorarios, contas a pagar e fluxo de caixa</li>
  <li><strong>Gestao de Clientes:</strong> Cadastro completo com portal de acesso para clientes</li>
  <li><strong>Monitoramento Automatico:</strong> Receba alertas de publicacoes via Diario Oficial</li>
</ul>

<h3>Navegacao</h3>
<p>O menu lateral organiza todas as funcionalidades em grupos:</p>
<ul>
  <li><strong>Dashboard:</strong> Visao geral com indicadores importantes</li>
  <li><strong>Agenda:</strong> Agendamentos, tarefas, audiencias</li>
  <li><strong>Pessoas:</strong> Clientes, adversos, advogados, usuarios</li>
  <li><strong>Processos:</strong> Judiciais, PNJ, prazos, monitoramento</li>
  <li><strong>Financeiro:</strong> Fluxo de caixa, contas a pagar</li>
  <li><strong>Marketing:</strong> Leads, campanhas, analytics</li>
</ul>

<h3>Dica Rapida</h3>
<p>Use o icone de menu no topo para recolher a barra lateral e ter mais espaco de trabalho.</p>
', 1, true
FROM "ManualCategory" WHERE slug = 'inicio-rapido';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Dashboard - Visao Geral', 'dashboard', 'Entenda os indicadores e graficos do Dashboard', '
<h2>Dashboard</h2>
<p>O Dashboard e sua pagina inicial e oferece uma visao consolidada das informacoes mais importantes do escritorio.</p>

<h3>Cards de Indicadores</h3>
<ul>
  <li><strong>Processos Ativos:</strong> Total de processos em andamento</li>
  <li><strong>Clientes:</strong> Numero total de clientes cadastrados</li>
  <li><strong>Tarefas Pendentes:</strong> Tarefas que precisam de atencao</li>
  <li><strong>Contas a Vencer:</strong> Valores a receber proximos do vencimento</li>
</ul>

<h3>Graficos</h3>
<ul>
  <li><strong>Processos por Status:</strong> Distribuicao dos processos por situacao</li>
  <li><strong>Fluxo Financeiro:</strong> Entradas e saidas do mes</li>
  <li><strong>Timeline de Atividades:</strong> Ultimas movimentacoes importantes</li>
</ul>

<h3>Alertas e Notificacoes</h3>
<p>O Dashboard exibe alertas importantes como:</p>
<ul>
  <li>Prazos vencendo hoje</li>
  <li>Audiencias agendadas</li>
  <li>Contas a pagar vencidas</li>
  <li>Novas publicacoes encontradas</li>
</ul>
', 2, true
FROM "ManualCategory" WHERE slug = 'inicio-rapido';

-- ============================================================================
-- ARTIGOS - AGENDA
-- ============================================================================
INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Agendamentos', 'agendamentos', 'Como gerenciar compromissos e eventos na agenda', '
<h2>Agendamentos</h2>
<p>A aba Agendamentos permite visualizar e gerenciar todos os seus compromissos em formato de calendario.</p>

<h3>Visualizacoes Disponiveis</h3>
<ul>
  <li><strong>Mes:</strong> Visao mensal do calendario</li>
  <li><strong>Semana:</strong> Visao semanal detalhada</li>
  <li><strong>Dia:</strong> Agenda do dia com horarios</li>
  <li><strong>Lista:</strong> Eventos em formato de lista</li>
</ul>

<h3>Tipos de Eventos</h3>
<ul>
  <li><strong>Compromisso:</strong> Reunioes, atendimentos</li>
  <li><strong>Prazo:</strong> Prazos processuais (sincronizado com processos)</li>
  <li><strong>Audiencia:</strong> Audiencias judiciais</li>
  <li><strong>Tarefa:</strong> Tarefas a fazer</li>
  <li><strong>Pericia:</strong> Pericias agendadas</li>
  <li><strong>Google Meet:</strong> Reunioes online</li>
</ul>

<h3>Criar Novo Evento</h3>
<ol>
  <li>Clique no botao <strong>"+ Novo Evento"</strong></li>
  <li>Preencha titulo, data, hora e tipo</li>
  <li>Opcionalmente, vincule a um processo ou cliente</li>
  <li>Defina a prioridade (baixa, media, alta)</li>
  <li>Clique em <strong>"Salvar"</strong></li>
</ol>
', 1, true
FROM "ManualCategory" WHERE slug = 'agenda';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Tarefas', 'tarefas', 'Gerenciamento de tarefas e to-do lists', '
<h2>Tarefas</h2>
<p>Organize suas atividades diarias com a lista de tarefas do AdvWell.</p>

<h3>Funcionalidades</h3>
<ul>
  <li><strong>Lista de Tarefas:</strong> Veja todas as tarefas pendentes</li>
  <li><strong>Filtros:</strong> Filtre por status, prioridade, responsavel</li>
  <li><strong>Ordenacao:</strong> Ordene por data, prioridade ou titulo</li>
</ul>

<h3>Criar Nova Tarefa</h3>
<ol>
  <li>Clique em <strong>"+ Nova Tarefa"</strong></li>
  <li>Digite o titulo da tarefa</li>
  <li>Defina a data de vencimento</li>
  <li>Escolha a prioridade</li>
  <li>Opcionalmente, adicione uma descricao</li>
</ol>

<h3>Gerenciar Tarefas</h3>
<ul>
  <li><strong>Marcar como concluida:</strong> Clique no checkbox</li>
  <li><strong>Editar:</strong> Clique no icone de lapis</li>
  <li><strong>Excluir:</strong> Clique no icone de lixeira</li>
</ul>
', 2, true
FROM "ManualCategory" WHERE slug = 'agenda';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Audiencias', 'audiencias', 'Controle de audiencias judiciais', '
<h2>Audiencias</h2>
<p>Gerencie todas as audiencias do escritorio em um unico lugar.</p>

<h3>Visualizacao</h3>
<ul>
  <li>Lista de audiencias ordenadas por data</li>
  <li>Filtros por periodo, advogado responsavel</li>
  <li>Status: agendada, realizada, adiada, cancelada</li>
</ul>

<h3>Informacoes da Audiencia</h3>
<ul>
  <li>Processo vinculado</li>
  <li>Data e hora</li>
  <li>Tipo (inicial, instrucao, conciliacao, etc.)</li>
  <li>Local/Vara</li>
  <li>Advogado responsavel</li>
  <li>Observacoes</li>
</ul>
', 3, true
FROM "ManualCategory" WHERE slug = 'agenda';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Google Calendar', 'google-calendar', 'Integracao com Google Calendar', '
<h2>Google Calendar</h2>
<p>Sincronize sua agenda do AdvWell com o Google Calendar.</p>

<h3>Configuracao</h3>
<ol>
  <li>Acesse <strong>Agenda > Google Calendar</strong></li>
  <li>Clique em <strong>"Conectar Google Calendar"</strong></li>
  <li>Faca login com sua conta Google</li>
  <li>Autorize o acesso ao calendario</li>
</ol>

<h3>Sincronizacao</h3>
<ul>
  <li>Eventos criados no AdvWell aparecem no Google Calendar</li>
  <li>Cores diferentes para cada tipo de evento</li>
  <li>Atualizacoes e exclusoes sao sincronizadas</li>
</ul>
', 4, true
FROM "ManualCategory" WHERE slug = 'agenda';

-- ============================================================================
-- ARTIGOS - PESSOAS
-- ============================================================================
INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Clientes', 'clientes', 'Cadastro e gestao de clientes', '
<h2>Clientes</h2>
<p>Gerencie o cadastro completo dos clientes do escritorio.</p>

<h3>Funcionalidades</h3>
<ul>
  <li><strong>Listagem:</strong> Visualize todos os clientes cadastrados</li>
  <li><strong>Busca:</strong> Pesquise por nome, CPF/CNPJ, email</li>
  <li><strong>Filtros:</strong> Filtre por status, tipo, tags</li>
  <li><strong>Exportacao:</strong> Exporte a lista em CSV</li>
</ul>

<h3>Cadastrar Novo Cliente</h3>
<ol>
  <li>Clique em <strong>"+ Novo Cliente"</strong></li>
  <li>Escolha o tipo: Pessoa Fisica ou Juridica</li>
  <li>Preencha os dados pessoais (nome, CPF/CNPJ)</li>
  <li>Adicione contatos (telefone, email, WhatsApp)</li>
  <li>Preencha o endereco</li>
  <li>Clique em <strong>"Salvar"</strong></li>
</ol>

<h3>Portal do Cliente</h3>
<p>Clientes podem ter acesso ao Portal onde visualizam seus processos. Para habilitar, edite o cliente e marque "Habilitar acesso ao portal".</p>
', 1, true
FROM "ManualCategory" WHERE slug = 'pessoas';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Adversos', 'adversos', 'Cadastro de partes adversas', '
<h2>Adversos</h2>
<p>Cadastre e gerencie as partes adversas dos processos.</p>

<h3>O que sao Adversos?</h3>
<p>Adversos sao as partes contrarias em um processo judicial ou negociacao. Podem ser pessoas fisicas, empresas, orgaos publicos, etc.</p>

<h3>Cadastrar Adverso</h3>
<ol>
  <li>Clique em <strong>"+ Novo Adverso"</strong></li>
  <li>Preencha nome/razao social</li>
  <li>Adicione CPF/CNPJ (opcional)</li>
  <li>Informe contatos disponiveis</li>
  <li>Adicione observacoes relevantes</li>
</ol>

<h3>Vinculacao a Processos</h3>
<p>Os adversos podem ser vinculados a processos na aba de partes do processo.</p>
', 2, true
FROM "ManualCategory" WHERE slug = 'pessoas';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Advogados', 'advogados', 'Gestao de advogados do escritorio', '
<h2>Advogados</h2>
<p>Cadastre os advogados que atuam no escritorio.</p>

<h3>Informacoes do Cadastro</h3>
<ul>
  <li>Nome completo</li>
  <li>Numero da OAB e seccional</li>
  <li>Email e telefone</li>
  <li>Especialidades</li>
  <li>Status (ativo/inativo)</li>
</ul>

<h3>Importancia do Cadastro</h3>
<p>O cadastro correto da OAB e essencial para o monitoramento automatico de publicacoes no Diario Oficial.</p>
', 3, true
FROM "ManualCategory" WHERE slug = 'pessoas';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Usuarios', 'usuarios', 'Gerenciamento de usuarios do sistema', '
<h2>Usuarios</h2>
<p><em>Disponivel apenas para ADMIN e SUPER_ADMIN</em></p>

<p>Gerencie os usuarios que tem acesso ao sistema.</p>

<h3>Tipos de Usuario</h3>
<ul>
  <li><strong>ADMIN:</strong> Acesso total ao escritorio</li>
  <li><strong>USER:</strong> Acesso limitado por permissoes</li>
  <li><strong>CLIENT:</strong> Acesso ao Portal do Cliente</li>
</ul>

<h3>Criar Novo Usuario</h3>
<ol>
  <li>Clique em <strong>"+ Novo Usuario"</strong></li>
  <li>Preencha nome, email e senha</li>
  <li>Selecione o tipo de usuario</li>
  <li>Configure as permissoes (para USER)</li>
  <li>Clique em <strong>"Salvar"</strong></li>
</ol>
', 4, true
FROM "ManualCategory" WHERE slug = 'pessoas';

-- ============================================================================
-- ARTIGOS - PROCESSOS
-- ============================================================================
INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Processos Judiciais', 'processos-judiciais', 'Gestao de processos judiciais com integracao DataJud', '
<h2>Processos Judiciais</h2>
<p>Gerencie todos os processos judiciais do escritorio com sincronizacao automatica via DataJud.</p>

<h3>Funcionalidades Principais</h3>
<ul>
  <li><strong>Cadastro:</strong> Manual ou por importacao do CNJ</li>
  <li><strong>Sincronizacao:</strong> Atualizacao automatica via DataJud</li>
  <li><strong>Movimentacoes:</strong> Historico completo de andamentos</li>
  <li><strong>Partes:</strong> Gerenciamento de todas as partes do processo</li>
  <li><strong>Documentos:</strong> Upload e organizacao de peticoes</li>
</ul>

<h3>Cadastrar Novo Processo</h3>
<ol>
  <li>Clique em <strong>"+ Novo Processo"</strong></li>
  <li>Informe o numero do processo (formato CNJ)</li>
  <li>O sistema buscara automaticamente os dados no DataJud</li>
  <li>Vincule o cliente responsavel</li>
  <li>Adicione o advogado responsavel</li>
  <li>Clique em <strong>"Salvar"</strong></li>
</ol>

<h3>Sincronizacao DataJud</h3>
<p>O sistema sincroniza automaticamente as 00:10 da manha. Para forcar uma atualizacao manual, clique no botao "Sincronizar" no processo.</p>
', 1, true
FROM "ManualCategory" WHERE slug = 'processos';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'PNJ - Processos Nao Judiciais', 'pnj', 'Gestao de processos administrativos e extrajudiciais', '
<h2>PNJ - Processos Nao Judiciais</h2>
<p>Gerencie processos administrativos, extrajudiciais e outras demandas que nao tramitam no judiciario.</p>

<h3>Exemplos de PNJ</h3>
<ul>
  <li>Processos administrativos (INSS, Receita Federal)</li>
  <li>Inventarios extrajudiciais</li>
  <li>Divorcios consensuais em cartorio</li>
  <li>Usucapiao extrajudicial</li>
  <li>Consultoria juridica</li>
  <li>Due diligence</li>
</ul>

<h3>Cadastrar PNJ</h3>
<ol>
  <li>Clique em <strong>"+ Novo PNJ"</strong></li>
  <li>Preencha o titulo/descricao</li>
  <li>Informe o numero do processo (se houver)</li>
  <li>Vincule o cliente</li>
  <li>Selecione o tipo de PNJ</li>
</ol>
', 2, true
FROM "ManualCategory" WHERE slug = 'processos';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Prazos', 'prazos', 'Controle de prazos processuais', '
<h2>Prazos</h2>
<p>Acompanhe todos os prazos processuais do escritorio.</p>

<h3>Visualizacao</h3>
<ul>
  <li><strong>Lista:</strong> Todos os prazos ordenados por vencimento</li>
  <li><strong>Calendario:</strong> Visualizacao mensal dos prazos</li>
  <li><strong>Filtros:</strong> Por advogado, processo, status</li>
</ul>

<h3>Cores e Prioridades</h3>
<ul>
  <li><strong>Vermelho:</strong> Vencidos ou vencendo hoje</li>
  <li><strong>Amarelo:</strong> Vencendo em ate 3 dias</li>
  <li><strong>Verde:</strong> Dentro do prazo</li>
</ul>

<h3>Sincronizacao</h3>
<p>Prazos sao sincronizados automaticamente com a Agenda e Dashboard.</p>
', 3, true
FROM "ManualCategory" WHERE slug = 'processos';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Monitoramento', 'monitoramento', 'Monitoramento automatico de publicacoes', '
<h2>Monitoramento</h2>
<p>Configure o monitoramento automatico de publicacoes no Diario Oficial.</p>

<h3>Como Funciona</h3>
<ol>
  <li>Cadastre os numeros de OAB a monitorar</li>
  <li>O sistema busca publicacoes diariamente</li>
  <li>Novas publicacoes sao exibidas para analise</li>
  <li>Importe publicacoes para processos existentes ou novos</li>
</ol>

<h3>Analisar Publicacoes</h3>
<p>Para cada publicacao encontrada, voce pode:</p>
<ul>
  <li><strong>Importar:</strong> Criar novo processo a partir da publicacao</li>
  <li><strong>Vincular:</strong> Associar a um processo existente</li>
  <li><strong>Ignorar:</strong> Marcar como nao relevante</li>
</ul>
', 4, true
FROM "ManualCategory" WHERE slug = 'processos';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Atualizacoes', 'atualizacoes', 'Ultimas movimentacoes e publicacoes', '
<h2>Atualizacoes</h2>
<p>Visualize as ultimas movimentacoes de todos os processos em um so lugar.</p>

<h3>O que e exibido</h3>
<ul>
  <li>Ultimos andamentos sincronizados via DataJud</li>
  <li>Publicacoes encontradas no Diario Oficial</li>
  <li>Movimentacoes manuais cadastradas</li>
</ul>

<h3>Informar ao Cliente</h3>
<p>Para cada atualizacao, voce pode clicar em "Informar Cliente" para escrever uma explicacao em linguagem simples que o cliente vera no Portal.</p>
', 5, true
FROM "ManualCategory" WHERE slug = 'processos';

-- ============================================================================
-- ARTIGOS - FINANCEIRO
-- ============================================================================
INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Fluxo de Caixa', 'fluxo-caixa', 'Controle de entradas e saidas financeiras', '
<h2>Fluxo de Caixa</h2>
<p>Gerencie todas as movimentacoes financeiras do escritorio.</p>

<h3>Funcionalidades</h3>
<ul>
  <li><strong>Receitas:</strong> Honorarios, acordos, custas reembolsadas</li>
  <li><strong>Despesas:</strong> Custas processuais, taxas, despesas operacionais</li>
  <li><strong>Parcelas:</strong> Controle de parcelamentos</li>
  <li><strong>Relatorios:</strong> Analise por periodo, cliente, processo</li>
</ul>

<h3>Cadastrar Lancamento</h3>
<ol>
  <li>Clique em <strong>"+ Novo Lancamento"</strong></li>
  <li>Selecione o tipo (receita/despesa)</li>
  <li>Informe descricao e valor</li>
  <li>Vincule ao processo ou cliente (opcional)</li>
  <li>Defina data de vencimento e pagamento</li>
</ol>

<h3>Parcelamento</h3>
<p>Marque "Parcelar" ao criar o lancamento, informe o numero de parcelas e o sistema gerara automaticamente.</p>
', 1, true
FROM "ManualCategory" WHERE slug = 'financeiro';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Contas a Pagar', 'contas-pagar', 'Gestao de contas a pagar e despesas', '
<h2>Contas a Pagar</h2>
<p>Controle todas as despesas e obrigacoes financeiras do escritorio.</p>

<h3>Tipos de Contas</h3>
<ul>
  <li>Custas processuais</li>
  <li>Honorarios de correspondentes</li>
  <li>Despesas administrativas</li>
  <li>Taxas e tributos</li>
  <li>Fornecedores</li>
</ul>

<h3>Cadastrar Conta</h3>
<ol>
  <li>Clique em <strong>"+ Nova Conta"</strong></li>
  <li>Selecione a categoria</li>
  <li>Informe descricao e valor</li>
  <li>Defina data de vencimento</li>
</ol>

<h3>Badge de Alerta</h3>
<p>O menu exibe um badge com o numero de contas vencendo hoje.</p>
', 2, true
FROM "ManualCategory" WHERE slug = 'financeiro';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Planos de Clientes', 'planos-clientes', 'Gerenciamento de planos e assinaturas de clientes', '
<h2>Planos de Clientes</h2>
<p>Gerencie planos de assinatura oferecidos aos clientes (honorarios mensais, consultoria, etc.).</p>

<h3>Criar Plano</h3>
<ol>
  <li>Acesse <strong>Financeiro > Planos</strong></li>
  <li>Clique em <strong>"+ Novo Plano"</strong></li>
  <li>Defina nome, descricao e valor mensal</li>
  <li>Configure a periodicidade</li>
</ol>

<h3>Cobranca Automatica</h3>
<p>O sistema gera automaticamente os lancamentos financeiros conforme a periodicidade do plano.</p>
', 3, true
FROM "ManualCategory" WHERE slug = 'financeiro';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Assinatura do Sistema', 'assinatura-sistema', 'Gerenciamento da assinatura do AdvWell', '
<h2>Assinatura do Sistema</h2>
<p><em>Disponivel apenas para ADMIN</em></p>

<p>Gerencie a assinatura do seu escritorio no AdvWell.</p>

<h3>Status da Assinatura</h3>
<ul>
  <li><strong>Trial:</strong> Periodo de teste gratuito</li>
  <li><strong>Ativo:</strong> Assinatura em dia</li>
  <li><strong>Expirado:</strong> Assinatura vencida</li>
  <li><strong>Cancelado:</strong> Assinatura cancelada</li>
</ul>

<h3>Metodo de Pagamento</h3>
<p>Gerencie cartoes de credito e informacoes de cobranca atraves do portal seguro Stripe.</p>
', 4, true
FROM "ManualCategory" WHERE slug = 'financeiro';

-- ============================================================================
-- ARTIGOS - MARKETING
-- ============================================================================
INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Leads', 'leads', 'Gestao de leads e potenciais clientes', '
<h2>Leads</h2>
<p>Gerencie potenciais clientes e oportunidades de negocio.</p>

<h3>Funil de Vendas</h3>
<ul>
  <li><strong>Novo:</strong> Lead recem cadastrado</li>
  <li><strong>Contatado:</strong> Primeiro contato realizado</li>
  <li><strong>Qualificado:</strong> Lead com potencial confirmado</li>
  <li><strong>Proposta:</strong> Proposta enviada</li>
  <li><strong>Convertido:</strong> Lead virou cliente</li>
  <li><strong>Perdido:</strong> Lead nao convertido</li>
</ul>

<h3>Converter em Cliente</h3>
<p>Quando um lead fechar negocio, clique em "Converter em Cliente" para criar automaticamente o cadastro de cliente.</p>
', 1, true
FROM "ManualCategory" WHERE slug = 'marketing';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Tags', 'tags', 'Sistema de tags para organizacao', '
<h2>Tags</h2>
<p>Organize clientes e leads com tags personalizadas.</p>

<h3>Criar Nova Tag</h3>
<ol>
  <li>Acesse <strong>Marketing > Tags</strong></li>
  <li>Clique em <strong>"+ Nova Tag"</strong></li>
  <li>Digite o nome da tag</li>
  <li>Escolha uma cor</li>
  <li>Salve</li>
</ol>

<h3>Exemplos de Uso</h3>
<ul>
  <li><strong>VIP:</strong> Clientes prioritarios</li>
  <li><strong>Trabalhista:</strong> Clientes de direito trabalhista</li>
  <li><strong>Empresa:</strong> Clientes pessoa juridica</li>
</ul>
', 2, true
FROM "ManualCategory" WHERE slug = 'marketing';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Campanhas de Email', 'campanhas-email', 'Envio de campanhas de email marketing', '
<h2>Campanhas de Email</h2>
<p><em>Disponivel para ADMIN e SUPER_ADMIN</em></p>

<p>Crie e envie campanhas de email para clientes e leads.</p>

<h3>Criar Campanha</h3>
<ol>
  <li>Clique em <strong>"+ Nova Campanha"</strong></li>
  <li>Defina o nome da campanha</li>
  <li>Escreva o assunto do email</li>
  <li>Crie o conteudo usando o editor</li>
  <li>Selecione os destinatarios</li>
  <li>Agende ou envie imediatamente</li>
</ol>

<h3>Requisitos</h3>
<p>E necessario configurar o servidor SMTP em Credenciais.</p>
', 3, true
FROM "ManualCategory" WHERE slug = 'marketing';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Campanhas WhatsApp', 'campanhas-whatsapp', 'Envio de campanhas via WhatsApp Business', '
<h2>Campanhas WhatsApp</h2>
<p><em>Disponivel para ADMIN e SUPER_ADMIN</em></p>

<p>Envie mensagens em massa pelo WhatsApp Business API.</p>

<h3>Requisitos</h3>
<ul>
  <li>Conta WhatsApp Business API configurada</li>
  <li>Templates de mensagem aprovados pelo WhatsApp</li>
  <li>Creditos disponiveis</li>
</ul>

<h3>Configuracao</h3>
<p>Configure a integracao WhatsApp em Credenciais > Config. WhatsApp.</p>
', 4, true
FROM "ManualCategory" WHERE slug = 'marketing';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Analytics de Leads', 'analytics-leads', 'Relatorios e metricas de leads', '
<h2>Analytics de Leads</h2>
<p>Acompanhe metricas e relatorios sobre seus leads.</p>

<h3>Metricas Disponiveis</h3>
<ul>
  <li><strong>Leads por Periodo:</strong> Novos leads por mes</li>
  <li><strong>Taxa de Conversao:</strong> % de leads convertidos</li>
  <li><strong>Origem dos Leads:</strong> De onde vem os leads</li>
  <li><strong>Funil de Vendas:</strong> Distribuicao por etapa</li>
</ul>

<h3>Exportacao</h3>
<p>Exporte os relatorios em PDF ou CSV para analises externas.</p>
', 5, true
FROM "ManualCategory" WHERE slug = 'marketing';

-- ============================================================================
-- ARTIGOS - DOCUMENTOS
-- ============================================================================
INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Documentos Juridicos', 'documentos-juridicos', 'Geracao de documentos com templates', '
<h2>Documentos Juridicos</h2>
<p>Gere documentos juridicos automaticamente usando templates.</p>

<h3>Templates Disponiveis</h3>
<ul>
  <li>Procuracao Ad Judicia</li>
  <li>Contrato de Honorarios</li>
  <li>Recibo de Honorarios</li>
  <li>Substabelecimento</li>
  <li>Declaracoes diversas</li>
</ul>

<h3>Gerar Documento</h3>
<ol>
  <li>Acesse <strong>Documentos</strong></li>
  <li>Selecione o tipo de documento</li>
  <li>Escolha o cliente e/ou processo</li>
  <li>Revise os dados preenchidos automaticamente</li>
  <li>Clique em <strong>"Gerar PDF"</strong></li>
</ol>
', 1, true
FROM "ManualCategory" WHERE slug = 'documentos';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Uploads', 'uploads', 'Upload e organizacao de arquivos', '
<h2>Uploads</h2>
<p>Faca upload e organize arquivos do escritorio.</p>

<h3>Tipos de Arquivo Aceitos</h3>
<ul>
  <li>PDF</li>
  <li>Documentos Office (DOC, DOCX, XLS, XLSX)</li>
  <li>Imagens (JPG, PNG)</li>
</ul>

<h3>Fazer Upload</h3>
<ol>
  <li>Clique em <strong>"+ Upload"</strong></li>
  <li>Selecione o arquivo ou arraste para a area</li>
  <li>Adicione uma descricao</li>
  <li>Vincule a um processo ou cliente (opcional)</li>
  <li>Clique em <strong>"Enviar"</strong></li>
</ol>
', 2, true
FROM "ManualCategory" WHERE slug = 'documentos';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Portal do Cliente', 'portal-cliente', 'Configuracao do portal de acesso para clientes', '
<h2>Portal do Cliente</h2>
<p><em>Disponivel para ADMIN e SUPER_ADMIN</em></p>

<p>Configure o portal onde clientes acompanham seus processos.</p>

<h3>Funcionalidades do Portal</h3>
<p>Clientes com acesso ao portal podem:</p>
<ul>
  <li>Visualizar seus processos</li>
  <li>Acompanhar movimentacoes</li>
  <li>Baixar documentos compartilhados</li>
  <li>Enviar mensagens ao escritorio</li>
  <li>Ver comunicados/anuncios</li>
</ul>

<h3>Habilitar Acesso</h3>
<ol>
  <li>Edite o cadastro do cliente</li>
  <li>Marque "Habilitar acesso ao portal"</li>
  <li>Defina email e senha</li>
</ol>
', 3, true
FROM "ManualCategory" WHERE slug = 'documentos';

-- ============================================================================
-- ARTIGOS - INTEGRACOES
-- ============================================================================
INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Configuracao SMTP', 'config-smtp', 'Configurar servidor de email', '
<h2>Configuracao SMTP</h2>
<p><em>Disponivel para ADMIN e SUPER_ADMIN</em></p>

<p>Configure o servidor de email para envio de campanhas e notificacoes.</p>

<h3>Dados Necessarios</h3>
<ul>
  <li>Servidor SMTP (ex: smtp.gmail.com)</li>
  <li>Porta (587 para TLS, 465 para SSL)</li>
  <li>Usuario (email)</li>
  <li>Senha ou senha de app</li>
</ul>

<h3>Testar Conexao</h3>
<p>Apos configurar, clique em "Testar" para verificar se a conexao esta funcionando.</p>
', 1, true
FROM "ManualCategory" WHERE slug = 'integracoes';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Configuracao WhatsApp', 'config-whatsapp', 'Integracao com WhatsApp Business API', '
<h2>Configuracao WhatsApp</h2>
<p><em>Disponivel para ADMIN e SUPER_ADMIN</em></p>

<p>Configure a integracao com WhatsApp Business API.</p>

<h3>Requisitos</h3>
<ul>
  <li>Conta Meta Business verificada</li>
  <li>Numero de telefone dedicado para WhatsApp Business</li>
  <li>Templates de mensagem aprovados</li>
</ul>

<h3>Configurar</h3>
<ol>
  <li>Acesse Credenciais > Config. WhatsApp</li>
  <li>Insira o token de acesso da API</li>
  <li>Informe o ID do numero de telefone</li>
  <li>Configure o webhook</li>
</ol>
', 2, true
FROM "ManualCategory" WHERE slug = 'integracoes';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Configuracao Google Calendar', 'config-google-calendar', 'Configurar integracao Google Calendar', '
<h2>Configuracao Google Calendar</h2>
<p><em>Disponivel para ADMIN e SUPER_ADMIN</em></p>

<p>Configure as credenciais OAuth do Google para permitir que usuarios sincronizem suas agendas.</p>

<h3>Passo a Passo</h3>
<ol>
  <li>Acesse o Google Cloud Console</li>
  <li>Crie um projeto ou selecione um existente</li>
  <li>Ative a API do Google Calendar</li>
  <li>Crie credenciais OAuth 2.0</li>
  <li>Configure a tela de consentimento</li>
  <li>Copie o Client ID e Client Secret</li>
  <li>Insira no AdvWell em Config. Google Cal.</li>
</ol>
', 3, true
FROM "ManualCategory" WHERE slug = 'integracoes';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Configuracao Stripe', 'config-stripe', 'Configurar pagamentos com Stripe', '
<h2>Configuracao Stripe</h2>
<p><em>Disponivel para ADMIN e SUPER_ADMIN</em></p>

<p>Configure o Stripe para processar pagamentos de assinatura.</p>

<h3>Obter Chaves</h3>
<ol>
  <li>Acesse dashboard.stripe.com</li>
  <li>Va em Developers > API Keys</li>
  <li>Copie a Publishable Key e Secret Key</li>
</ol>

<h3>Modo Teste</h3>
<p>Use as chaves de teste para testar antes de ir para producao.</p>
', 4, true
FROM "ManualCategory" WHERE slug = 'integracoes';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Configuracao de IA', 'config-ia', 'Configurar assistente de inteligencia artificial', '
<h2>Configuracao de IA</h2>
<p><em>Disponivel para ADMIN e SUPER_ADMIN</em></p>

<p>Configure o assistente de IA para ajudar na analise de documentos e processos.</p>

<h3>Funcionalidades</h3>
<ul>
  <li>Analise automatica de publicacoes</li>
  <li>Sugestoes de proximos passos</li>
  <li>Resumo de movimentacoes</li>
  <li>Geracao de textos</li>
</ul>

<h3>Tokens</h3>
<p>O uso da IA consome tokens. O saldo e compartilhado ou individual conforme configuracao.</p>
', 5, true
FROM "ManualCategory" WHERE slug = 'integracoes';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Backup por Email', 'backup-email', 'Configurar backup automatico por email', '
<h2>Backup por Email</h2>
<p><em>Disponivel para ADMIN e SUPER_ADMIN</em></p>

<p>Configure o envio automatico de backups por email.</p>

<h3>O que e Enviado</h3>
<ul>
  <li>Exportacao de clientes em CSV</li>
  <li>Exportacao de processos em CSV</li>
  <li>Relatorio financeiro</li>
</ul>

<h3>Configurar</h3>
<ol>
  <li>Acesse Credenciais > Email Backup</li>
  <li>Informe o email de destino</li>
  <li>Selecione a frequencia</li>
  <li>Ative o backup</li>
</ol>
', 6, true
FROM "ManualCategory" WHERE slug = 'integracoes';

-- ============================================================================
-- ARTIGOS - ADMINISTRACAO
-- ============================================================================
INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Configuracoes', 'configuracoes', 'Configuracoes gerais do sistema', '
<h2>Configuracoes</h2>
<p>Ajuste as configuracoes do seu perfil e do sistema.</p>

<h3>Perfil</h3>
<ul>
  <li>Alterar nome de exibicao</li>
  <li>Alterar foto de perfil</li>
  <li>Alterar senha</li>
</ul>

<h3>Notificacoes</h3>
<ul>
  <li>Ativar/desativar notificacoes por email</li>
  <li>Configurar alertas de prazos</li>
  <li>Configurar alertas de contas a pagar</li>
</ul>
', 1, true
FROM "ManualCategory" WHERE slug = 'administracao';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Meus Dados', 'meus-dados', 'Gestao de dados pessoais (LGPD)', '
<h2>Meus Dados</h2>
<p>Gerencie seus dados pessoais conforme a LGPD.</p>

<h3>Direitos Disponiveis</h3>
<ul>
  <li><strong>Acesso:</strong> Visualize todos os seus dados</li>
  <li><strong>Retificacao:</strong> Corrija dados incorretos</li>
  <li><strong>Portabilidade:</strong> Exporte seus dados</li>
  <li><strong>Exclusao:</strong> Solicite a exclusao dos dados</li>
</ul>

<h3>Exportar Dados</h3>
<p>Clique em "Exportar Meus Dados" para receber um arquivo com todos os seus dados pessoais.</p>
', 2, true
FROM "ManualCategory" WHERE slug = 'administracao';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Solicitacoes LGPD', 'solicitacoes-lgpd', 'Gerenciar solicitacoes de dados (LGPD)', '
<h2>Solicitacoes LGPD</h2>
<p><em>Disponivel para ADMIN e SUPER_ADMIN</em></p>

<p>Gerencie solicitacoes de direitos dos titulares de dados.</p>

<h3>Tipos de Solicitacao</h3>
<ul>
  <li><strong>Acesso:</strong> Pedido de copia dos dados</li>
  <li><strong>Retificacao:</strong> Pedido de correcao</li>
  <li><strong>Exclusao:</strong> Pedido de apagamento</li>
  <li><strong>Portabilidade:</strong> Pedido de exportacao</li>
</ul>

<h3>Prazos</h3>
<p>A LGPD estabelece prazo de 15 dias para resposta as solicitacoes.</p>
', 3, true
FROM "ManualCategory" WHERE slug = 'administracao';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Logs de Auditoria', 'logs-auditoria', 'Visualizar historico de acoes do sistema', '
<h2>Logs de Auditoria</h2>
<p>Acompanhe todas as acoes realizadas no sistema.</p>

<h3>O que e Registrado</h3>
<ul>
  <li>Criacao, edicao e exclusao de registros</li>
  <li>Logins e logouts</li>
  <li>Alteracoes de permissoes</li>
  <li>Acoes criticas de seguranca</li>
</ul>

<h3>Filtros</h3>
<ul>
  <li>Por usuario</li>
  <li>Por tipo de acao</li>
  <li>Por periodo</li>
  <li>Por recurso</li>
</ul>
', 4, true
FROM "ManualCategory" WHERE slug = 'administracao';

INSERT INTO "ManualArticle" ("categoryId", "title", "slug", "summary", "content", "order", "active")
SELECT id, 'Empresas', 'empresas', 'Gerenciamento de empresas (SUPER_ADMIN)', '
<h2>Empresas</h2>
<p><em>Disponivel apenas para SUPER_ADMIN</em></p>

<p>Gerencie todas as empresas/escritorios cadastrados na plataforma.</p>

<h3>Funcionalidades</h3>
<ul>
  <li>Listar todas as empresas</li>
  <li>Visualizar dados e estatisticas</li>
  <li>Ajustar limites e planos</li>
  <li>Gerenciar assinaturas</li>
</ul>

<h3>Criar Nova Empresa</h3>
<ol>
  <li>Clique em <strong>"+ Nova Empresa"</strong></li>
  <li>Preencha razao social e CNPJ</li>
  <li>Crie o usuario administrador</li>
  <li>Defina o plano inicial</li>
</ol>
', 5, true
FROM "ManualCategory" WHERE slug = 'administracao';

-- ============================================================================
-- FAQs
-- ============================================================================
INSERT INTO "ManualFAQ" ("categoryId", "question", "answer", "order", "active")
SELECT id, 'Como faco para alterar minha senha?', '<p>Para alterar sua senha:</p><ol><li>Clique no seu nome no canto superior direito</li><li>Acesse <strong>"Meu Perfil"</strong></li><li>Clique em <strong>"Alterar Senha"</strong></li><li>Digite a senha atual e a nova senha</li><li>Clique em <strong>"Salvar"</strong></li></ol>', 1, true
FROM "ManualCategory" WHERE slug = 'inicio-rapido';

INSERT INTO "ManualFAQ" ("categoryId", "question", "answer", "order", "active")
SELECT id, 'Esqueci minha senha. O que fazer?', '<p>Na tela de login, clique em <strong>"Esqueci minha senha"</strong>. Voce recebera um email com um link para redefinir sua senha. O link e valido por 24 horas.</p>', 2, true
FROM "ManualCategory" WHERE slug = 'inicio-rapido';

INSERT INTO "ManualFAQ" ("categoryId", "question", "answer", "order", "active")
SELECT id, 'O sistema esta lento. O que pode ser?', '<p>Algumas possiveis causas:</p><ul><li>Conexao com internet lenta</li><li>Navegador desatualizado</li><li>Cache do navegador cheio</li></ul><p>Tente limpar o cache do navegador (Ctrl+Shift+Delete) e recarregar a pagina.</p>', 3, true
FROM "ManualCategory" WHERE slug = 'inicio-rapido';

INSERT INTO "ManualFAQ" ("categoryId", "question", "answer", "order", "active")
SELECT id, 'O processo nao esta sincronizando. Por que?', '<p>Possiveis motivos:</p><ul><li>Numero do processo incorreto</li><li>Processo muito recente (pode demorar alguns dias para aparecer no DataJud)</li><li>Problema temporario na API do CNJ</li></ul><p>Tente forcar a sincronizacao clicando no botao "Sincronizar" no processo.</p>', 1, true
FROM "ManualCategory" WHERE slug = 'processos';

INSERT INTO "ManualFAQ" ("categoryId", "question", "answer", "order", "active")
SELECT id, 'Como adiciono partes a um processo?', '<p>Dentro do processo, va na aba <strong>"Partes"</strong> e clique em <strong>"+ Adicionar Parte"</strong>. Selecione o tipo (autor, reu, advogado, etc.) e vincule a um cliente, adverso ou advogado cadastrado.</p>', 2, true
FROM "ManualCategory" WHERE slug = 'processos';

INSERT INTO "ManualFAQ" ("categoryId", "question", "answer", "order", "active")
SELECT id, 'O que significa cada status do processo?', '<p><ul><li><strong>Em andamento:</strong> Processo ativo, com movimentacao regular</li><li><strong>Suspenso:</strong> Processo temporariamente parado</li><li><strong>Arquivado:</strong> Processo encerrado, mas pode ser reativado</li><li><strong>Baixado:</strong> Processo definitivamente encerrado</li></ul></p>', 3, true
FROM "ManualCategory" WHERE slug = 'processos';

INSERT INTO "ManualFAQ" ("categoryId", "question", "answer", "order", "active")
SELECT id, 'Como cadastro um honorario parcelado?', '<p>Ao criar um novo lancamento:</p><ol><li>Preencha o valor total</li><li>Marque a opcao <strong>"Parcelar"</strong></li><li>Informe o numero de parcelas</li><li>Defina a data da primeira parcela</li></ol><p>O sistema gerara automaticamente todas as parcelas.</p>', 1, true
FROM "ManualCategory" WHERE slug = 'financeiro';

INSERT INTO "ManualFAQ" ("categoryId", "question", "answer", "order", "active")
SELECT id, 'Como baixo uma parcela recebida?', '<p>Na lista de lancamentos financeiros, encontre a parcela e clique no botao <strong>"Baixar"</strong>. Informe a data do recebimento e o valor recebido.</p>', 2, true
FROM "ManualCategory" WHERE slug = 'financeiro';

INSERT INTO "ManualFAQ" ("categoryId", "question", "answer", "order", "active")
SELECT id, 'Como integro com meu Google Calendar?', '<p>Acesse <strong>Agenda > Google Calendar</strong>, clique em <strong>"Conectar"</strong> e faca login com sua conta Google. Autorize o acesso e pronto! Seus eventos serao sincronizados automaticamente.</p>', 1, true
FROM "ManualCategory" WHERE slug = 'agenda';

INSERT INTO "ManualFAQ" ("categoryId", "question", "answer", "order", "active")
SELECT id, 'Os prazos aparecem na agenda?', '<p>Sim! Os prazos cadastrados nos processos aparecem automaticamente na agenda como eventos do tipo "Prazo", com cores diferenciadas conforme a proximidade do vencimento.</p>', 2, true
FROM "ManualCategory" WHERE slug = 'agenda';

INSERT INTO "ManualFAQ" ("categoryId", "question", "answer", "order", "active")
SELECT id, 'Qual a diferenca entre Cliente e Lead?', '<p><strong>Lead:</strong> Potencial cliente que ainda nao fechou negocio.<br><strong>Cliente:</strong> Pessoa que ja contratou os servicos do escritorio.</p><p>Voce pode converter um Lead em Cliente quando ele fechar negocio.</p>', 1, true
FROM "ManualCategory" WHERE slug = 'pessoas';

INSERT INTO "ManualFAQ" ("categoryId", "question", "answer", "order", "active")
SELECT id, 'Como dou acesso ao portal para um cliente?', '<p>Edite o cadastro do cliente, marque <strong>"Habilitar acesso ao portal"</strong>, defina email e senha. O cliente podera acessar pelo endereco <strong>cliente.advwell.pro</strong>.</p>', 2, true
FROM "ManualCategory" WHERE slug = 'pessoas';

INSERT INTO "ManualFAQ" ("categoryId", "question", "answer", "order", "active")
SELECT id, 'Preciso ter conta no Google Cloud?', '<p>Sim, para usar a integracao com Google Calendar, o administrador da empresa precisa configurar as credenciais OAuth no Google Cloud Console. Apos configurado, os usuarios podem conectar suas contas individuais.</p>', 1, true
FROM "ManualCategory" WHERE slug = 'integracoes';

INSERT INTO "ManualFAQ" ("categoryId", "question", "answer", "order", "active")
SELECT id, 'O que e o WhatsApp Business API?', '<p>E a versao empresarial do WhatsApp, diferente do WhatsApp Business App. Requer cadastro no Meta Business Suite e aprovacao de templates de mensagem. Permite envio em massa e integracao com sistemas.</p>', 2, true
FROM "ManualCategory" WHERE slug = 'integracoes';

INSERT INTO "ManualFAQ" ("categoryId", "question", "answer", "order", "active")
SELECT id, 'Como crio um novo usuario?', '<p>Acesse <strong>Pessoas > Usuarios</strong>, clique em <strong>"+ Novo Usuario"</strong>, preencha os dados e defina o tipo de acesso (ADMIN ou USER). Para usuarios do tipo USER, configure as permissoes especificas.</p>', 1, true
FROM "ManualCategory" WHERE slug = 'administracao';

INSERT INTO "ManualFAQ" ("categoryId", "question", "answer", "order", "active")
SELECT id, 'O que e LGPD e como afeta o sistema?', '<p>A LGPD (Lei Geral de Protecao de Dados) garante direitos sobre dados pessoais. O AdvWell permite que titulares acessem, corrijam, exportem e solicitem exclusao de seus dados atraves da secao "Meus Dados".</p>', 2, true
FROM "ManualCategory" WHERE slug = 'administracao';

INSERT INTO "ManualFAQ" ("categoryId", "question", "answer", "order", "active")
SELECT id, 'Como funciona a assinatura do AdvWell?', '<p>O AdvWell funciona por assinatura mensal. Apos o periodo de teste, e necessario escolher um plano e cadastrar um cartao de credito. O pagamento e processado automaticamente pelo Stripe.</p>', 3, true
FROM "ManualCategory" WHERE slug = 'administracao';
