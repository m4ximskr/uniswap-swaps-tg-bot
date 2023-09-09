import {BotContext, MainSceneAction} from "../interfaces/bot.interface";
import {Markup} from "telegraf";

export class BotService {
  previousMessageID: number;

  constructor() {}

  async showMenu(ctx: BotContext) {
    const reply = await ctx.reply(
      'Use direct commands or choose action from the list:',
      Markup.inlineKeyboard([
        Markup.button.callback('❓Help', MainSceneAction.HELP),
        Markup.button.callback('⭐️Analyze wallet', MainSceneAction.ANALYZE),

      ])
    )
    this.previousMessageID = reply.message_id;
  }
}