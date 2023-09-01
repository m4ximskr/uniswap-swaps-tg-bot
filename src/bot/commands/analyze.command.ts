import moment from "moment/moment";
import { Telegraf} from "telegraf";
import {AnalysisResult, BotContext, Command} from "../../interfaces/bot.interface";
import {BlockchainService} from "../../services/blockchain.service";
import {ethAddressPattern} from "../../constants/patterns.constants";
import {requestLimitMap} from "../../constants/bot.constants";
import {TransactionResponse} from "@ethersproject/abstract-provider";
import {TransactionSwap} from "../../interfaces/blockchain.interface";
import * as XLSX from "xlsx";
import {asyncCommandWrapper} from "../../utils/bot.utils";

export class AnalyzeCommand implements Command {
  constructor(private bot: Telegraf<BotContext>) {}

  registerHandlers() {
    this.bot.command('analyze', asyncCommandWrapper(async (ctx) => {
      const [command, walletAddress, chain]: string[] = ctx.update.message.text.split(' ')
      const validEthAddress = new RegExp(ethAddressPattern).test(walletAddress);
      const validChain = chain === 'eth';

      if (!validEthAddress || !validChain) {
        const errorText =
          `Please input valid wallet address (42 hex) and chain (eth). Example:\n/analyze 0x6cd9ec78fd467f2251b6cdb768fd9e312ecfc574 eth`
        await ctx.reply(errorText)
        return;
      }

      const currentMoment = moment();

      if (currentMoment.isSameOrBefore(moment.unix(ctx.session.limitEndsTimestamp))) {
        const requestLimitCount = requestLimitMap[ctx.session.role]

        if (ctx.session.requestCount >= requestLimitCount) {
          const dateToString = moment.unix(ctx.session.limitEndsTimestamp).format('MMMM Do YYYY, H:mm:ss');
          const errorText =
            `You have reached your request limit of ${requestLimitCount}. Try next time on ${dateToString}.`

          await ctx.reply(errorText);
          return;
        }
      } else {
        ctx.session.limitEndsTimestamp = currentMoment.add(1, 'day').unix();
        ctx.session.requestCount = 0;
      }

      ctx.session.requestCount += 1;

      await ctx.reply(`Starting analyzing wallet ${walletAddress}. This may take a while...`)

      const analysisResult = await this.analyzeWallet(walletAddress);

      if (analysisResult.length > 0) {
        const workSheet = XLSX.utils.json_to_sheet(analysisResult);
        const workBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workBook, workSheet, 'Sheet 1');
        XLSX.writeFile(workBook, 'documents/analysis.xlsx');

        await ctx.replyWithDocument({
          source: 'documents/analysis.xlsx',
          filename: `${currentMoment.unix()}_${walletAddress}_analysis.xlsx`
        });
        await ctx.reply(`Analysis successfully finished!`)
      } else {
        await ctx.reply(`No swap transactions found.`)
      }
    }))
  }

  private async analyzeWallet(address: string): Promise<AnalysisResult[]> {
    const blockchainService = new BlockchainService();

    const analysisResult: AnalysisResult[] = [];
    let transactions: TransactionResponse[] = [];

    try {
      transactions = await blockchainService.getWalletTransactionHistory(address)
    } catch (e) {
      console.log('Failed to get transactions: ', e)
    }

    console.log(`Starting looking into ${transactions.length} transactions...`)

    for await (const tx of transactions.reverse()) {
      console.log('Analyzing... ', tx.hash)

      let txSwaps: TransactionSwap[] = [];
      let tokenSymbols: string[] = [];
      let poolAddress = '';

      try {
        txSwaps = await blockchainService.parseTransaction(tx)
      } catch (e) {
        console.log(`Failed to get transaction ${tx.hash} swaps:`, e)
      }

      for await (const swap of txSwaps) {
        const {tokens, type, poolFee} = swap;

        try {
          tokenSymbols = await blockchainService.getTokenSymbols(tokens)
        } catch (e) {
          console.log(`Failed to get transaction ${tx.hash} tokens symbols: `, e)
        }

        try {
          poolAddress = await blockchainService.getTokensPoolAddress(tokens, type, poolFee)
        } catch (e) {
          console.log(`Failed to get transaction ${tx.hash} tokens pool address: `, e)
        }

        const [token0Address, token1Address] = tokens;
        const [token0Symbol, token1Symbol] = tokenSymbols;

        analysisResult.push({
          token0Address,
          token0Symbol,
          token1Address,
          token1Symbol,
          poolAddress,
          date: moment.unix(tx.timestamp).format(),
          dexType: swap.type,
        })
      }
    }

    console.log(`Analysis finished`)

    return analysisResult;
  }
}