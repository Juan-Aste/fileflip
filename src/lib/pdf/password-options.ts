// Shared by the password tools' page and the PDF worker (kept free of pdf-lib).
export interface Permissions {
  print: boolean;
  copy: boolean;
  modify: boolean;
}

export const MAX_PASSWORD_LENGTH = 128;
