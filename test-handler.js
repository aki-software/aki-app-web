const handler = require('./apps/api/api/index.js');
console.log('Handler loaded, invoking...');
handler({}, {
  status: (code) => {
    console.log('Status:', code);
    return { send: (msg) => console.log('Send:', msg), json: (msg) => console.log('JSON:', msg) };
  },
  send: (msg) => console.log('Send:', msg),
  json: (msg) => console.log('JSON:', msg),
  setHeader: () => {}
}).then(() => console.log('Done')).catch(err => console.error('Error:', err));
