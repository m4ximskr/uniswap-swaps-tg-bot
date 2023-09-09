import {Context} from "telegraf";

export interface BotContext extends Context<any> {
  session?: UserLocalSession;
  scene?: any;
}

export interface UserLocalSession {
  role?: UserRole,
  requestCount?: number;
  limitEndsTimestamp?: number;
  currentScene?: string;
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

export enum BotScene {
  ANALYZE = 'analyze-scene'
}

export enum MainSceneAction {
  ANALYZE = 'analyze',
  HELP = 'help',
  MENU = 'menu',
}


