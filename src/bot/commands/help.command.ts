import {BotContext, MainSceneAction} from "../../shared/interfaces/bot.interface";
import {Markup, Telegraf} from "telegraf";
import {BotService} from "../../shared/services/bot.service";
import {Command} from "../../shared/classes/command.class";

export class HelpCommand extends Command {
  constructor(
    private bot: Telegraf<BotContext>,
    private botService: BotService,
  ) {
    super(bot, botService);
  }

  registerHandlers() {
    this.bot.command('help', async (ctx: BotContext) => await this.showHelp(ctx))

    this.bot.action(MainSceneAction.MENU, this.showMenuAction.bind(this))
    this.bot.action(MainSceneAction.HELP, this.showHelpAction.bind(this))
  }

  private async showHelp(ctx: BotContext) {
    const helpReplyText =
      '/start - Start interacting with bot \n' +
      '/help - Prints this help message \n' +
      '/analyze <eth wallet address> eth - Excel file with wallet trading data'
    const reply = await ctx.sendMessage(
      helpReplyText,
      Markup.inlineKeyboard([
        Markup.button.callback('Menu', MainSceneAction.MENU),
      ])
    );
    this.botService.previousMessageID = reply.message_id;
  }

  private async showHelpAction(ctx: BotContext) {
    await this.showHelp(ctx);
    await ctx.answerCbQuery();
  }

  private async showMenuAction(ctx: BotContext) {
    await this.botService.showMenu(ctx);
    await ctx.answerCbQuery();
  }
}