import {BotContext} from "../interfaces/bot.interface";

export const asyncCommandWrapper = (fn: Function) => {
  return async function(ctx: BotContext) {
    try {
      return await fn(ctx);
    } catch (error) {
      console.log('ERROR', error)
      await ctx.reply('Unexpected error encountered. Please try again.')
    }
  };
};