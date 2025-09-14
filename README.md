# Telegram Swap Decoder Bot

A Telegram bot designed for on-chain analysis of trading activities on decentralized exchanges (DEXs), specifically tracking swap events for a given wallet address on Ethereum.

## Overview

The **Telegram Swap Decoder Bot** enables users to analyze swap transactions for a specified Ethereum wallet by generating an Excel report with detailed trade information. The bot supports two user roles with different request limits and provides a simple command-based interface.

### Commands
- `/start`: Initiates interaction with the bot and prompts the user to select a role ("User" or "Analyst").
- `/help`: Displays information about available commands.
- `/analyze <wallet_address> eth`: Generates an Excel report of all swap transactions for the specified Ethereum wallet.

### Excel Report Details
- Token A ticker and contract address
- Token B ticker and contract address
- Trade date
- Pool contract address
- DEX type (Uniswap V2 or V3)

### User Roles
- **User**: Limited to 5 requests per 24 hours.
- **Analyst**: Limited to 20 requests per 24 hours.

## Example Usage

Start the bot:

`/start`

The bot responds with a welcome message and asks the user to select a role ("User" or "Analyst").

<br>

Analyze a wallet:

`/analyze 0xae2Fc483527B8EF99EB5D9B44875F005ba1FaE13 eth`

The bot returns an Excel file containing the wallet's swap transaction history.

