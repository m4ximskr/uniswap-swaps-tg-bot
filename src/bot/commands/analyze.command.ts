import {BotContext, BotScene, MainSceneAction} from "../../shared/interfaces/bot.interface";
import {Telegraf} from "telegraf";
import {BotService} from "../../shared/services/bot.service";
import {Command} from "../../shared/classes/command.class";

export class AnalyzeCommand extends Command {
  constructor(
    private bot: Telegraf<BotContext>,
    private botService: BotService,
  ) {
    super(bot, botService);
  }

  registerHandlers(): void {
    this.bot.command('analyze', (ctx) => ctx.scene.enter(BotScene.ANALYZE));

    this.bot.action(MainSceneAction.ANALYZE, async (ctx) => {
      await ctx.scene.enter(BotScene.ANALYZE)
      await ctx.answerCbQuery();
    });
  }
}