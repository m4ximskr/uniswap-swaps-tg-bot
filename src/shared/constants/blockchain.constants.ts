import {ContractEntity, ContractFactoryMap, DexType} from "../interfaces/blockchain.interface";
import {abi as UNISWAP_V2_FACTORY_ABI} from "@uniswap/v2-core/build/UniswapV2Factory.json";
import {abi as UNISWAP_V3_FACTORY_ABI} from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";

export enum ContractType {
  UNISWAP_V2_ROUTER = 'uniswap_v2',
  UNISWAP_V3_ROUTER = 'uniswap_v3',
  UNISWAP_UNIVERSAL_ROUTER = 'uniswap_universal',
  UNISWAP_UNIVERSAL_ROUTER_2 = 'uniswap_universal_2',
}

export const contractEntities: ContractEntity[] = [
  {
    type: ContractType.UNISWAP_V2_ROUTER,
    address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  },
  {
    type: ContractType.UNISWAP_V3_ROUTER,
    address: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  },
  {
    type: ContractType.UNISWAP_UNIVERSAL_ROUTER,
    address: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
  },
  {
    type: ContractType.UNISWAP_UNIVERSAL_ROUTER_2,
    address: '0xEf1c6E67703c7BD7107eed8303Fbe6EC2554BF6B',
  },
]

export const swapFunctionCodesMap: {[key: string]: DexType} = {
  '00': DexType.UNISWAP_V3,
  '08': DexType.UNISWAP_V2,
};

export const contractFactoryMap: ContractFactoryMap = {
  [DexType.UNISWAP_V2]: {
    address: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    abi: UNISWAP_V2_FACTORY_ABI,
  },
  [DexType.UNISWAP_V3]: {
    address: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    abi: UNISWAP_V3_FACTORY_ABI
  }
}

export const availablePoolFees = [100, 500, 3000, 10000];

export const etherscanCallsLimitPerSecond = 5;

