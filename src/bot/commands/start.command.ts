import {Markup, Telegraf} from "telegraf";
import {BotContext, Command, UserRole} from "../../interfaces/bot.interface";
import {requestLimitMap} from "../../constants/bot.constants";
import {asyncCommandWrapper} from "../../utils/bot.utils";

export class StartCommand implements Command {
  constructor(private bot: Telegraf<BotContext>) {}

  registerHandlers() {
    this.bot.command('start', asyncCommandWrapper(async (ctx) => {
      ctx.session = null;
      await ctx.reply('Welcome to the eth wallet swaps analysis bot. Note that it counts only Uniswap swaps.');
      await ctx.reply(
        'Please select your role:',
        Markup.inlineKeyboard([
          Markup.button.callback('User', 'set_role_user'),
          Markup.button.callback('Analyst', 'set_role_analyst'),
        ])
      )
    }))

    this.bot.action('set_role_user', this.setRoleAction.bind(this, UserRole.USER))
    this.bot.action('set_role_analyst', this.setRoleAction.bind(this, UserRole.ANALYST))
  }

  private async setRoleAction(role: UserRole, ctx) {
    ctx.session.role = role;
    await ctx.editMessageText(`Your role is ${ctx.session.role}. Request limit per day is ${requestLimitMap[ctx.session.role]}.`);
    await ctx.answerCbQuery();
  }
}