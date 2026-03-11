const http = require('http');

async function testComplete() {
  console.log('🔄 Triggering complete session...');
  
  const createRes = await fetch('http://localhost:3000/api/v1/sessions/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: '45dcd889-7cfc-4d37-af5e-998fe04ce0fc', // a valid-looking uuid, we'll see if it fails
      catalogVersion: 'assets-v1',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      resultPayload: {
         hollandCode: 'RIE',
         radar: [
           { categoryId: 'REALISTIC', score: 10, total: 10, affinity: 100 },
           { categoryId: 'INVESTIGATIVE', score: 8, total: 10, affinity: 80 }
         ],
         top3: [],
         bottom3: []
      },
      swipes: []
    })
  });
  
  const data = await createRes.text();
  console.log('Status code:', createRes.status);
  console.log('Response body:', data);
}

testComplete().catch(console.error);
