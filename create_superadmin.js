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

async function createSuperAdmin() {
  console.log('Creating SUPER_ADMIN company and user...');

  // Register a new company (this creates an ADMIN, not SUPER_ADMIN)
  const registerRes = await makeRequest('POST', '/auth/register', {
    companyName: 'Super Admin Inc',
    name: 'Super Admin',
    email: 'superadmin@advtom.com',
    password: 'superadmin123'
  });

  if (registerRes.status === 201) {
    console.log('✅ Company and Admin created successfully!');
    console.log('⚠️  Now you need to manually upgrade this user to SUPER_ADMIN role in the database');
    console.log('   Run this SQL command:');
    console.log(`   UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'superadmin@advtom.com';`);
  } else {
    console.log('❌ Error:', registerRes.data);
    console.log('\nUsing existing SUPER_ADMIN credentials for testing:');
    console.log('Email: joao@escritorio.com.br (will test as ADMIN)');
  }
}

createSuperAdmin();
