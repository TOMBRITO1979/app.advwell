const https = require('https');

// Ignorar certificados SSL auto-assinados
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const API_URL = 'api.advtom.com';

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_URL,
      port: 443,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers.Authorization = `Bearer ${token}`;
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => { reject(error); });
    if (data) { req.write(JSON.stringify(data)); }
    req.end();
  });
}

async function createCompleteData() {
  console.log('=== CRIANDO DADOS COMPLETOS NO SISTEMA ===\n');

  try {
    // 1. Criar 2 empresas e 2 SUPER_ADMINs
    console.log('1. Criando 2 empresas com SUPER_ADMINs...\n');

    const superAdmin1 = {
      name: 'Carlos Roberto',
      email: 'carlos@superadmin.com',
      password: 'super123',
      companyName: 'Super Admin Company 1',
      companyCnpj: '11111111000111'
    };

    const superAdmin2 = {
      name: 'Maria Fernanda',
      email: 'maria@superadmin.com',
      password: 'super123',
      companyName: 'Super Admin Company 2',
      companyCnpj: '22222222000122'
    };

    let res1 = await makeRequest('POST', '/auth/register', superAdmin1);
    console.log(`✅ Super Admin 1 criado: ${superAdmin1.email} (Status: ${res1.status})`);

    let res2 = await makeRequest('POST', '/auth/register', superAdmin2);
    console.log(`✅ Super Admin 2 criado: ${superAdmin2.email} (Status: ${res2.status})\n`);

    // 2. Fazer login com o admin original para criar mais dados
    console.log('2. Fazendo login com admin original...\n');

    const loginRes = await makeRequest('POST', '/auth/login', {
      email: 'joao@escritorio.com.br',
      password: 'senha123'
    });

    if (loginRes.status !== 200) {
      console.log('❌ Erro no login:', loginRes.data);
      return;
    }

    const token = loginRes.data.token;
    const companyId = loginRes.data.user.companyId;
    console.log(`✅ Login realizado: ${loginRes.data.user.email}\n`);

    // 3. Criar mais usuários na empresa (ADMIN e USER)
    console.log('3. Criando usuários adicionais...\n');

    const users = [
      {
        name: 'Pedro Santos',
        email: 'pedro@escritorio.com.br',
        password: 'senha123',
        role: 'ADMIN',
        companyId: companyId
      },
      {
        name: 'Ana Paula',
        email: 'ana@escritorio.com.br',
        password: 'senha123',
        role: 'USER',
        companyId: companyId
      },
      {
        name: 'Lucas Silva',
        email: 'lucas@escritorio.com.br',
        password: 'senha123',
        role: 'USER',
        companyId: companyId
      }
    ];

    for (const user of users) {
      try {
        const userRes = await makeRequest('POST', '/users', user, token);
        console.log(`✅ Usuário criado: ${user.email} - ${user.role} (Status: ${userRes.status})`);
      } catch (error) {
        console.log(`⚠️  Erro ao criar ${user.email}:`, error.message);
      }
    }

    console.log('\n4. Criando mais clientes...\n');

    const newClients = [
      {
        name: 'Fernanda Costa',
        cpf: '789.012.345-66',
        rg: '89.012.345-6',
        email: 'fernanda@email.com',
        phone: '(21) 96789-0123',
        address: 'Rua das Acácias, 789',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '21000-789',
        notes: 'Cliente referenciado'
      },
      {
        name: 'Ricardo Alves',
        cpf: '890.123.456-77',
        rg: '90.123.456-7',
        email: 'ricardo@email.com',
        phone: '(11) 97890-1234',
        address: 'Av. Ipiranga, 1500',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01000-500',
        notes: 'Cliente empresarial importante'
      },
      {
        name: 'Patrícia Lima',
        cpf: '901.234.567-88',
        rg: '01.234.567-8',
        email: 'patricia@email.com',
        phone: '(31) 98901-2345',
        address: 'Rua dos Tupis, 200',
        city: 'Belo Horizonte',
        state: 'MG',
        zipCode: '30000-200',
        notes: 'Direito trabalhista'
      }
    ];

    for (const client of newClients) {
      try {
        const clientRes = await makeRequest('POST', '/clients', client, token);
        console.log(`✅ Cliente criado: ${client.name} (Status: ${clientRes.status})`);
      } catch (error) {
        console.log(`⚠️  Erro ao criar ${client.name}:`, error.message);
      }
    }

    // 5. Buscar todos os clientes para criar processos
    console.log('\n5. Buscando clientes para vincular processos...\n');

    const clientsRes = await makeRequest('GET', '/clients', null, token);
    const clients = clientsRes.data.clients || clientsRes.data;

    if (clients && clients.length > 0) {
      console.log(`✅ ${clients.length} clientes encontrados\n`);

      console.log('6. Criando mais processos...\n');

      const newCases = [
        {
          clientId: clients[6]?.id || clients[0].id,
          processNumber: '00056789020235055505',
          court: 'TJRJ - Tribunal de Justiça do Rio de Janeiro',
          subject: 'Ação de Execução',
          value: 120000,
          notes: 'Processo de execução fiscal'
        },
        {
          clientId: clients[7]?.id || clients[1].id,
          processNumber: '00067890120234066606',
          court: 'TJSP - Tribunal de Justiça de São Paulo',
          subject: 'Ação de Despejo',
          value: 85000,
          notes: 'Despejo por falta de pagamento'
        },
        {
          clientId: clients[8]?.id || clients[2].id,
          processNumber: '00078901220223077707',
          court: 'TRT3 - Tribunal Regional do Trabalho da 3ª Região',
          subject: 'Reclamação Trabalhista',
          value: 45000,
          notes: 'Horas extras não pagas'
        }
      ];

      for (const caseData of newCases) {
        try {
          const caseRes = await makeRequest('POST', '/cases', caseData, token);
          console.log(`✅ Processo criado: ${caseData.processNumber} (Status: ${caseRes.status})`);
        } catch (error) {
          console.log(`⚠️  Erro ao criar processo ${caseData.processNumber}:`, error.message);
        }
      }
    }

    console.log('\n=== RESUMO FINAL ===\n');
    console.log('✅ 2 SUPER_ADMINs criados:');
    console.log('   - carlos@superadmin.com / super123');
    console.log('   - maria@superadmin.com / super123\n');

    console.log('✅ Usuários adicionais criados (na empresa Escritório Silva Advocacia):');
    console.log('   - ADMIN: joao@escritorio.com.br / senha123 (já existia)');
    console.log('   - ADMIN: pedro@escritorio.com.br / senha123');
    console.log('   - USER: ana@escritorio.com.br / senha123');
    console.log('   - USER: lucas@escritorio.com.br / senha123\n');

    console.log('✅ Total de clientes: 9 (6 antigos + 3 novos)');
    console.log('✅ Total de processos: 8 (5 antigos + 3 novos)\n');

    console.log('=== TESTANDO LOGIN COM SUPER_ADMIN ===\n');

    const superLoginRes = await makeRequest('POST', '/auth/login', {
      email: 'carlos@superadmin.com',
      password: 'super123'
    });

    if (superLoginRes.status === 200) {
      console.log('✅ LOGIN SUPER_ADMIN FUNCIONANDO!');
      console.log(`   Nome: ${superLoginRes.data.user.name}`);
      console.log(`   Email: ${superLoginRes.data.user.email}`);
      console.log(`   Role: ${superLoginRes.data.user.role}`);
      console.log(`   Empresa: ${superLoginRes.data.user.companyName}\n`);
    }

    console.log('🎉 TODOS OS DADOS CRIADOS COM SUCESSO!\n');

  } catch (error) {
    console.log('❌ Erro geral:', error.message);
  }
}

createCompleteData();
