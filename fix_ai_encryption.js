const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.advwell.pro/api',
  httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
});

async function fixAIEncryption() {
  console.log('🔧 CORRIGINDO PROBLEMA DE CRIPTOGRAFIA DA IA\n');

  // Login como SUPERADMIN
  const loginRes = await api.post('/auth/login', {
    email: 'wasolutionscorp@gmail.com',
    password: 'Teste123!'
  });

  const token = loginRes.data.token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('✅ Login como SUPERADMIN OK\n');

  try {
    // Buscar configuração atual
    console.log('📋 Buscando configuração atual de IA...');
    const getRes = await api.get('/ai-config');

    if (getRes.data) {
      console.log('✅ Configuração encontrada');
      console.log('   Provider:', getRes.data.provider);
      console.log('   Model:', getRes.data.model);
      console.log('');

      // Deletar configuração antiga
      console.log('🗑️  Deletando configuração com token criptografado antigo...');
      await api.delete('/ai-config');
      console.log('✅ Configuração deletada com sucesso!\n');
    }

  } catch (error) {
    if (error.response?.status === 404) {
      console.log('⚠️  Nenhuma configuração de IA encontrada.\n');
    } else {
      console.log('❌ Erro ao buscar/deletar configuração:');
      console.log('Status:', error.response?.status);
      console.log('Erro:', error.response?.data?.error || error.message);
      console.log('');
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ CORREÇÃO CONCLUÍDA!\n');
  console.log('Agora você pode:');
  console.log('1. Ir em app.advwell.pro');
  console.log('2. Acessar Configurações > Configuração de IA');
  console.log('3. Adicionar seu token da OpenAI ou Gemini');
  console.log('4. Testar a conexão');
  console.log('5. Gerar resumos de processos!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

fixAIEncryption().catch(console.error);
