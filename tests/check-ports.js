// Check which ports are listening
import net from 'net';

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve({ port, open: false });
    }, 1500);
    socket.once('connect', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve({ port, open: true });
    });
    socket.once('error', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve({ port, open: false });
    });
    socket.connect(port, '127.0.0.1');
  });
}

(async () => {
  for (const port of [3000, 3002]) {
    const result = await checkPort(port);
    console.log(`Port ${result.port}: ${result.open ? 'OPEN' : 'CLOSED'}`);
  }
})();

