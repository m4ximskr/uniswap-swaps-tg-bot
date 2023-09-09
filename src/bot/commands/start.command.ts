import { Markup, Telegraf} from "telegraf";
import {BotContext, UserRole} from "../../shared/interfaces/bot.interface";
import {requestLimitMap} from "../../shared/constants/bot.constants";
import {BotService} from "../../shared/services/bot.service";
import {Command} from "../../shared/classes/command.class";

enum StartCommandAction {
  SET_ROLE_USER = 'set_role_user',
  SET_ROLE_ANALYST = 'set_role_analyst'
}

export class StartCommand extends Command {
  constructor(
    private bot: Telegraf<BotContext>,
    private botService: BotService,
  ) {
    super(bot, botService);
  }

  registerHandlers() {
    this.bot.use(this.middleware.bind(this));

    this.bot.command('start', async (ctx: BotContext) => {
      ctx.session = null;
      await ctx.sendMessage('Welcome to the eth wallet swaps analysis bot.');
      await this.showSelectRole(ctx);
    })

    this.bot.action(StartCommandAction.SET_ROLE_USER, this.setRoleAction.bind(this, UserRole.USER))
    this.bot.action(StartCommandAction.SET_ROLE_ANALYST, this.setRoleAction.bind(this, UserRole.ANALYST))
  }

  private async showSelectRole(ctx: BotContext) {
    const msg = await ctx.sendMessage(
      'Please select your role:',
      Markup.inlineKeyboard([
        Markup.button.callback('User', StartCommandAction.SET_ROLE_USER),
        Markup.button.callback('Analyst', StartCommandAction.SET_ROLE_ANALYST),
      ])
    )
    this.botService.previousMessageID = msg.message_id;
  }

  private async setRoleAction(role: UserRole, ctx: BotContext) {
    ctx.session.role = role;
    await ctx.sendMessage(`Your role is ${ctx.session.role}. Request limit per day is ${requestLimitMap[ctx.session.role]}.`);
    await this.botService.showMenu(ctx);
    await ctx.answerCbQuery();
  }

  private async middleware(ctx: BotContext, next: () => Promise<void>) {
    const actionData = (ctx.update as any).callback_query?.data;

    if (ctx.session?.role || actionData === StartCommandAction.SET_ROLE_USER || actionData === StartCommandAction.SET_ROLE_ANALYST) {
      await next();
    } else {
      await this.showSelectRole(ctx);
    }
  }
}