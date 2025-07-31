// Debug script to check authentication status
// Run this in the browser console on http://localhost:3000

console.log('=== CareTrack Pro Debug Info ===');
console.log('1. Auth Token:', localStorage.getItem('authToken'));
console.log('2. Current URL:', window.location.href);

// Test API calls
const token = localStorage.getItem('authToken');
if (token) {
  console.log('3. Testing API calls...');
  
  // Test admin users
  fetch('http://localhost:3001/api/users/admins', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => console.log('4a. Admin Users API:', data))
  .catch(error => console.error('4a. Admin Users API Error:', error));
  
  // Test carers
  fetch('http://localhost:3001/api/users/carers', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => console.log('4b. Carers API:', data))
  .catch(error => console.error('4b. Carers API Error:', error));
} else {
  console.log('3. No auth token found - you need to login first');
  console.log('4. Go to: http://localhost:3000/login');
  console.log('5. Login with: admin@caretrack.com / admin123');
}

console.log('==========================================');