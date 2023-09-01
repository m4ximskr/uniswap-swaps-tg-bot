import {Telegraf} from "telegraf";
import LocalSession from "telegraf-session-local";
import { BotContext, Command, UserLocalSession} from "../interfaces/bot.interface";
import {StartCommand} from "./commands/start.command";
import {HelpCommand} from "./commands/help.command";
import {AnalyzeCommand} from "./commands/analyze.command";

export class Bot {
  private bot: Telegraf<BotContext>;
  private commands: Command[];

  constructor() {

    this.bot = new Telegraf<BotContext>(process.env.TG_BOT_API_TOKEN);
    const session = new LocalSession<UserLocalSession>({database: 'documents/sessions.json'})
    this.bot.use(session.middleware());

    this.commands = [
      new StartCommand(this.bot),
      new HelpCommand(this.bot),
      new AnalyzeCommand(this.bot),
    ]
  }

  init() {
    this.bot.launch();
    this.commands.forEach(command => command.registerHandlers())
  }

  stop(message: string) {
    this.bot.stop(message);
  }
}