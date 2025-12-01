const fs = require('fs');
const crypto = require('crypto');
const jwtSecret = process.env.JWT_SECRET || 'super-secret-jwt-key-with-at-least-32-characters-change-this';
function base64url(str){return Buffer.from(str).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
function createJWT(payload){
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', jwtSecret).update(encodedHeader + '.' + encodedPayload).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return encodedHeader + '.' + encodedPayload + '.' + signature;
}
const now = Math.floor(Date.now()/1000), exp = now + 315360000;
console.log('SUPABASE_ANON_KEY=' + createJWT({ role: 'anon', iss: 'supabase', iat: now, exp: exp }));
console.log('SUPABASE_SERVICE_ROLE_KEY=' + createJWT({ role: 'service_role', iss: 'supabase', iat: now, exp: exp }));
