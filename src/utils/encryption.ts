import CryptoJS from 'crypto-js';

export const encryptData = (data: string, password: string): string => {
  return CryptoJS.AES.encrypt(data, password).toString();
};

export const decryptData = (encryptedData: string, password: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, password);
  return bytes.toString(CryptoJS.enc.Utf8);
};
