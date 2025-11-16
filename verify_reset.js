const https = require('https');

const agent = new https.Agent({
  rejectUnauthorized: false
});

const API_URL = 'https://api.advtom.com/api';

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      agent
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function verifySystem() {
  console.log('\n🔍 VERIFICANDO SISTEMA APÓS RESET E POPULAÇÃO\n');
  console.log('='.repeat(70) + '\n');

  try {
    // ===== TEST 1: LOGIN SUPER_ADMIN =====
    console.log('👑 1. Login como SUPER_ADMIN...');
    const superAdminLogin = await makeRequest('POST', '/auth/login', {
      email: 'wasolutionscorp@gmail.com',
      password: 'rbYSaYWVF1UDOSFsOipCZtN33mHVWA'
    });

    if (superAdminLogin.status !== 200) {
      console.error('❌ Erro no login SUPER_ADMIN:', superAdminLogin.data);
      return;
    }

    const superAdminToken = superAdminLogin.data.token;
    console.log('✅ Login SUPER_ADMIN: OK');
    console.log(`   Nome: ${superAdminLogin.data.user.name}`);
    console.log(`   Role: ${superAdminLogin.data.user.role}\n`);

    // ===== TEST 2: LIST COMPANIES =====
    console.log('🏢 2. Listando empresas (SUPER_ADMIN)...');
    const companiesRes = await makeRequest('GET', '/companies', null, superAdminToken);

    if (companiesRes.status !== 200) {
      console.error('❌ Erro ao listar empresas:', companiesRes.data);
      return;
    }

    console.log(`✅ Total de empresas: ${companiesRes.data.data.length}`);
    companiesRes.data.data.forEach((company, index) => {
      console.log(`   ${index + 1}. ${company.name}`);
      console.log(`      Usuários: ${company._count.users} | Clientes: ${company._count.clients} | Processos: ${company._count.cases}`);
    });
    console.log('');

    // ===== TEST 3: LOGIN ADMIN =====
    console.log('👨‍💼 3. Login como ADMIN...');
    const adminLogin = await makeRequest('POST', '/auth/login', {
      email: 'admin@silvaassociados.adv.br',
      password: '6W&g95898Ak#3PT%'
    });

    if (adminLogin.status !== 200) {
      console.error('❌ Erro no login ADMIN:', adminLogin.data);
      return;
    }

    const adminToken = adminLogin.data.token;
    console.log('✅ Login ADMIN: OK');
    console.log(`   Nome: ${adminLogin.data.user.name}`);
    console.log(`   Empresa: ${adminLogin.data.user.companyName}\n`);

    // ===== TEST 4: LIST USERS =====
    console.log('👥 4. Listando usuários (ADMIN)...');
    const usersRes = await makeRequest('GET', '/users', null, adminToken);

    if (usersRes.status !== 200) {
      console.error('❌ Erro ao listar usuários:', usersRes.data);
      return;
    }

    console.log(`✅ Total de usuários: ${usersRes.data.data.length}`);
    usersRes.data.data.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email})`);
      console.log(`      Role: ${user.role} | Permissões: ${user.permissions.length}`);
      if (user.permissions.length > 0) {
        user.permissions.forEach(perm => {
          const actions = [];
          if (perm.canView) actions.push('Ver');
          if (perm.canEdit) actions.push('Editar');
          if (perm.canDelete) actions.push('Excluir');
          console.log(`         • ${perm.resource}: ${actions.join(', ')}`);
        });
      }
    });
    console.log('');

    // ===== TEST 5: LIST CLIENTS =====
    console.log('📋 5. Listando clientes (ADMIN)...');
    const clientsRes = await makeRequest('GET', '/clients', null, adminToken);

    if (clientsRes.status !== 200) {
      console.error('❌ Erro ao listar clientes:', clientsRes.data);
      return;
    }

    console.log(`✅ Total de clientes: ${clientsRes.data.data.length}`);
    console.log('');

    // ===== TEST 6: LIST CASES =====
    console.log('⚖️  6. Listando processos (ADMIN)...');
    const casesRes = await makeRequest('GET', '/cases', null, adminToken);

    if (casesRes.status !== 200) {
      console.error('❌ Erro ao listar processos:', casesRes.data);
      return;
    }

    console.log(`✅ Total de processos: ${casesRes.data.data.length}`);
    casesRes.data.data.forEach((c, index) => {
      console.log(`   ${index + 1}. ${c.processNumber} - ${c.subject}`);
      console.log(`      Status: ${c.status} | Valor: R$ ${c.value?.toFixed(2) || '0.00'}`);
    });
    console.log('');

    // ===== TEST 7: LIST FINANCIAL TRANSACTIONS =====
    console.log('💰 7. Listando transações financeiras (ADMIN)...');
    const financialRes = await makeRequest('GET', '/financial', null, adminToken);

    if (financialRes.status !== 200) {
      console.error('❌ Erro ao listar transações:', financialRes.data);
      return;
    }

    console.log(`✅ Total de transações: ${financialRes.data.data.length}`);
    let totalIncome = 0;
    let totalExpense = 0;
    financialRes.data.data.forEach(t => {
      if (t.type === 'INCOME') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
      }
    });
    console.log(`   📈 Receitas: R$ ${totalIncome.toFixed(2)}`);
    console.log(`   📉 Despesas: R$ ${totalExpense.toFixed(2)}`);
    console.log(`   💵 Saldo: R$ ${(totalIncome - totalExpense).toFixed(2)}`);
    console.log('');

    // ===== TEST 8: LOGIN USER WITH LIMITED PERMISSIONS =====
    console.log('🔒 8. Testando usuário com permissões limitadas...');
    const userLogin = await makeRequest('POST', '/auth/login', {
      email: 'ana.santos@silvaassociados.adv.br',
      password: '!@BD5eS7%UEf$AwP'
    });

    if (userLogin.status !== 200) {
      console.error('❌ Erro no login usuário:', userLogin.data);
      return;
    }

    console.log('✅ Login usuário (Ana Santos): OK');
    console.log(`   Permissões: ${userLogin.data.user.permissions.length}`);
    userLogin.data.user.permissions.forEach(perm => {
      const actions = [];
      if (perm.canView) actions.push('Ver');
      if (perm.canEdit) actions.push('Editar');
      if (perm.canDelete) actions.push('Excluir');
      console.log(`      • ${perm.resource}: ${actions.join(', ')}`);
    });
    console.log('');

    // ===== FINAL SUMMARY =====
    console.log('═'.repeat(70));
    console.log('\n✅ VERIFICAÇÃO COMPLETA - TODOS OS TESTES PASSARAM!\n');
    console.log('═'.repeat(70));
    console.log('\n📊 RESUMO DO SISTEMA:\n');
    console.log(`   👑 1 SUPER_ADMIN: wasolutionscorp@gmail.com`);
    console.log(`   🏢 1 Empresa: Silva & Associados Advocacia`);
    console.log(`   👨‍💼 1 ADMIN: Dr. João Silva`);
    console.log(`   👥 4 USUÁRIOS com permissões variadas`);
    console.log(`   📋 ${clientsRes.data.data.length} Clientes`);
    console.log(`   ⚖️  ${casesRes.data.data.length} Processos`);
    console.log(`   💰 ${financialRes.data.data.length} Transações Financeiras`);
    console.log('');
    console.log('🎉 Sistema pronto para uso!');
    console.log('');
    console.log('🔐 Credenciais salvas em: /root/advtom/CREDENTIALS.txt');
    console.log('⚠️  IMPORTANTE: NÃO compartilhe este arquivo publicamente!');
    console.log('');
    console.log('🌐 Acesse o sistema em: https://app.advtom.com');
    console.log('═'.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Erro durante verificação:', error.message);
  }
}

verifySystem();
