import {AnalysisResult, BotContext, BotScene} from "../../shared/interfaces/bot.interface";
import {Markup, Telegraf} from "telegraf";
import {
  combineLatest,
  delay, filter,
  forkJoin,
  interval, map, mergeMap,
  Observable, Subject,
  Subscription,
  switchMap,
  take, takeUntil, tap, toArray
} from "rxjs";
import {BlockchainService} from "../../shared/services/blockchain.service";
import {TransactionResponse} from "@ethersproject/abstract-provider";
import {TransactionSwap} from "../../shared/interfaces/blockchain.interface";
import moment from "moment";
import {requestLimitMap} from "../../shared/constants/bot.constants";
import * as XLSX from "xlsx";
import {ethAddressPattern} from "../../shared/constants/patterns.constants";
import {BotService} from "../../shared/services/bot.service";
import {Scene} from "../../shared/classes/scene.class";
import {etherscanCallsLimitPerSecond} from "../../shared/constants/blockchain.constants";

enum AnalyzeSceneAction {
  EXIT = 'exit-analyze'
}

export class AnalyzeScene extends Scene {
  get isAnalysisInProgress(): boolean {
    return this.analysisSubscription && !this.analysisSubscription?.closed
  }

  get previousMessageID(): number {
    return this.botService.previousMessageID
  }

  set previousMessageID(id: number) {
    this.botService.previousMessageID = id;
  }

  private blockchainService: BlockchainService;
  private analysisSubscription: Subscription;
  private replyMessageID: number;

  private oneSecInMilliSecs = 1000;

  constructor(
    private sceneID: BotScene,
    private bot: Telegraf<BotContext>,
    private botService: BotService,
  ) {
    super(sceneID, bot, botService);

    this.blockchainService = new BlockchainService();

    this.scene.use(this.middleware.bind(this))
    this.scene.enter(this.enter.bind(this))
    this.scene.action(AnalyzeSceneAction.EXIT, this.exitAnalysisAction.bind(this))

    this.scene.leave(async (ctx) => {
      if (this.previousMessageID) {
        await ctx.deleteMessage(this.previousMessageID);
      }
      await this.botService.showMenu(ctx);
    })

    this.scene.on('text', this.onTextInput.bind(this));
  }

  private async middleware(ctx: BotContext, next: () => Promise<void>) {
    const exitAnalysis = (ctx.update as any).callback_query?.data === AnalyzeSceneAction.EXIT;

    if (exitAnalysis) {
      await next();
    } else {
      if (this.previousMessageID) {
        await ctx.deleteMessage(this.previousMessageID);
      }
      await this.showExitMenu(ctx);
      if (!this.isAnalysisInProgress) {
        await next();
      }
    }
  }

  private async enter(ctx: BotContext) {
    const canMakeAnalysis = await this.canMakeAnalysis(ctx);

    if (!canMakeAnalysis) {
      await ctx.scene.leave();
      return;
    }

    await ctx.sendMessage('You entered wallet analysis tool.')
    await this.showExitMenu(ctx);

    const [command = '', walletAddress, chain]: string[] = ctx.update.message?.text?.split(' ') || []
    if (ctx.update.callback_query?.data === 'analyze' || !walletAddress && !chain) {
      await this.askAnalyzeInput(ctx, command, false);
      return;
    }

    const validInput = await this.validateInput(ctx, command, walletAddress, chain)

    if (validInput) {
      await this.performWalletAnalysis(ctx, walletAddress)
    }
  }

  private async canMakeAnalysis(ctx: BotContext): Promise<boolean> {
    const currentMoment = moment();

    if (currentMoment.isSameOrBefore(moment.unix(ctx.session.limitEndsTimestamp))) {
      const requestLimitCount = requestLimitMap[ctx.session.role]

      if (ctx.session.requestCount >= requestLimitCount) {
        const dateToString = moment.unix(ctx.session.limitEndsTimestamp).format('MMMM Do YYYY, H:mm:ss');
        const errorText =
          `⛔️You have reached your request limit of ${requestLimitCount}. Try next time on ${dateToString}.`
        await ctx.sendMessage(errorText);
        return false;
      }
    } else {
      ctx.session.limitEndsTimestamp = currentMoment.add(1, 'day').unix();
      ctx.session.requestCount = 0;
    }

    return true;
  }

  private async onTextInput(ctx: BotContext) {
    if (!this.isAnalysisInProgress) {
      const inputParts = await ctx.update.message?.text?.split(' ');
      let command = '', walletAddress: string, chain: string;

      if (inputParts.length === 3) {
        [command, walletAddress, chain] = inputParts
      } else {
        [walletAddress, chain] = inputParts
      }

      const validInput = await this.validateInput(ctx, command, walletAddress, chain);

      if (validInput) {
        await this.performWalletAnalysis(ctx, walletAddress)
      }
    }
  }

  private async validateInput(ctx: BotContext, command: string, walletAddress: string, chain: string): Promise<boolean> {
    const validCommand = command.length > 0 ? command.includes('analyze') : true;
    const validEthAddress = new RegExp(ethAddressPattern).test(walletAddress);
    const validChain = chain === 'eth';

    if (!validCommand || !validEthAddress || !validChain) {
      await this.askAnalyzeInput(ctx, command, true);
      return false;
    }

    return true;
  }

  private async askAnalyzeInput(ctx: BotContext, command: string, isError: boolean) {
    const text = `
      ${isError ? '❗️' : '⚠️'} Input ${isError ? 'valid ' : ''}wallet address (42 hex) and chain (eth). Example:
      \n<code>${command} 0x6cd9ec78fd467f2251b6cdb768fd9e312ecfc574 eth</code>
    `
    const msg = await ctx.replyWithHTML(text, {reply_markup: {force_reply: true}});
    this.replyMessageID = msg.message_id;
  }

  private async showExitMenu(ctx: BotContext) {
    const msgText = `${this.isAnalysisInProgress ? 'Analysis in progress. ' : ''}Use this button to exit analysis:`;
    const msg = await ctx.sendMessage(
      msgText,
      Markup.inlineKeyboard([
        Markup.button.callback('Exit', AnalyzeSceneAction.EXIT),
      ])
    )
    this.previousMessageID = msg.message_id;
  }

  private async exitAnalysisAction(ctx: BotContext) {
    if (this.isAnalysisInProgress) {
      this.analysisSubscription.unsubscribe();
    }

    if (this.replyMessageID) {
      await ctx.deleteMessage(this.replyMessageID)
      this.replyMessageID = null;
    }

    await ctx.sendMessage(`Analysis has been exited.`);
    await ctx.answerCbQuery();
    await ctx.scene.leave();
  }

  private async performWalletAnalysis(ctx: BotContext, wallet: string) {
    this.replyMessageID = null;

    await ctx.sendMessage(`📊Starting analyzing wallet ${wallet}. This may take a while.`)

    const analysisFinished$ = new Subject();
    let analysisInProgressMessageID: number;

    const analysisResult$ = this.blockchainService.getWalletTransactionHistory(wallet)
      .pipe(
        /**
         * Delay used to make sure 5 calls/sec are not exceeded
         */
        delay(this.oneSecInMilliSecs),
        switchMap((txs) => {
          txs = txs.slice(0, 100);
          return this.processTransactionSwaps(txs)
        }),
        switchMap((swaps: TransactionSwap[]) => this.processAnalysisResult(swaps)),
        tap(() => analysisFinished$.next({})),
      )

    /**
     * Every 10 seconds show user a message to understand what's going on
     */
    const analysisProgress$ = interval(10000).pipe(
      takeUntil(analysisFinished$),
      tap(async () => {
        if (analysisInProgressMessageID) {
          await ctx.deleteMessage(analysisInProgressMessageID)
        }
        const msg = await ctx.sendMessage('⌛Analysis in progress...')
        analysisInProgressMessageID = msg.message_id;
      })
    );

    this.analysisSubscription = combineLatest([analysisResult$, analysisProgress$])
      .pipe(
        filter(([analysisResult]) => !!analysisResult),
        map(([analysisResult]) => analysisResult),
      )
      .subscribe(async (analysisResult) => {
        if (analysisInProgressMessageID) {
          await ctx.deleteMessage(analysisInProgressMessageID)
        }
        await ctx.sendMessage(`Analysis successfully finished!`)
        ctx.session.requestCount += 1;

        if (analysisResult.length > 0) {
          const workSheet = XLSX.utils.json_to_sheet(analysisResult);
          const workBook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workBook, workSheet, 'Sheet 1');
          XLSX.writeFile(workBook, 'analysis.xlsx');

          await ctx.replyWithDocument({
            source: 'analysis.xlsx',
            filename: `${moment().unix()}_${wallet}_analysis.xlsx`
          });
        } else {
          await ctx.sendMessage(`No swap transactions found.`)
        }

        await ctx.scene.leave();
      })
  }

  private processTransactionSwaps(txs: TransactionResponse[]): Observable<TransactionSwap[]> {
    /**
     * Interval together with take is used to make sure 5 calls/sec are not exceeded
     */
    return interval(this.oneSecInMilliSecs)
      .pipe(
        take(Math.ceil(txs.length / etherscanCallsLimitPerSecond)),
        mergeMap((requestPackIndex: number) => {
          const lastIndexPerStep = etherscanCallsLimitPerSecond - 1
          const start = requestPackIndex * lastIndexPerStep - 1 + requestPackIndex
          const end = start + lastIndexPerStep + 1
          return forkJoin(txs.slice(start, end).map(tx => this.blockchainService.getTransactionSwaps(tx)))
        }),
        toArray(),
        map((res: any[]) => res.flat(Infinity))
      )
  }

  private processAnalysisResult(swaps: TransactionSwap[]): Observable<AnalysisResult[]> {
    /**
     * Interval together with take is used to make sure 5 calls/sec are not exceeded
     */
    return interval(this.oneSecInMilliSecs)
      .pipe(
        take(swaps.length),
        mergeMap((requestsPackIndex: number) => {
          const {tokens: [token0Address, token1Address], type, poolFee, timestamp} = swaps[requestsPackIndex]
          return forkJoin([
            this.blockchainService.getTokenSymbol(token0Address),
            this.blockchainService.getTokenSymbol(token1Address),
            this.blockchainService.getTokensPoolAddress(token0Address, token1Address, type, poolFee),
          ]).pipe(
            map((result: string[]) => {
              const [token0Symbol, token1Symbol, poolAddress] = result
              return {
                date: moment.unix(timestamp).format(),
                token0Address,
                token0Symbol,
                token1Address,
                token1Symbol,
                poolAddress,
                dexType: type
              }
            }))
        }),
        toArray(),
      )
  }
}
