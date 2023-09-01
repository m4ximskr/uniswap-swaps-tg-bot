import dotenv from "dotenv";
import {Bot} from "./bot/bot";

function app() {
  const {error} = dotenv.config()
  if (error) {
    throw error;
  }

  const bot = new Bot();
  bot.init();

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

app();

