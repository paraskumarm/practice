import fs from 'fs';
import path from 'path';

const INPUT_DIR = './input';
const sources = ['edge-a','edge-b'];
const endpoints = ['/api/v1/users','/api/v1/orders','/api/v1/inventory'];
const clients = Array.from({length:50}, (_,i)=>`client-${i+1}`);

function ensureDirs() { for (const s of sources) fs.mkdirSync(path.join(INPUT_DIR, s), { recursive: true }); }

function appendLogs() {
  for (const s of sources) {
    const file = path.join(INPUT_DIR, s, 'log.jsonl');
    const batch: string[] = [];
    for (let i=0;i<200;i++) {
      const clientId = clients[Math.floor(Math.random()*clients.length)];
      const endpoint = endpoints[Math.floor(Math.random()*endpoints.length)];
      const latency = Math.round(Math.random()*400)+50;
      const status = Math.random()<0.95?200: (Math.random()<0.5?500:429);
      const obj = { sourceId: s, clientId, endpoint, latencyMs: latency, statusCode: status, requestBytes: 500+Math.round(Math.random()*500), responseBytes: 800+Math.round(Math.random()*800), timestamp: Date.now() };
      batch.push(JSON.stringify(obj));
    }
    fs.appendFileSync(file, batch.join('\n')+'\n');
  }
}

ensureDirs();
setInterval(appendLogs, 3000);
console.log('Simulation started: appending logs every 3s');
