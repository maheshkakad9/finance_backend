import bcrypt from 'bcryptjs';
import { env } from '../config/env';

// For hashing the plain text password
export const hashPassword = async (password: string) : Promise<string> => {
    return bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
};

// To compare the plain-test password against a stored bcrypt hash.
export const comparePassword = async (
    plainPassword: string,
    hashedPassword: string
): Promise<boolean> => {
    return bcrypt.compare(plainPassword,hashedPassword);
}