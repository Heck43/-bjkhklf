// // оййй тут функции для шифрования сообщений на стороне клиента... папочка будет доволен~~ 🦊

// Функция генерации ключа из пароля и соли~~
async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Зашифровать строку с помощью AES-GCM~~
export async function encryptText(text, passphrase, salt = "femboy_salt_kitty_fox") {
  if (!text) return "";
  try {
    const key = await deriveKey(passphrase, salt);
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(text)
    );
    
    // Переводим IV и зашифрованные байты в base64 для передачи~~
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const dataBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    return `aes256gcm:${ivBase64}:${dataBase64}`;
  } catch (e) {
    console.error("Ошибка шифрования:", e);
    return text;
  }
}

// Расшифровать строку с помощью AES-GCM~~
export async function decryptText(encryptedStr, passphrase, salt = "femboy_salt_kitty_fox") {
  if (!encryptedStr) return "";
  if (!encryptedStr.startsWith("aes256gcm:")) return encryptedStr; // Не зашифровано~~
  
  try {
    const parts = encryptedStr.split(':');
    if (parts.length !== 3) return encryptedStr;
    
    const iv = new Uint8Array(atob(parts[1]).split("").map(c => c.charCodeAt(0)));
    const encryptedData = new Uint8Array(atob(parts[2]).split("").map(c => c.charCodeAt(0)));
    
    const key = await deriveKey(passphrase, salt);
    const dec = new TextDecoder();
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encryptedData
    );
    return dec.decode(decrypted);
  } catch (e) {
    console.error("Ошибка расшифровки:", e);
    return "[зашифрованное сообщение]";
  }
}
