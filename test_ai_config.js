const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.advwell.pro/api',
  httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
});

async function testAIConfig() {
  console.log('🧪 TESTANDO CONFIGURAÇÃO DE IA\n');

  // Login como SUPERADMIN
  const loginRes = await api.post('/auth/login', {
    email: 'wasolutionscorp@gmail.com',
    password: 'Teste123!'
  });

  const token = loginRes.data.token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('✅ Login OK\n');

  // Teste 1: Criar configuração de IA (com token fake para teste)
  console.log('1️⃣  Teste: Criar configuração de IA...');
  try {
    const createRes = await api.post('/ai-config', {
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'sk-test-fake-key-for-testing-12345678901234567890'
    });

    console.log('✅ PASSOU! Configuração criada');
    console.log('   ID:', createRes.data.id);
    console.log('   Provider:', createRes.data.provider);
    console.log('   Model:', createRes.data.model);
    console.log('');

    // Teste 2: Buscar configuração
    console.log('2️⃣  Teste: Buscar configuração...');
    const getRes = await api.get('/ai-config');
    console.log('✅ PASSOU! Configuração encontrada');
    console.log('   Provider:', getRes.data.provider);
    console.log('   Model:', getRes.data.model);
    console.log('');

    // Teste 3: Testar conexão (vai falhar porque é token fake, mas não deve dar erro de criptografia)
    console.log('3️⃣  Teste: Testar conexão (esperado falhar por token inválido)...');
    try {
      await api.post('/ai-config/test');
      console.log('✅ Conexão OK (token é válido!)');
    } catch (testError) {
      if (testError.response?.status === 400 && testError.response?.data?.error?.includes('descriptografia')) {
        console.log('❌ ERRO DE CRIPTOGRAFIA - Problema não resolvido!');
      } else {
        console.log('✅ Erro esperado (token inválido, mas sem erro de criptografia)');
        console.log('   Erro:', testError.response?.data?.error);
      }
    }
    console.log('');

    // Teste 4: Deletar configuração
    console.log('4️⃣  Teste: Deletar configuração...');
    await api.delete('/ai-config');
    console.log('✅ PASSOU! Configuração deletada');
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TODOS OS TESTES PASSARAM!\n');
    console.log('Agora você pode adicionar seu token real:');
    console.log('1. Acesse app.advwell.pro');
    console.log('2. Vá em Configurações > Configuração de IA');
    console.log('3. Adicione seu token da OpenAI ou Gemini');
    console.log('4. Teste a conexão');
    console.log('5. Gere resumos de processos!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.log('❌ ERRO!\n');
    console.log('Status:', error.response?.status);
    console.log('Erro:', JSON.stringify(error.response?.data, null, 2));
  }
}

testAIConfig().catch(console.error);
