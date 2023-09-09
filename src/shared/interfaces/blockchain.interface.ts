import {ContractType} from "../constants/blockchain.constants";
import {ContractInterface} from "@ethersproject/contracts/src.ts";

export enum DexType {
  UNISWAP_V2 = 'Uniswap v2',
  UNISWAP_V3 = 'Uniswap v3',
}

export interface TransactionSwap {
  timestamp: number;
  tokens: string[];
  type: DexType;
  poolFee?: number;
}

export interface ContractEntity {
  type: ContractType,
  address: string;
}

export type ContractFactoryMap = {
  [key in DexType]: {
    address: string;
    abi: ContractInterface,
  }
}

export interface SwapFunction {
  type: DexType;
  input: string;
}