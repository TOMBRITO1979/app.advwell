const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.advwell.pro/api',
  httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
});

async function checkSuperAdmin() {
  console.log('🔍 VERIFICANDO USUÁRIO SUPERADMIN\n');

  // Listar todos os superadmins
  const users = [
    { email: 'wasolutionscorp@gmail.com', password: 'Teste123!' },
    { email: 'admin@costaassociados.adv.br', password: 'Teste123!' },
    { email: 'admin@mendespereira.com.br', password: 'Teste123!' }
  ];

  for (const user of users) {
    try {
      const loginRes = await api.post('/auth/login', {
        email: user.email,
        password: user.password
      });

      const token = loginRes.data.token;
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const meRes = await api.get('/auth/me');
      const userData = meRes.data;

      console.log(`✅ ${user.email}`);
      console.log(`   Nome: ${userData.name}`);
      console.log(`   Role: ${userData.role}`);
      console.log(`   Empresa ID: ${userData.companyId}`);
      console.log('');

      if (userData.role === 'SUPER_ADMIN') {
        console.log('👑 ESTE É O SUPERADMIN!\n');

        // Buscar clientes desta empresa
        const clientsRes = await api.get('/clients?limit=5');
        console.log('   Clientes nesta empresa:', clientsRes.data.total || clientsRes.data.data?.length || 0);
        if (clientsRes.data.data && clientsRes.data.data.length > 0) {
          console.log('   Primeiro cliente:', clientsRes.data.data[0].name);
        }
        console.log('');
      }

    } catch (error) {
      console.log(`❌ ${user.email} - Erro: ${error.response?.data?.error || error.message}\n`);
    }
  }
}

checkSuperAdmin().catch(console.error);
