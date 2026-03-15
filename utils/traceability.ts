
/**
 * Utility for generating unique IDs and managing document correlatives.
 */

// Simple UUID v4 generator polyfill
export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Generate a document ID (e.g., 1)
export const formatDocumentId = (prefix: string, sequence: number, length: number = 6): string => {
    const paddedSequence = sequence.toString().padStart(length, '0');
    return `${prefix}-${paddedSequence}`;
};

// Global SaaS Transaction Counter (Simulated Database Sequence)
let globalTransactionCounter = 0;

// Helper to generate a complete transaction record ID (SaaS Global ID)
export const generateTransactionId = (): string => {
    globalTransactionCounter++;
    return globalTransactionCounter.toString();
};

// In-memory sequence tracker (simulated for this session)
const sequences: Record<string, number> = {
    'BOLETA': 0,
    'FACTURA': 0,
    'NOTA_VENTA': 0,
    'COTIZACION': 0,
    'COMPRA': 0,
    'INGRESO': 0,
    'EGRESO': 0,
    'SERVICIO': 0
};

export const getNextSequence = (docType: string): number => {
    if (!sequences[docType]) sequences[docType] = 0;
    sequences[docType]++;
    return sequences[docType];
};
