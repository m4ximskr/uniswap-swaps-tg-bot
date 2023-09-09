import { ethers} from "ethers";
import {TransactionResponse} from "@ethersproject/abstract-provider";
import {DexType, SwapFunction, TransactionSwap} from "../interfaces/blockchain.interface";
import {abi as ERC20_ABI} from "@openzeppelin/contracts/build/contracts/ERC20.json"
import {getPathFromUniswapV3, getTokenPairsFromPath} from "../utils/blockchain.utils";
import {
  availablePoolFees,
  contractEntities,
  contractFactoryMap,
  ContractType,
  swapFunctionCodesMap
} from "../constants/blockchain.constants";
import {onlyZerosPattern} from "../constants/patterns.constants";
import {catchError, from, map, Observable, of, switchMap} from "rxjs";

export class BlockchainService {
  private provider: ethers.providers.EtherscanProvider;

  constructor() {
    this.provider = new ethers.providers.EtherscanProvider('homestead', process.env.ETHERSCAN_API_TOKEN)
  }

  getWalletTransactionHistory(walletAddress: string): Observable<TransactionResponse[]> {
    return from(this.provider.getHistory(walletAddress)).pipe(catchError(() => of([])))
  }

  getTransactionByHash(hash: string): Observable<TransactionResponse> {
    return from(this.provider.getTransaction(hash));
  }

  getTransactionSwaps(tx: TransactionResponse): Observable<TransactionSwap[]> {
    const contractEntity = contractEntities.find(entity => entity.address.toLowerCase() === tx.to.toLowerCase())

    if (!contractEntity) {
      return of([]);
    }

    return from(this.provider.fetch('contract', {action: 'getabi', address: contractEntity.address})).pipe(
      map((contractABI: string) => {
        const contractInterface = new ethers.utils.Interface(contractABI);

        const parsedTx = contractInterface.parseTransaction({data: tx.data});

        let txSwaps: TransactionSwap[] = [];

        switch (contractEntity.type) {
          case ContractType.UNISWAP_V2_ROUTER:
            if (!parsedTx.name.toLowerCase().includes('swap')) {
              break;
            }
            txSwaps.push({
              tokens: [parsedTx.args.path[0], parsedTx.args.path[1]],
              type: DexType.UNISWAP_V2,
              timestamp: tx.timestamp,
            })
            break;

          case ContractType.UNISWAP_V3_ROUTER:
            if (!parsedTx.name.toLowerCase().includes('exact') && !parsedTx.name.toLowerCase().includes('single')) {
              break;
            }
            txSwaps.push({
              tokens: [parsedTx.args[0].tokenIn, parsedTx.args[0].tokenOut],
              poolFee: parsedTx.args[0].fee,
              type: DexType.UNISWAP_V3,
              timestamp: tx.timestamp,
            })
            break;

          case ContractType.UNISWAP_UNIVERSAL_ROUTER:
          case ContractType.UNISWAP_UNIVERSAL_ROUTER_2:
            const commandCodes = parsedTx.args.commands.substring(2).match(/.{1,2}/g);

            const swapFunctions: SwapFunction[] = commandCodes.reduce((functions: SwapFunction[], commandCode: string) => {
              const foundIndex = Object.keys(swapFunctionCodesMap).indexOf(commandCode);
              if (foundIndex !== -1) {
                functions.push({
                  type: swapFunctionCodesMap[commandCode],
                  input: parsedTx.args.inputs[commandCodes.indexOf(commandCode)]
                })
              }
              return functions
            }, [])

            const abiCoder = new ethers.utils.AbiCoder();
            let decoded: ethers.utils.Result;
            let preparedSwaps: TransactionSwap[];

            swapFunctions.forEach(swapFunction => {
              switch (swapFunction.type) {
                case DexType.UNISWAP_V2:
                  decoded = abiCoder.decode(['address', 'uint256', 'uint256', 'address[]', 'bool'], swapFunction.input);
                  preparedSwaps = getTokenPairsFromPath(decoded[3]).map(tokens =>
                    ({tokens, type: DexType.UNISWAP_V2, timestamp: tx.timestamp})
                  )
                  txSwaps.push(...preparedSwaps)
                  break;

                case DexType.UNISWAP_V3:
                  decoded = abiCoder.decode(['address', 'uint256', 'uint256', 'bytes', 'bool'], swapFunction.input);
                  preparedSwaps = getTokenPairsFromPath(getPathFromUniswapV3(decoded[3])).map(tokens =>
                    ({tokens, type: DexType.UNISWAP_V3, timestamp: tx.timestamp})
                  )
                  txSwaps.push(...preparedSwaps)
                  break;
                default:
                  break;
              }
            })

            break;
          default:
            break;
        }

        return txSwaps;
      }),
      catchError((e) => {
        return of([])
      }),
    )

  }

  getTokenSymbol(token: string): Observable<string> {
    const tokenContract = new ethers.Contract(
      token,
      ERC20_ABI,
      this.provider
    );
    return from(tokenContract.symbol() as Promise<string>).pipe(catchError((e) => {
      return of('-')
    }));
  }

  getTokensPoolAddress(token0: string, token1: string, dexType: DexType, fee: number): Observable<string> {
    const recursivelyGetV3PoolAddress = (poolFeeIndex = 0) => {
      return from(factoryContract.getPool(token0, token1, availablePoolFees[poolFeeIndex]) as Promise<string>).pipe(
        switchMap((address) => {
          const invalidAddress = new RegExp(onlyZerosPattern).test(address.split('x')[1])
          if (!invalidAddress) {
            return of(address);
          } else {
            return recursivelyGetV3PoolAddress(++poolFeeIndex);
          }
        })
      )
    }

    const {address, abi} = contractFactoryMap[dexType]
    const factoryContract = new ethers.Contract(address, abi, this.provider)

    const poolFeeIndex = fee ? availablePoolFees.indexOf(fee) : 0;

    const obs$ = dexType === DexType.UNISWAP_V2
      ? from(factoryContract.getPair(token0, token1) as Promise<string>)
      : recursivelyGetV3PoolAddress(poolFeeIndex);

    return obs$.pipe(catchError((e) => {
      return of('-')
    }))
  }
}