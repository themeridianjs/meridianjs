import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer } from "@meridianjs/types"
import UserModel from "./models/user.js"
import TeamModel from "./models/team.js"

export class UserModuleService extends MeridianService({ User: UserModel, Team: TeamModel }) {
  // Subclasses store their own container reference for custom methods
  private readonly container: MeridianContainer

  constructor(container: MeridianContainer) {
    super(container)
    this.container = container
  }

  /** Find a user by email. Returns null if not found. */
  async retrieveUserByEmail(email: string): Promise<any | null> {
    const userRepository = this.container.resolve<any>("userRepository")
    try {
      return await userRepository.findOneOrFail({ email })
    } catch {
      return null
    }
  }

  /** Update user's last login timestamp. */
  async recordLogin(userId: string): Promise<void> {
    await (this as any).updateUser(userId, { last_login_at: new Date() })
  }

  /** Deactivate a user account. */
  async deactivateUser(userId: string): Promise<any> {
    return (this as any).updateUser(userId, { is_active: false })
  }

  /** Return the total number of registered users. */
  async countUsers(): Promise<number> {
    const userRepository = this.container.resolve<any>("userRepository")
    const [, count] = await userRepository.findAndCount({})
    return count
  }
}
