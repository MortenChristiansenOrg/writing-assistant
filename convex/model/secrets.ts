const KEY_VERSION = 1
const IV_BYTES = 12

export interface EncryptedSecret {
  ciphertext: string
  iv: string
  version: number
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const encodedKey = process.env.CREDENTIAL_ENCRYPTION_KEY
  if (!encodedKey) throw new Error('Credential encryption is not configured')

  const keyBytes = base64ToBytes(encodedKey)
  if (keyBytes.byteLength !== 32) {
    throw new Error(
      'CREDENTIAL_ENCRYPTION_KEY must be a base64-encoded 32-byte key',
    )
  }

  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
}

function additionalData(ownerTokenIdentifier: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(
    `writing-assistant|openrouter|v${KEY_VERSION}|${ownerTokenIdentifier}`,
  )
}

export async function encryptSecret(
  plaintext: string,
  ownerTokenIdentifier: string,
): Promise<EncryptedSecret> {
  const key = await getEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: additionalData(ownerTokenIdentifier),
    },
    key,
    new TextEncoder().encode(plaintext),
  )

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
    version: KEY_VERSION,
  }
}

export async function decryptSecret(
  secret: EncryptedSecret,
  ownerTokenIdentifier: string,
): Promise<string> {
  if (secret.version !== KEY_VERSION) {
    throw new Error('Unsupported credential encryption version')
  }

  const key = await getEncryptionKey()
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToBytes(secret.iv),
      additionalData: additionalData(ownerTokenIdentifier),
    },
    key,
    base64ToBytes(secret.ciphertext),
  )

  return new TextDecoder().decode(plaintext)
}
