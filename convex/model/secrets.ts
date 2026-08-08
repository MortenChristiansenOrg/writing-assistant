const KEY_VERSION = 1
const IV_BYTES = 12

export interface EncryptedSecret {
  ciphertext: string
  iv: string
  version: number
}

export interface DecryptedSecret {
  plaintext: string
  needsRotation: boolean
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

async function importEncryptionKey(
  encodedKey: string,
  variableName: string,
): Promise<CryptoKey> {
  const keyBytes = base64ToBytes(encodedKey)
  if (keyBytes.byteLength !== 32) {
    throw new Error(`${variableName} must be a base64-encoded 32-byte key`)
  }

  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function getCurrentEncryptionKey(): Promise<CryptoKey> {
  const encodedKey = process.env.CREDENTIAL_ENCRYPTION_KEY
  if (!encodedKey) throw new Error('Credential encryption is not configured')
  return await importEncryptionKey(encodedKey, 'CREDENTIAL_ENCRYPTION_KEY')
}

async function getDecryptionKey(version: number): Promise<CryptoKey | null> {
  if (version === KEY_VERSION) return await getCurrentEncryptionKey()
  const encodedKeyring = process.env.CREDENTIAL_ENCRYPTION_KEYRING
  if (!encodedKeyring) return null

  let keyring: unknown
  try {
    keyring = JSON.parse(encodedKeyring)
  } catch {
    throw new Error('CREDENTIAL_ENCRYPTION_KEYRING must be valid JSON')
  }
  if (
    typeof keyring !== 'object' ||
    keyring === null ||
    Array.isArray(keyring)
  ) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEYRING must be a JSON object')
  }
  const encodedKey = (keyring as Record<string, unknown>)[String(version)]
  if (typeof encodedKey !== 'string') return null
  return await importEncryptionKey(
    encodedKey,
    `CREDENTIAL_ENCRYPTION_KEYRING version ${version}`,
  )
}

function additionalData(
  ownerTokenIdentifier: string,
  version: number,
): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(
    `writing-assistant|openrouter|v${version}|${ownerTokenIdentifier}`,
  )
}

export async function encryptSecret(
  plaintext: string,
  ownerTokenIdentifier: string,
): Promise<EncryptedSecret> {
  const key = await getCurrentEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: additionalData(ownerTokenIdentifier, KEY_VERSION),
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
): Promise<DecryptedSecret | null> {
  try {
    const key = await getDecryptionKey(secret.version)
    if (!key) throw new Error('Unsupported credential encryption version')

    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64ToBytes(secret.iv),
        additionalData: additionalData(
          ownerTokenIdentifier,
          secret.version,
        ),
      },
      key,
      base64ToBytes(secret.ciphertext),
    )

    return {
      plaintext: new TextDecoder().decode(plaintext),
      needsRotation: secret.version !== KEY_VERSION,
    }
  } catch {
    console.error('Stored credential could not be decrypted')
    return null
  }
}
