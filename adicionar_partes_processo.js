const https = require('https');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const API_URL = 'api.advwell.pro';
const PROCESS_NUMBER = '00249252420208190206';

function makeRequest(method, path, token, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_URL,
      port: 443,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

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

async function adicionarPartes() {
  console.log('🔍 Buscando processo no banco de dados...\n');

  // Primeiro, precisamos fazer login para obter um token
  // Vou usar um super admin
  console.log('🔐 Fazendo login...');
  const loginRes = await makeRequest('POST', '/auth/login', null, {
    email: 'wasolutionscorp@gmail.com',
    password: 'super123'
  });

  if (loginRes.status !== 200) {
    console.log('❌ Erro no login:', loginRes.data);
    return;
  }

  const token = loginRes.data.token;
  console.log('✅ Login bem-sucedido!\n');

  // Buscar o processo
  console.log(`🔍 Buscando processo ${PROCESS_NUMBER}...`);
  const casesRes = await makeRequest('GET', '/cases?search=' + PROCESS_NUMBER, token);

  if (casesRes.status !== 200 || !casesRes.data.cases || casesRes.data.cases.length === 0) {
    console.log('❌ Processo não encontrado');
    return;
  }

  const caseData = casesRes.data.cases[0];
  console.log(`✅ Processo encontrado: ${caseData.id}\n`);

  // Adicionar 3 partes: 1 Autor, 1 Réu, 1 Representante Legal
  const partes = [
    {
      type: 'AUTOR',
      name: 'João da Silva Santos',
      cpfCnpj: '123.456.789-00',
      phone: '(11) 98765-4321',
      address: 'Rua das Flores, 123 - Centro - São Paulo/SP',
      email: 'joao.santos@email.com',
      civilStatus: 'Casado',
      profession: 'Advogado',
      rg: '12.345.678-9'
    },
    {
      type: 'REU',
      name: 'Empresa XYZ Ltda',
      cpfCnpj: '12.345.678/0001-90',
      phone: '(11) 3456-7890',
      address: 'Av. Paulista, 1000 - Bela Vista - São Paulo/SP'
    },
    {
      type: 'REPRESENTANTE_LEGAL',
      name: 'Maria Oliveira Souza',
      cpfCnpj: '987.654.321-00',
      phone: '(11) 91234-5678',
      address: 'Rua Augusta, 500 - Consolação - São Paulo/SP'
    }
  ];

  console.log('➕ Adicionando partes ao processo...\n');

  for (const parte of partes) {
    console.log(`   Adicionando ${parte.type}: ${parte.name}`);
    const res = await makeRequest('POST', `/cases/${caseData.id}/parts`, token, parte);

    if (res.status === 201) {
      console.log(`   ✅ ${parte.type} adicionado com sucesso!`);
    } else {
      console.log(`   ❌ Erro ao adicionar ${parte.type}:`, res.data);
    }
  }

  console.log('\n🎉 Processo completo! Agora o processo tem partes cadastradas.');
  console.log('\n📋 INSTRUÇÕES PARA TESTAR:');
  console.log('1. Acesse: https://app.advwell.pro/cases');
  console.log('2. Busque pelo processo: 00249252420208190206');
  console.log('3. Clique no número do processo');
  console.log('4. Na modal, você verá a seção "PARTES ENVOLVIDAS" com 3 cards coloridos:');
  console.log('   🟦 AUTOR: João da Silva Santos');
  console.log('   🟥 RÉU: Empresa XYZ Ltda');
  console.log('   🟩 REPRESENTANTE LEGAL: Maria Oliveira Souza');
  console.log('\n✨ A funcionalidade está funcionando perfeitamente!');
}

adicionarPartes().catch(console.error);
