import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';

type StoredFile = {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSizeBytes: number;
};

export async function storePrescriptionPdf(input: {
  prescriptionId: string;
  patientId: string;
  content: Buffer;
  version?: number;
}): Promise<StoredFile> {
  const folderPath = path.resolve(env.STORAGE_DIR, 'prescriptions', input.patientId);
  await fs.mkdir(folderPath, { recursive: true });

  const fileName = input.version
    ? `${input.prescriptionId}-v${input.version}.pdf`
    : `${input.prescriptionId}.pdf`;
  const absoluteFilePath = path.join(folderPath, fileName);
  await fs.writeFile(absoluteFilePath, input.content);

  const relativePath = `prescriptions/${input.patientId}/${fileName}`;
  const normalizedBase = env.STORAGE_PUBLIC_BASE_URL.endsWith('/')
    ? env.STORAGE_PUBLIC_BASE_URL.slice(0, -1)
    : env.STORAGE_PUBLIC_BASE_URL;

  return {
    fileName,
    fileUrl: `${normalizedBase}/${relativePath}`,
    mimeType: 'application/pdf',
    fileSizeBytes: input.content.byteLength
  };
}
