import {EtherscanProvider} from "@ethersproject/providers/src.ts/etherscan-provider";
import {ethers} from "ethers";
import {TransactionResponse} from "@ethersproject/abstract-provider";
import {DexType, SwapFunction, TransactionSwap} from "../interfaces/blockchain.interface";
import {abi as ERC20_ABI} from "@openzeppelin/contracts/build/contracts/ERC20.json"
import {Result} from "@ethersproject/abi/src.ts/coders/abstract-coder";
import {getPathFromUniswapV3, getTokenPairsFromPath} from "../utils/blockchain.utils";
import {
  availablePoolFees,
  contractEntities,
  contractFactoryMap,
  ContractType,
  swapFunctionCodesMap
} from "../constants/blockchain.constants";
import {onlyZerosPattern} from "../constants/patterns.constants";

export class BlockchainService {
  private provider: EtherscanProvider;

  constructor() {
    this.provider = new ethers.providers.EtherscanProvider('mainnet', process.env.ETHERSCAN_API_TOKEN)
  }

  async getWalletTransactionHistory(walletAddress: string): Promise<TransactionResponse[]> {
    return await this.provider.getHistory(walletAddress)
  }

  async getTransactionByHash(hash: string): Promise<TransactionResponse> {
    return await this.provider.getTransaction(hash);
  }

  async parseTransaction(tx: TransactionResponse): Promise<TransactionSwap[]> {
    const contractEntity = contractEntities.find(entity => entity.address.toLowerCase() === tx.to.toLowerCase())

    if (!contractEntity) {
      return [];
    }

    const contractABI = await this.provider.fetch('contract', {action: 'getabi', address: contractEntity.address})
    const contractInterface = new ethers.utils.Interface(contractABI);

    const parsedTx = contractInterface.parseTransaction({data: tx.data});

    let txSwaps: TransactionSwap[] = [];

    switch (contractEntity.type) {
      case ContractType.UNISWAP_V2_ROUTER:
        if (!parsedTx.name.toLowerCase().includes('swap')) {
          return [];
        }
        txSwaps.push({
          tokens: [parsedTx.args.path[0], parsedTx.args.path[1]],
          type: DexType.UNISWAP_V2,
        })
        break;

      case ContractType.UNISWAP_V3_ROUTER:
        if (!parsedTx.name.toLowerCase().includes('exact') && !parsedTx.name.toLowerCase().includes('single')) {
          return [];
        }
        txSwaps.push({
          tokens: [parsedTx.args[0].tokenIn, parsedTx.args[0].tokenOut],
          poolFee: parsedTx.args[0].fee,
          type: DexType.UNISWAP_V3,
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
        let decoded: Result;
        let preparedSwaps: TransactionSwap[];

        swapFunctions.forEach(swapFunction => {
          switch (swapFunction.type) {
            case DexType.UNISWAP_V2:
              decoded = abiCoder.decode(['address', 'uint256', 'uint256', 'address[]', 'bool'], swapFunction.input);
              preparedSwaps = getTokenPairsFromPath(decoded[3]).map(tokens => ({tokens, type: DexType.UNISWAP_V2}))
              txSwaps.push(...preparedSwaps)
              break;

            case DexType.UNISWAP_V3:
              decoded = abiCoder.decode(['address', 'uint256', 'uint256', 'bytes', 'bool'], swapFunction.input);
              preparedSwaps = getTokenPairsFromPath(getPathFromUniswapV3(decoded[3])).map(tokens => ({tokens, type: DexType.UNISWAP_V3}))
              txSwaps.push(...preparedSwaps)
              break;
            default:
              break;
          }
        })

        break;
      default:
        return [];
    }

    return txSwaps;
  }

  async getTokenSymbols(tokens: string[]): Promise<string[]> {
    const token0Contract = new ethers.Contract(
      tokens[0],
      ERC20_ABI,
      this.provider
    );
    const token1Contract = new ethers.Contract(
      tokens[1],
      ERC20_ABI,
      this.provider
    );

    return [await token0Contract.symbol(), await token1Contract.symbol()]
  }

  async getTokensPoolAddress(tokens: string[], dexType: DexType, fee: number): Promise<string> {
    const recursivelyGetV3PoolAddress = async (poolFeeIndex = 0) => {
      const address = await factoryContract.getPool(tokens[0], tokens[1], availablePoolFees[poolFeeIndex])
      const invalidAddress = new RegExp(onlyZerosPattern).test(address.split('x')[1])
      if (!invalidAddress) {
        return address;
      } else {
        return await recursivelyGetV3PoolAddress(++poolFeeIndex);
      }
    }

    const {address, abi} = contractFactoryMap[dexType]
    const factoryContract = new ethers.Contract(address, abi, this.provider)

    const poolFeeIndex = fee ? availablePoolFees.indexOf(fee) : 0;

    return dexType === DexType.UNISWAP_V2
      ? await factoryContract.getPair(tokens[0], tokens[1])
      : await recursivelyGetV3PoolAddress(poolFeeIndex);
  }
}