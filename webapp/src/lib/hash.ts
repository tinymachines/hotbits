// Human-friendly hash generator based on serial.py

const BS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SALT = "54l71554l7y";

function toBase(s: number, b: number): string {
  let res = "";
  while (s) {
    res += BS[s % b];
    s = Math.floor(s / b);
  }
  return res.split('').reverse().join('') || "0";
}

async function toHash(i: string): Promise<Uint8Array> {
  const x = `${SALT}${i}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(x);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

export async function getSerial(s: string, length: number = 6): Promise<string> {
  const hash = await toHash(s);
  
  // Convert first 31 bytes to big integer (similar to Python's int.from_bytes)
  let hashint = 0;
  for (let i = 0; i < Math.min(31, hash.length); i++) {
    hashint = hashint * 256 + hash[i];
  }
  
  const converted = toBase(hashint, 32);
  const token = converted.padEnd(8, BS[0]);
  return token.substring(0, length);
}