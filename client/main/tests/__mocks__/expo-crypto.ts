/**
 * Jest mock for expo-crypto.
 * Uses Node.js built-in crypto so SHA-256 output is real and tests remain meaningful.
 */
import { createHash, randomBytes } from 'crypto';

export enum CryptoDigestAlgorithm {
  SHA1 = 'SHA-1',
  SHA256 = 'SHA-256',
  SHA384 = 'SHA-384',
  SHA512 = 'SHA-512',
  MD2 = 'MD2',
  MD4 = 'MD4',
  MD5 = 'MD5',
}

export enum CryptoEncoding {
  BASE64 = 'base64',
  HEX = 'hex',
}

const ALGO_MAP: Record<string, string> = {
  'SHA-1': 'sha1',
  'SHA-256': 'sha256',
  'SHA-384': 'sha384',
  'SHA-512': 'sha512',
  MD5: 'md5',
};

export function getRandomBytes(byteCount: number): Uint8Array {
  return new Uint8Array(randomBytes(byteCount));
}

export function getRandomValues<T extends ArrayBufferView>(array: T): T {
  const buf = randomBytes(array.byteLength);
  new Uint8Array(array.buffer, array.byteOffset, array.byteLength).set(
    new Uint8Array(buf),
  );
  return array;
}

export async function digestStringAsync(
  algorithm: CryptoDigestAlgorithm,
  data: string,
  options: { encoding: CryptoEncoding } = { encoding: CryptoEncoding.HEX },
): Promise<string> {
  const nodeAlgo = ALGO_MAP[algorithm] ?? algorithm.toLowerCase();
  return createHash(nodeAlgo)
    .update(data, 'utf8')
    .digest(options.encoding === CryptoEncoding.HEX ? 'hex' : 'base64');
}
