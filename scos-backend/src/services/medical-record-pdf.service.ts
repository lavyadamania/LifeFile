import PDFDocument from 'pdfkit';

type MedicalRecordPdfInput = {
  recordId: string;
  patientName: string;
  patientMRN: string;
  patientAge?: number;
  patientGender?: string;
  doctorName: string;
  doctorLicense: string;
  recordDate: Date;
  diagnosis?: string;
  symptoms?: string;
  notes?: string;
  followUp?: string;
  prescriptionCount: number;
};

function escapeText(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/\r\n/g, '\n').trim();
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function addSection(doc: any, title: string, content: string | undefined): void {
  if (!content) return;

  doc.fontSize(11).font('Helvetica-Bold').text(title, { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica').text(escapeText(content), {
    indent: 10,
    lineGap: 2
  });
  doc.moveDown(0.5);
}

export async function generateMedicalRecordPdf(input: MedicalRecordPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('MEDICAL RECORD', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').text('_'.repeat(80), { align: 'center' });
    doc.moveDown(1);

    // Doctor Information
    doc.fontSize(11).font('Helvetica-Bold').text('ATTENDING PHYSICIAN', { underline: true });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Name: ${input.doctorName}`, { indent: 10 });
    doc.text(`License: ${input.doctorLicense}`, { indent: 10 });
    doc.moveDown(0.8);

    // Patient Information
    doc.fontSize(11).font('Helvetica-Bold').text('PATIENT INFORMATION', { underline: true });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Name: ${input.patientName}`, { indent: 10 });
    doc.text(`MRN: ${input.patientMRN}`, { indent: 10 });
    if (input.patientAge) {
      doc.text(`Age: ${input.patientAge} years`, { indent: 10 });
    }
    if (input.patientGender) {
      doc.text(`Gender: ${input.patientGender}`, { indent: 10 });
    }
    doc.moveDown(0.8);

    // Record Metadata
    doc.fontSize(11).font('Helvetica-Bold').text('RECORD INFORMATION', { underline: true });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Record ID: ${input.recordId}`, { indent: 10 });
    doc.text(`Date: ${formatDate(input.recordDate)}`, { indent: 10 });
    if (input.prescriptionCount > 0) {
      doc.text(`Associated Prescriptions: ${input.prescriptionCount}`, { indent: 10 });
    }
    doc.moveDown(1);

    // Clinical Information
    doc.fontSize(12).font('Helvetica-Bold').text('CLINICAL FINDINGS', { underline: true });
    doc.moveDown(0.5);

    addSection(doc, 'DIAGNOSIS', input.diagnosis);
    addSection(doc, 'SYMPTOMS', input.symptoms);
    addSection(doc, 'CLINICAL NOTES', input.notes);
    addSection(doc, 'FOLLOW-UP INSTRUCTIONS', input.followUp);

    // Footer
    doc.moveDown(1);
    doc.fontSize(8).font('Helvetica').text('_'.repeat(80), { align: 'center' });
    doc.fontSize(8).text('This is an official medical record. Keep in a safe place.', {
      align: 'center'
    });
    doc.fontSize(8).text(`Generated on ${formatDate(new Date())}`, { align: 'center' });

    doc.end();
  });
}
