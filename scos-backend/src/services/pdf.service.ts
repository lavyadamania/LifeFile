import PDFDocument from 'pdfkit';

type PrescriptionPdfInput = {
  prescriptionId: string;
  patientId: string;
  patientName: string;
  patientMRN: string;
  patientAge?: number;
  patientGender?: string;
  doctorId: string;
  doctorName: string;
  doctorLicense: string;
  doctorSpecialization?: string;
  consultationId?: string;
  contentText: string;
  issuedAt: Date;
  version?: number;
};

function escapeText(value: string): string {
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

export async function generatePrescriptionPdf(input: PrescriptionPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header - Title
    doc.fontSize(20).font('Helvetica-Bold').text('PRESCRIPTION', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').text('_'.repeat(80), { align: 'center' });
    doc.moveDown(1);

    // Doctor Details Section
    doc.fontSize(11).font('Helvetica-Bold').text('DOCTOR DETAILS', { underline: true });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Name: ${input.doctorName}`, { indent: 10 });
    doc.text(`License Number: ${input.doctorLicense}`, { indent: 10 });
    if (input.doctorSpecialization) {
      doc.text(`Specialization: ${input.doctorSpecialization}`, { indent: 10 });
    }
    doc.moveDown(0.8);

    // Patient Details Section
    doc.fontSize(11).font('Helvetica-Bold').text('PATIENT DETAILS', { underline: true });
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

    // Prescription Metadata
    doc.fontSize(11).font('Helvetica-Bold').text('PRESCRIPTION INFORMATION', { underline: true });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Prescription ID: ${input.prescriptionId}`, { indent: 10 });
    doc.text(`Date: ${formatDate(input.issuedAt)}`, { indent: 10 });
    if (input.consultationId) {
      doc.text(`Consultation ID: ${input.consultationId}`, { indent: 10 });
    }
    if (input.version) {
      doc.text(`Version: ${input.version}`, { indent: 10 });
    }
    doc.moveDown(1);

    // Prescription Content
    doc.fontSize(11).font('Helvetica-Bold').text('PRESCRIPTION CONTENT', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(escapeText(input.contentText), {
      align: 'left',
      lineGap: 3,
      indent: 10
    });

    // Footer
    doc.moveDown(1.5);
    doc.fontSize(8).font('Helvetica').text('_'.repeat(80), { align: 'center' });
    doc.fontSize(8).text('This is an electronically generated prescription. It is valid without a signature.', {
      align: 'center'
    });
    doc.fontSize(8).text(`Generated on ${formatDate(new Date())}`, { align: 'center' });

    doc.end();
  });
}
