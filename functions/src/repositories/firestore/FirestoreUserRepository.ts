import type { User, StudySessionCreate } from "memvocado-types";
import type { UserRepository } from "../interfaces/UserRepository";

/**
 * Firestore-backed implementation of UserRepository.
 * Methods are populated in Phase 2 (extract Local functions).
 */
export class FirestoreUserRepository implements UserRepository {
  async getUser(_userId: string): Promise<User | null> {
    throw new Error("Not implemented — Phase 2");
  }

  async updateUser(
    _userId: string,
    _data: Record<string, unknown>
  ): Promise<void> {
    throw new Error("Not implemented — Phase 2");
  }

  async incrementField(
    _userId: string,
    _field: string,
    _amount: number
  ): Promise<void> {
    throw new Error("Not implemented — Phase 2");
  }

  async addStudySession(
    _userId: string,
    _session: StudySessionCreate
  ): Promise<string> {
    throw new Error("Not implemented — Phase 2");
  }

  async deleteLatestStudySession(_userId: string): Promise<void> {
    throw new Error("Not implemented — Phase 2");
  }
}
