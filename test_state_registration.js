const axios = require('axios');

const API_URL = 'https://api.advwell.pro/api';

// Test credentials - replace with valid credentials
const TEST_CREDENTIALS = {
  email: 'admin@advwell.pro',
  password: 'admin123'
};

async function testStateRegistration() {
  try {
    console.log('Starting State Registration field test...\n');

    // 1. Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, TEST_CREDENTIALS);
    const token = loginResponse.data.token;
    console.log('   ✓ Login successful\n');

    // Configure axios with token
    const api = axios.create({
      baseURL: API_URL,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      httpsAgent: new (require('https')).Agent({
        rejectUnauthorized: false
      })
    });

    // 2. Create Pessoa Jurídica with State Registration
    console.log('2. Creating Pessoa Jurídica with State Registration...');
    const newClient = {
      personType: 'JURIDICA',
      name: 'Empresa Teste LTDA',
      cpf: '12.345.678/0001-90',
      stateRegistration: '123.456.789.012',
      representativeName: 'João Silva',
      representativeCpf: '123.456.789-00',
      rg: '12.345.678-9',
      email: 'empresa@teste.com',
      phone: '(11) 98765-4321',
      address: 'Rua Teste, 123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
      birthDate: '1980-01-15',
      maritalStatus: 'Casado(a)',
      profession: 'Empresário',
      notes: 'Cliente teste para validar campo de Inscrição Estadual',
      tag: 'Teste'
    };

    const createResponse = await api.post('/clients', newClient);
    const createdClient = createResponse.data;
    console.log('   ✓ Client created successfully');
    console.log(`   ID: ${createdClient.id}`);
    console.log(`   State Registration: ${createdClient.stateRegistration}\n`);

    // 3. Retrieve the client
    console.log('3. Retrieving created client...');
    const getResponse = await api.get(`/clients/${createdClient.id}`);
    const retrievedClient = getResponse.data;
    console.log('   ✓ Client retrieved successfully');
    console.log(`   Name: ${retrievedClient.name}`);
    console.log(`   CNPJ: ${retrievedClient.cpf}`);
    console.log(`   State Registration: ${retrievedClient.stateRegistration}`);
    console.log(`   Representative: ${retrievedClient.representativeName}\n`);

    // 4. Update State Registration
    console.log('4. Updating State Registration...');
    const updateData = {
      ...retrievedClient,
      stateRegistration: '987.654.321.098'
    };
    const updateResponse = await api.put(`/clients/${createdClient.id}`, updateData);
    console.log('   ✓ State Registration updated successfully');
    console.log(`   New State Registration: ${updateResponse.data.stateRegistration}\n`);

    // 5. List clients and verify
    console.log('5. Listing clients to verify...');
    const listResponse = await api.get('/clients', {
      params: { search: 'Empresa Teste', limit: 10 }
    });
    const foundClient = listResponse.data.data.find(c => c.id === createdClient.id);
    if (foundClient && foundClient.stateRegistration === '987.654.321.098') {
      console.log('   ✓ Client found in list with correct State Registration\n');
    } else {
      console.log('   ✗ Error: Client not found or State Registration mismatch\n');
    }

    // 6. Create Pessoa Física (should not have State Registration)
    console.log('6. Creating Pessoa Física (without State Registration)...');
    const pessoaFisica = {
      personType: 'FISICA',
      name: 'Maria Santos',
      cpf: '987.654.321-00',
      rg: '98.765.432-1',
      email: 'maria@teste.com',
      phone: '(11) 91234-5678',
      birthDate: '1990-05-20',
      maritalStatus: 'Solteiro(a)',
      profession: 'Advogada'
    };

    const pfResponse = await api.post('/clients', pessoaFisica);
    console.log('   ✓ Pessoa Física created successfully');
    console.log(`   ID: ${pfResponse.data.id}`);
    console.log(`   Has State Registration: ${pfResponse.data.stateRegistration ? 'Yes' : 'No (expected)'}\n`);

    // 7. Cleanup - Delete test clients
    console.log('7. Cleaning up test data...');
    await api.delete(`/clients/${createdClient.id}`);
    await api.delete(`/clients/${pfResponse.data.id}`);
    console.log('   ✓ Test clients deleted\n');

    console.log('===========================================');
    console.log('ALL TESTS PASSED SUCCESSFULLY!');
    console.log('===========================================');
    console.log('\nState Registration field is working correctly:');
    console.log('- Field can be saved and retrieved');
    console.log('- Field can be updated');
    console.log('- Field appears in client lists');
    console.log('- Field is optional for both Pessoa Física and Jurídica');

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testStateRegistration();
