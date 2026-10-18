import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
const COST = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, COST, (error, key) => (error ? reject(error) : resolve(key))),
  );
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `scrypt$131072$8$1$${salt.toString("hex")}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const parts = encoded.split("$");
  if (
    parts.length !== 6 ||
    parts.slice(0, 4).join("$") !== "scrypt$131072$8$1" ||
    !/^[a-f0-9]{32}$/.test(parts[4]) ||
    !/^[a-f0-9]{128}$/.test(parts[5])
  )
    return false;
  return timingSafeEqual(
    await derive(password, Buffer.from(parts[4], "hex")),
    Buffer.from(parts[5], "hex"),
  );
}
// Same KDF work for a missing account, without retaining any known credential.
export const DUMMY_PASSWORD_HASH = `scrypt$131072$8$1$${"0".repeat(32)}$${"0".repeat(128)}`;
