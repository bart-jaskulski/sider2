/**
 * Encodes a Unicode string to a Base64 string.
 * Breaks the input into chunks to avoid exceeding maximum call stack size.
 *
 * @param {string} str The Unicode string to encode.
 * @returns {string} The Base64 encoded string.
 */
export function base64EncodeUnicode(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str); // UTF-8 encoded Uint8Array

  const chunkSize = 1024; // Adjust chunk size as needed
  let binaryString = '';

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    binaryString += String.fromCharCode(...chunk);
  }

  return btoa(binaryString);
}
