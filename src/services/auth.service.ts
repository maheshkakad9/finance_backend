import { User } from "@prisma/client";
import { userRepository } from "../repositories/user.repository";
import { tokenRepository } from "../repositories/token.repository";
import { hashPassword, comparePassword } from "../utils/hash";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
  getAccessTokenRemainingTTL,
  verifyAccessToken,
} from "../utils/token";
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from "../utils/errors";
import { RegisterInput, LoginInput } from "../schemas/auth.schema";
import redis from "../config/redis";
import { Unzip } from "node:zlib";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: Omit<User, "password">;
  tokens: AuthTokens;
}

export class AuthService {
  // Register
  async register(input: RegisterInput): Promise<AuthResponse> {
    // Check for duplicate email
    const exists = await userRepository.existsByEmail(input.email);
    if (exists) {
      throw new ConflictError("An account with this email already exists");
    }

    const hashedPassword = await hashPassword(input.password);

    // Create the user with default role VIEWER
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      password: hashedPassword,
    });

    const tokens = await this.generateAndStoreTokens(user);

    const { password: _, ...safeUser } = user;
    return { user: safeUser, tokens };
  }

  // Login

  async login(input: LoginInput) : Promise<AuthResponse> {
    const user = await userRepository.findByEmail(input.email);

    if (!user) {
        throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive || user.deletedAt) {
        throw new UnauthorizedError('Your account has been deactivated. Contact an administration.');
    }

    const passwordValid = await comparePassword(input.password, user.password);
    if (!passwordValid) {
        throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = await this.generateAndStoreTokens(user);
    const { password: _, ...safeUser } = user;
    return { user: safeUser, tokens };
  }

  // Refresh
  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    const hashed = hashToken(rawRefreshToken);
    const storedToken = await tokenRepository.findByToken(hashed);

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedError('Invalid or expired refresh token. Please log in again.');
    }

    const user = await userRepository.findById(storedToken.userId);
    if (!user || !user.isActive || user.deletedAt) {
        throw new UnauthorizedError('User account is no longer active.');
    }

    await tokenRepository.revoke(storedToken.id);
    return this.generateAndStoreTokens(user);
  }

  // Logout
  async logout(accessToken: string, rawRefreshToken?: string): Promise<void> {
    try {
        const payload = verifyAccessToken(accessToken);
        const ttl = getAccessTokenRemainingTTL(accessToken);
        if(ttl > 0) {
            await redis.setex(`blacklist:${payload.jti}`, ttl,'1');
        }
    } catch {

    }

    if (rawRefreshToken) {
        const hashed = hashToken(rawRefreshToken);
        const stored = await tokenRepository.findByToken(hashed);
        if (stored && !stored.revoked) {
            await tokenRepository.revoke(stored.id);
        }
    }
  }

  // Get Current User
  async getMe(userId: string): Promise<Omit<User, 'password'>> {
    const user = await userRepository.findById(userId);
    if(!user) throw new NotFoundError('User');
    const { password: _, ...safeUser } = user;
    return safeUser;
  }


  private async generateAndStoreTokens(user: User): Promise<AuthTokens> {
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const rawRefreshToken = generateRefreshToken();
    const hashedRefreshToken = hashToken(rawRefreshToken);

    await tokenRepository.create({
      token: hashedRefreshToken,
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }
}

export const authService = new AuthService();
