import { Role, User } from '@prisma/client'
import { userRepository } from '../repositories/user.repository'
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { parsePagination, buildMeta } from '../utils/pagination';

export class UserService {
  async getAllUsers(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePagination(query);
    const { users, total } = await userRepository.findAll({ skip, take: limit });
    return { users, meta: buildMeta(total, page, limit) };
  }
 
  async getUserById(id: string): Promise<Omit<User, 'password'>> {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User');
    const { password: _, ...safeUser } = user;
    return safeUser;
  }
 
  async updateUserRole(
    targetId: string,
    newRole: Role,
    requestingUserId: string
  ): Promise<Omit<User, 'password'>> {
    // Prevent admin from demoting themselves
    if (targetId === requestingUserId) {
      throw new ForbiddenError('You cannot change your own role');
    }
 
    const user = await userRepository.findById(targetId);
    if (!user) throw new NotFoundError('User');
 
    const updated = await userRepository.updateRole(targetId, newRole);
    const { password: _, ...safeUser } = updated;
    return safeUser;
  }
 
  async softDeleteUser(targetId: string, requestingUserId: string): Promise<void> {
    if (targetId === requestingUserId) {
      throw new ForbiddenError('You cannot delete your own account');
    }
 
    const user = await userRepository.findById(targetId);
    if (!user) throw new NotFoundError('User');
 
    await userRepository.softDelete(targetId);
  }
}
 
export const userService = new UserService();