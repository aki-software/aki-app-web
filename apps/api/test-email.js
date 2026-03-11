const http = require('http');

async function testEmail() {
  console.log('🔄 Creating a session...');
  
  const createRes = await fetch('http://localhost:3000/api/v1/sessions/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      resultPayload: {
        hollandCode: 'RIE',
        radar: [
          { categoryId: 'REALISTIC', score: 10, total: 10, affinity: 100 },
          { categoryId: 'INVESTIGATIVE', score: 8, total: 10, affinity: 80 },
          { categoryId: 'ENTERPRISING', score: 5, total: 10, affinity: 50 }
        ]
      },
      swipes: []
    })
  });
  
  const data = await createRes.json();
  if (!createRes.ok) {
    console.error('❌ Failed to create session:', data);
    return;
  }
  
  const sessionId = data.id;
  console.log(`✅ Session created: ${sessionId}`);
  console.log('🔄 Triggering email send...');

  const emailRes = await fetch(`http://localhost:3000/api/v1/sessions/${sessionId}/send-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@akit.app' })
  });
  
  const emailData = await emailRes.json();
  if (!emailRes.ok) {
    console.error('❌ Failed to send email:', emailData);
  } else {
    console.log('✅ Email trigger response:', emailData);
  }
}

testEmail().catch(console.error);
