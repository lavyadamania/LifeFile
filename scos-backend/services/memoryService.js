const PatientMemory = require('../models/PatientMemory');
const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const AuditLog = require('../models/AuditLog');

// Helper to normalize content for deduplication (lowercase, trim, strip basic punctuation)
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ');
}

// Check for clinical contradictions (e.g. "no known allergy" vs "penicillin allergy")
function isContradictory(contentA, contentB) {
  const normA = normalizeText(contentA);
  const normB = normalizeText(contentB);

  const negativeKeywords = ['no known', 'denies', 'none', 'no history', 'negative for', 'nil'];
  const isANegative = negativeKeywords.some(kw => normA.includes(kw));
  const isBNegative = negativeKeywords.some(kw => normB.includes(kw));

  // If one is explicitly negative and the other is positive regarding similar medical terms
  if (isANegative !== isBNegative) {
    const stopWords = /(no known|denies|none|no history|negative for|nil|allergy|allergies|history|patient|reports|a|an|the|of|to|has)/gi;
    const termA = normA.replace(stopWords, '').trim();
    const termB = normB.replace(stopWords, '').trim();

    if (termA.length > 2 && termB.length > 2 && (termA.includes(termB) || termB.includes(termA))) {
      return true;
    }
    if (isANegative && normB.length > 0 && normA.includes('allergy')) return true;
    if (isBNegative && normA.length > 0 && normB.includes('allergy')) return true;
  }

  return false;
}

/**
 * Deduplicate candidates and merge sources or flag conflicts in DB (Idempotent)
 */
async function deduplicateAndPersistCandidates(patientId, candidates, actorId = null) {
  const results = { created: 0, merged: 0, conflicted: 0 };

  for (const candidate of candidates) {
    if (!candidate.content || !candidate.category) continue;

    const normContent = normalizeText(candidate.content);
    if (!normContent) continue;

    // Search existing memories for this patient & category
    const existingMemories = await PatientMemory.find({
      patientId,
      category: candidate.category
    });

    let merged = false;
    let conflicted = false;

    for (const existing of existingMemories) {
      // 1. Conflict Detection (Opposing medical assertions)
      if (isContradictory(existing.content, candidate.content)) {
        existing.status = 'CONFLICTED';
        existing.confidence = 'CONFLICTED';
        existing.conflictNotes = `Contradictory record detected: "${candidate.content}"`;
        await existing.save();

        // Check if candidate already exists as CONFLICTED to prevent duplicate rows on re-runs
        const existingCandidateConflict = existingMemories.find(m => m.normalizedContent === normContent);
        if (existingCandidateConflict) {
          const sSet = new Set(existingCandidateConflict.sourceRecordIds.map(id => id.toString()));
          (candidate.sourceRecordIds || []).forEach(sId => sSet.add(sId.toString()));
          existingCandidateConflict.sourceRecordIds = Array.from(sSet);
          existingCandidateConflict.status = 'CONFLICTED';
          existingCandidateConflict.confidence = 'CONFLICTED';
          await existingCandidateConflict.save();
        } else {
          // Save new candidate as CONFLICTED memory card
          await PatientMemory.create({
            patientId,
            category: candidate.category,
            type: candidate.type || 'FACT',
            content: candidate.content,
            normalizedContent: normContent,
            sourceRecordIds: candidate.sourceRecordIds || [],
            confidence: 'CONFLICTED',
            status: 'CONFLICTED',
            conflictNotes: `Contradicts prior record: "${existing.content}"`
          });
        }

        if (actorId) {
          await AuditLog.create({
            action: 'MEMORY_CONFLICTED',
            actorId,
            actorRole: 'system',
            details: `Conflict detected between "${existing.content}" and "${candidate.content}"`
          }).catch(() => {});
        }

        results.conflicted++;
        conflicted = true;
        break;
      }

      // 2. Deduplication Match (Exact or similar non-contradictory content)
      const isMatch = existing.normalizedContent === normContent || 
                      (existing.normalizedContent.length > 5 && normContent.length > 5 && existing.normalizedContent === normContent);
      if (isMatch) {
        
        const sourceIdsSet = new Set(existing.sourceRecordIds.map(id => id.toString()));
        (candidate.sourceRecordIds || []).forEach(sId => sourceIdsSet.add(sId.toString()));
        
        existing.sourceRecordIds = Array.from(sourceIdsSet);
        if (existing.sourceRecordIds.length > 1 && existing.status !== 'CONFLICTED') {
          existing.confidence = 'SUPPORTED';
        }
        await existing.save();

        if (actorId) {
          await AuditLog.create({
            action: 'MEMORY_MERGED',
            actorId,
            actorRole: 'system',
            details: `Merged source for memory: ${existing.content} (Total sources: ${existing.sourceRecordIds.length})`
          }).catch(() => {});
        }

        results.merged++;
        merged = true;
        break;
      }

      // 2. Conflict Detection (Opposing medical assertions)
      if (isContradictory(existing.content, candidate.content)) {
        existing.status = 'CONFLICTED';
        existing.confidence = 'CONFLICTED';
        existing.conflictNotes = `Contradictory record detected: "${candidate.content}"`;
        await existing.save();

        // Check if candidate already exists as CONFLICTED to prevent duplicate rows on re-runs
        const existingCandidateConflict = existingMemories.find(m => m.normalizedContent === normContent);
        if (existingCandidateConflict) {
          const sSet = new Set(existingCandidateConflict.sourceRecordIds.map(id => id.toString()));
          (candidate.sourceRecordIds || []).forEach(sId => sSet.add(sId.toString()));
          existingCandidateConflict.sourceRecordIds = Array.from(sSet);
          existingCandidateConflict.status = 'CONFLICTED';
          existingCandidateConflict.confidence = 'CONFLICTED';
          await existingCandidateConflict.save();
        } else {
          // Save new candidate as CONFLICTED memory card
          await PatientMemory.create({
            patientId,
            category: candidate.category,
            type: candidate.type || 'FACT',
            content: candidate.content,
            normalizedContent: normContent,
            sourceRecordIds: candidate.sourceRecordIds || [],
            confidence: 'CONFLICTED',
            status: 'CONFLICTED',
            conflictNotes: `Contradicts prior record: "${existing.content}"`
          });
        }

        if (actorId) {
          await AuditLog.create({
            action: 'MEMORY_CONFLICTED',
            actorId,
            actorRole: 'system',
            details: `Conflict detected between "${existing.content}" and "${candidate.content}"`
          }).catch(() => {});
        }

        results.conflicted++;
        conflicted = true;
        break;
      }
    }

    // 3. New Unique Memory
    if (!merged && !conflicted) {
      await PatientMemory.create({
        patientId,
        category: candidate.category,
        type: candidate.type || 'FACT',
        content: candidate.content,
        normalizedContent: normContent,
        sourceRecordIds: candidate.sourceRecordIds || [],
        confidence: candidate.sourceRecordIds?.length > 1 ? 'SUPPORTED' : 'SUPPORTED',
        status: 'ACTIVE'
      });

      if (actorId) {
        await AuditLog.create({
          action: 'MEMORY_CREATED',
          actorId,
          actorRole: 'system',
          details: `Created new ${candidate.category} memory: "${candidate.content}"`
        }).catch(() => {});
      }

      results.created++;
    }
  }

  return results;
}

/**
 * Phase 4: Deterministic extraction from prescriptions (Resolves User._id and Patient profile _id)
 */
async function extractDeterministicMemories(patientId, actorId = null) {
  // Resolve both User._id and Patient profile _id to ensure no missing prescriptions
  const searchIds = [patientId];
  const patientProfile = await Patient.findOne({
    $or: [{ _id: patientId }, { userId: patientId }]
  });
  if (patientProfile) {
    if (patientProfile._id.toString() !== patientId.toString()) searchIds.push(patientProfile._id);
    if (patientProfile.userId?.toString() !== patientId.toString()) searchIds.push(patientProfile.userId);
  }

  const prescriptions = await Prescription.find({ patientId: { $in: searchIds } });
  const candidates = [];

  for (const rx of prescriptions) {
    const rxId = rx._id;

    // 1. Diagnoses -> CONDITION
    if (rx.diagnosis && rx.diagnosis.trim().length > 2) {
      candidates.push({
        category: 'CONDITION',
        type: 'FACT',
        content: rx.diagnosis.trim(),
        sourceRecordIds: [rxId]
      });
    }

    // 2. Medications -> MEDICATION
    if (Array.isArray(rx.medications)) {
      for (const med of rx.medications) {
        if (med.name && med.name.trim().length > 1) {
          const contentStr = med.dosage ? `${med.name.trim()} (${med.dosage.trim()})` : med.name.trim();
          candidates.push({
            category: 'MEDICATION',
            type: 'FACT',
            content: contentStr,
            sourceRecordIds: [rxId]
          });
        }
      }
    }

    // 3. Notes -> Allergy / Preference Detection
    if (rx.notes) {
      const text = rx.notes;
      
      // Match patterns like "penicillin allergy" OR "allergy to penicillin"
      const allergyMatch = text.match(/([a-zA-Z0-9\s]+)\s+allergy/i) || text.match(/(?:allergic to|allergy:?|allergic:?)\s+([a-zA-Z0-9\s]+)(?:\.|\,|\n|$)/i);
      if (allergyMatch && allergyMatch[1]) {
        const allergen = allergyMatch[1].replace(/(?:reports|severe|mild|moderate|known|suspected|confirmed|patient|has|history of|a|an|the)/gi, '').trim();
        if (allergen.length > 1) {
          candidates.push({
            category: 'ALLERGY',
            type: 'FACT',
            content: `${allergen} allergy`,
            sourceRecordIds: [rxId]
          });
        }
      }

      // Procedure keywords
      const procMatch = text.match(/(?:procedure:?|underwent|surgery:?)\s+([a-zA-Z0-9\s]+)(?:\.|\,|\n|$)/i);
      if (procMatch && procMatch[1]) {
        candidates.push({
          category: 'PROCEDURE',
          type: 'FACT',
          content: procMatch[1].trim(),
          sourceRecordIds: [rxId]
        });
      }
    }
  }

  return await deduplicateAndPersistCandidates(patientId, candidates, actorId);
}

/**
 * Phase 16: AI-assisted extraction using Gemini with JSON validation & hallucination protection
 */
async function extractAIMemoryCandidates(patientId, prescriptionId, actorId = null) {
  const rx = await Prescription.findById(prescriptionId);
  if (!rx) throw new Error('Prescription record not found');

  // Strict structured JSON validation prompt
  const notesText = `Diagnosis: ${rx.diagnosis || ''}. Notes: ${rx.notes || ''}. Medications: ${JSON.stringify(rx.medications || [])}`;

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    if (!process.env.GEMINI_API_KEY) {
      return await extractDeterministicMemories(patientId, actorId);
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Extract concise medical memory facts from this text. 
Return ONLY valid JSON matching this schema:
{
  "memories": [
    {
      "category": "ALLERGY" | "CONDITION" | "MEDICATION" | "PROCEDURE" | "INVESTIGATION" | "PREFERENCE",
      "type": "FACT" | "PREFERENCE" | "INFERENCE" | "TEMPORARY_CONTEXT",
      "content": "string concise medical memory"
    }
  ]
}
Text: "${notesText}"`;

    const response = await model.generateContent(prompt);
    const rawText = response.response.text();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return await extractDeterministicMemories(patientId, actorId);

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.memories)) return { created: 0, merged: 0, conflicted: 0 };

    const validCategories = ['ALLERGY', 'CONDITION', 'MEDICATION', 'PROCEDURE', 'INVESTIGATION', 'PREFERENCE'];
    const validTypes = ['FACT', 'PREFERENCE', 'INFERENCE', 'TEMPORARY_CONTEXT'];

    const validatedCandidates = parsed.memories
      .filter(m => m.content && validCategories.includes(m.category))
      .map(m => ({
        category: m.category,
        type: validTypes.includes(m.type) ? m.type : 'FACT',
        content: m.content.trim(),
        sourceRecordIds: [rx._id]
      }));

    return await deduplicateAndPersistCandidates(patientId, validatedCandidates, actorId);
  } catch (err) {
    console.error('[Memory AI Extract Fallback]', err.message);
    return await extractDeterministicMemories(patientId, actorId);
  }
}

module.exports = {
  normalizeText,
  isContradictory,
  deduplicateAndPersistCandidates,
  extractDeterministicMemories,
  extractAIMemoryCandidates
};
