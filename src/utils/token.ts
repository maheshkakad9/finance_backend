import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

// Access Token Payload 
export interface AccessTokenPayload {
    id: string;
    email: string;
    name: string;
    role: string;
    jti: string;   // JWT ID - Unique per token, used for blacklisting
}

// To generate a new Access Token and a fresh 'jti' (JWT ID) - a unique ID
export const generateAccessToken = (payload: Omit<AccessTokenPayload, 'jti'>) : string => {
    const jti = crypto.randomUUID();
    return jwt.sign(
        { ...payload, jti },
        env.ACCESS_TOKEN_SECRET,
        { expiresIn: env.ACCESS_TOKEN_EXPIRY as jwt.SignOptions['expiresIn']}
    );
};

// Verify and decode an access token
export const verifyAccessToken = (token: string): AccessTokenPayload => {
    return jwt.verify(token, env.ACCESS_TOKEN_SECRET) as AccessTokenPayload;
};

// Generate the raw refresh token
export const generateRefreshToken = (): string => {
    return crypto.randomBytes(64).toString('hex');
};

// Hash a token with SHA-256
export const hashToken = (token: string) : string => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

// To calculate the expiry date for a new refresh token
export const getRefreshTokenExpiry = (): Date => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + env.REFRESH_TOKEN_EXPIRY_DAYS);
    return expiry;
};

// To get the time remain for the token expiry
export const getAccessTokenRemainingTTL = (token: string): number => {
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    if (!decoded?.exp) return 0;
    return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
  } catch {
    return 0;
  }
};
