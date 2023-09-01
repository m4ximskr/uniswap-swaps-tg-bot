import {Context} from "telegraf";

export interface BotContext extends Context {
  session?: UserLocalSession;
}

export interface Command {
  registerHandlers(): void;
}

export interface UserLocalSession {
  role: UserRole,
  requestCount: number;
  limitEndsTimestamp: number;
}

export enum UserRole {
  USER = 'user',
  ANALYST = 'analyst',
}

export interface AnalysisResult {
  token0Symbol: string;
  token0Address: string;
  token1Symbol: string;
  token1Address: string;
  poolAddress: string;
  date: string;
  dexType: string;
}


