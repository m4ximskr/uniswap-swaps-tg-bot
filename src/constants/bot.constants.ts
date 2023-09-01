import {UserRole} from "../interfaces/bot.interface";

export const requestLimitMap: {[key in UserRole]: number} = {
  [UserRole.USER]: 5,
  [UserRole.ANALYST]: 20,
}