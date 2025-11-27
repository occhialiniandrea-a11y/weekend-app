// Script per generare VAPID keys
// Eseguire una sola volta con: node generate-vapid-keys.js

const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n=================================');
console.log('VAPID KEYS GENERATE');
console.log('=================================\n');
console.log('Aggiungi queste chiavi al tuo file .env.local:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('\n=================================\n');
console.log('⚠️  IMPORTANTE: Non condividere mai la chiave privata!\n');
