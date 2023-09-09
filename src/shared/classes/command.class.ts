import {Telegraf} from "telegraf";
import {BotContext} from "../interfaces/bot.interface";
import {BotService} from "../services/bot.service";

export abstract class Command {
  protected constructor(
    bot: Telegraf<BotContext>,
    botService: BotService,
  ) {}

  abstract registerHandlers(): void;
}