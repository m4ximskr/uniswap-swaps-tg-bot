import {Scenes, Telegraf} from "telegraf";
import LocalSession from "telegraf-session-local";
import {BotContext, BotScene, UserLocalSession} from "../shared/interfaces/bot.interface";
import {AnalyzeScene} from "./scenes/analyze.scene";
import {StartCommand} from "./commands/start.command";
import {BotService} from "../shared/services/bot.service";
import {HelpCommand} from "./commands/help.command";
import {AnalyzeCommand} from "./commands/analyze.command";

export class Bot {
  private bot: Telegraf<BotContext>;
  private botService: BotService;

  constructor() {
    this.bot = new Telegraf<BotContext>(process.env.TG_BOT_API_TOKEN) as Telegraf<BotContext>;
    this.botService = new BotService();
    const session = new LocalSession<UserLocalSession>({
      database: 'sessions.json',
    })
    this.bot.use(session.middleware());

    const stage = new Scenes.Stage([
      new AnalyzeScene(BotScene.ANALYZE, this.bot, this.botService).scene,
    ] as unknown as any[])
    this.bot.use((stage as unknown as any).middleware());

    this.bot.use(this.middleware.bind(this))
  }

  init() {
    const commands = [
      new StartCommand(this.bot, this.botService),
      new HelpCommand(this.bot, this.botService),
      new AnalyzeCommand(this.bot, this.botService),
    ]
    commands.forEach(command => command.registerHandlers())
    this.bot.launch()
  }

  stop(message: string) {
    this.bot.stop(message);
  }

  private async middleware(ctx: BotContext, next: () => Promise<void>) {
    if (this.botService.previousMessageID) {
      await ctx.deleteMessage(this.botService.previousMessageID)
      this.botService.previousMessageID = null;
    }
    await next();
  }
}