import QRCode from 'qrcode';
import crypto from 'crypto';

export interface GeneratedTokens {
  verificationToken: string;
  verificationCode: string;
  qrCodeDataUrl: string;
}

export async function generateClaimVerificationTokens(claimId: string): Promise<GeneratedTokens> {
  // 1. High-entropy opaque token (64 hex characters)
  const verificationToken = crypto.randomBytes(32).toString('hex');

  // 2. Human-friendly 6-character alphanumeric code for manual fallback
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude easily confused chars: 0, 1, I, O
  let verificationCode = '';
  const randomBytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    verificationCode += chars[randomBytes[i] % chars.length];
  }

  // 3. QR Payload: Opaque token only (no personal data)
  const payload = JSON.stringify({
    app: 'shareplate',
    version: '1.0',
    type: 'pickup_verification',
    claimId,
    token: verificationToken,
  });

  const qrCodeDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'H',
    margin: 2,
    color: {
      dark: '#1b4332', // Deep forest green
      light: '#ffffff',
    },
    width: 320,
  });

  return {
    verificationToken,
    verificationCode,
    qrCodeDataUrl,
  };
}
