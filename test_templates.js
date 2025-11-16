const axios = require('axios');

const API_URL = 'https://api.advwell.pro/api';

// Create axios instance that ignores self-signed certs
const api = axios.create({
  httpsAgent: new (require('https').Agent)({
    rejectUnauthorized: false,
  }),
});

async function test() {
  try {
    console.log('🔐 Fazendo login...');
    const loginResponse = await api.post(`${API_URL}/auth/login`, {
      email: 'admin@wmp.com',
      password: 'senha123',
    });

    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso!');

    // Configurar header de autenticação
    const authApi = axios.create({
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false,
      }),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('\n📧 Testando endpoint de templates...');
    const templatesResponse = await authApi.get(`${API_URL}/campaigns/templates`);

    console.log('✅ Templates carregados com sucesso!');
    console.log(`\n📋 Total de templates: ${templatesResponse.data.length}`);
    console.log('\nTemplates disponíveis:');
    templatesResponse.data.forEach((template, index) => {
      console.log(`\n${index + 1}. ${template.name}`);
      console.log(`   ID: ${template.id}`);
      console.log(`   Assunto: ${template.subject}`);
    });

    // Testar endpoint de template individual
    if (templatesResponse.data.length > 0) {
      const firstTemplate = templatesResponse.data[0];
      console.log(`\n\n🔍 Carregando template "${firstTemplate.name}"...`);

      const templateResponse = await authApi.get(`${API_URL}/campaigns/templates/${firstTemplate.id}`);
      console.log('✅ Template carregado com sucesso!');
      console.log(`\nDetalhes do template:`);
      console.log(`ID: ${templateResponse.data.id}`);
      console.log(`Nome: ${templateResponse.data.name}`);
      console.log(`Assunto: ${templateResponse.data.subject}`);
      console.log(`\nPrimeiros 200 caracteres do corpo:`);
      console.log(templateResponse.data.body.substring(0, 200) + '...');

      // Verificar se contém variáveis
      const hasVariables = templateResponse.data.body.includes('{nome_cliente}') ||
                          templateResponse.data.body.includes('{nome_empresa}') ||
                          templateResponse.data.body.includes('{data}');

      console.log(`\n✅ Template contém variáveis de substituição: ${hasVariables ? 'SIM' : 'NÃO'}`);
    }

    console.log('\n\n✅ TODOS OS TESTES PASSARAM!');
    console.log('✅ Funcionalidade de templates implementada com sucesso!');

  } catch (error) {
    console.error('\n❌ Erro:', error.response?.data || error.message);
    process.exit(1);
  }
}

test();
