import {Telegraf} from "telegraf";
import {BotContext, Command} from "../../interfaces/bot.interface";
import {asyncCommandWrapper} from "../../utils/bot.utils";

export class HelpCommand implements Command {
  constructor(private bot: Telegraf<BotContext>) {}

  registerHandlers() {
    this.bot.command('help', asyncCommandWrapper(async (ctx) => {
      const helpReplyText =
        '/start - Start interacting with bot \n' +
        '/help - Prints this help message \n' +
        '/analyze <eth wallet address> eth - Excel file with wallet trading data'
      await ctx.reply(helpReplyText);
    }))
  }

}