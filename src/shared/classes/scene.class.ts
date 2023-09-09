import {Scenes, Telegraf} from "telegraf";
import {BotContext, BotScene} from "../interfaces/bot.interface";
import {BotService} from "../services/bot.service";

export abstract class Scene {
  scene: Scenes.BaseScene<BotContext>

  protected constructor(
    botScene: BotScene,
    bot: Telegraf<BotContext>,
    botService: BotService,
  ) {
    this.scene = new Scenes.BaseScene<BotContext>(botScene);
  }
}