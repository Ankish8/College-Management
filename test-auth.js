// Test authentication by making a request with cookie
const http = require('http');

function testAuth() {
  console.log('Testing authentication...');
  
  // First, try to get session info
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/session',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Session Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Session Response:', data);
      
      if (res.statusCode === 200) {
        const session = JSON.parse(data);
        if (session.user) {
          console.log('✅ User is authenticated:', session.user.email);
          console.log('User ID:', session.user.id);
          console.log('User Role:', session.user.role);
        } else {
          console.log('❌ No user in session');
        }
      } else {
        console.log('❌ Not authenticated');
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Request error: ${e.message}`);
  });

  req.end();
}

testAuth();