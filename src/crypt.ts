interface EncryptionData {
  ct: string;
  iv: string;
  s: string;
}

async function encrypt(data: string, key: string): Promise<string> {
  let salt = "";
  let salted = "";
  let dx = new Uint8Array(0);

  // Generate salt, as 8 random lowercase letters
  const saltArray = new Uint8Array(8);
  crypto.getRandomValues(saltArray);
  salt = Array.from(saltArray, (byte) =>
    String.fromCharCode(97 + (byte % 26))
  ).join("");

  // Our final key and iv come from the key and salt being repeatedly hashed
  // dx = md5(md5(md5(key + salt) + key + salt) + key + salt)
  // For each round of hashing, we append the result to salted, resulting in a 96 character string
  // The first 64 characters are the key, and the last 32 are the iv
  for (let x = 0; x < 3; x++) {
    const dataToHash = new TextEncoder().encode(salted + key + salt);
    const hashBuffer = await crypto.subtle.digest("MD5", dataToHash);
    dx = new Uint8Array([...new Uint8Array(dx), ...new Uint8Array(hashBuffer)]);
    salted += Array.from(new Uint8Array(hashBuffer), (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
  }

  const keyBytes = new Uint8Array(dx.slice(0, 32));
  const ivBytes = new Uint8Array(dx.slice(32, 64));

  const encodedData = new TextEncoder().encode(data);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CBC" },
    false,
    ["encrypt"]
  );
  const encryptedDataBuffer = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv: ivBytes },
    cryptoKey,
    encodedData
  );
  const encryptedDataArray = Array.from(new Uint8Array(encryptedDataBuffer));
  const encryptedData = btoa(String.fromCharCode(...encryptedDataArray));

  return JSON.stringify({
    ct: encryptedData,
    iv: salted.substring(64, 64 + 32),
    s: Array.from(new TextEncoder().encode(salt), (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join(""),
  });
}

async function decrypt(rawData: string, key: string): Promise<string> {
  let data: EncryptionData = JSON.parse(rawData);

  // We get our decryption key by doing the inverse of the encryption process
  let dk = new TextEncoder().encode(key + data.s);
  let arr = [
    Array.from(new Uint8Array(await crypto.subtle.digest("MD5", dk)), (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join(""),
  ];
  let result = arr[0];

  for (let x = 1; x < 3; x++) {
    dk = new Uint8Array([
      ...new Uint8Array(await crypto.subtle.digest("MD5", dk)),
      ...new TextEncoder().encode(key + data.s),
    ]);
    arr.push(
      Array.from(
        new Uint8Array(await crypto.subtle.digest("MD5", dk)),
        (byte) => byte.toString(16).padStart(2, "0")
      ).join("")
    );
    result += arr[x];
  }

  const keyBytes = new TextEncoder().encode(result.slice(0, 64)).buffer;
  const ivBytes = new Uint8Array(new TextEncoder().encode(data.iv));

  const decodedData = atob(data.ct);
  const decodedDataArray = new Uint8Array(decodedData.length);
  for (let i = 0; i < decodedData.length; i++) {
    decodedDataArray[i] = decodedData.charCodeAt(i);
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );
  const decryptedDataBuffer = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: ivBytes },
    cryptoKey,
    decodedDataArray
  );
  const decryptedData = new TextDecoder().decode(decryptedDataBuffer);

  return decryptedData;
}

export default {
  encrypt,
  decrypt,
};
