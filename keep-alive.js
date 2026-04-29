const API_URL = 'https://mangadex-c7bo.onrender.com/api/sources';
const INTERVAL = 10 * 60 * 1000; // 10 minutes

async function ping() {
  try {
    const response = await fetch(API_URL);
    const status = response.ok ? '✅' : '❌';
    console.log(`[${new Date().toISOString()}] ${status} Ping: ${response.status}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error:`, error.message);
  }
}

console.log(`🚀 Keep-alive service started for ${API_URL}`);
console.log(`⏰ Pinging every ${INTERVAL / 60000} minutes\n`);

ping();
setInterval(ping, INTERVAL);
