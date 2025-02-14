export const blockchainTooltipData = {
  transactions: {
    status:
      'Indicates the current status of the transaction, such as pending, confirmed, or failed.',
    requestKey:
      'A unique identifier assigned to each transaction for tracking and reference purposes.',
    chain: 'Specifies the blockchain network on which the transaction occurred.',
    from: 'The sender or origin address of the transaction.',
    to: 'The recipient or destination address of the transaction.',
  },
  transaction: {
    requestKey: 'A unique identifier assigned to the transaction request.',
    status: 'The current status or outcome of the transaction.',
    chain: 'The blockchain network on which the transaction occurred.',
    blockHeight:
      'The numerical position of the block in the blockchain where the transaction is recorded.',
    timestamp: 'The date and time at which the transaction was validated.',
    overview: {
      from: 'The address or account from which the transaction originated.',
      to: 'The address or account to which the transaction was sent.',
      amount: 'The quantity of tokens or cryptocurrency transferred in the transaction.',
      transactionFee: 'The fee paid for processing the transaction.',
      paidBy: 'The entity responsible for paying the transaction fee.',
      gasPrice: 'The cost per unit of gas used in the transaction.',
      code: 'Additional information or code associated with the transaction.',
    },
    meta: {
      sender: 'The entity or account initiating the transaction.',
      chain: 'The blockchain network on which the transaction occurred.',
      gasLimit: 'The maximum amount of gas allowed for the transaction.',
      ttl: 'Time to Live, indicating the duration for which the transaction remains valid.',
      creationTime: 'The timestamp indicating when the transaction was created.',
      publicKey: 'The public key associated with the transaction.',
      nonce: 'A sequential number assigned to each transaction initiated by an account.',
      data: 'Additional data or information included with the transaction.',
    },
    output: {
      transactionId: 'The unique identifier assigned to the transaction.',
      result: 'The outcome or status of the transaction.',
      logs: 'Additional information or logs generated during the transaction.',
      signatures: 'Digital signatures associated with the transaction.',
      continuation: 'Any continuation or follow-up actions related to the transaction.',
    },
    events: {
      coinTransfer: 'This event signifies a transfer of cryptocurrency or tokens.',
    },
  },
  blocks: {
    status:
      'Indicates the current status of the transaction, such as pending, confirmed, or failed.',
    requestKey:
      'A unique identifier assigned to each transaction for tracking and reference purposes.',
    chain: 'Specifies the blockchain network on which the transaction occurred.',
  },
  block: {
    chain: 'The specific blockchain or chain to which the block belongs.',
    blockHeight: 'The numerical height or position of the block within the blockchain.',
    creationTime: 'The timestamp indicating when the block was created or mined.',
    parent: 'The parent block from which the current block was derived or built upon.',
    powHash:
      'The Proof of Work (POW) hash associated with the block, indicating the computational work done to validate it.',
    overview: {
      target: 'The intended recipient or target of the block.',
      hash: 'A unique identifier for the block, generated using a cryptographic hash function.',
      totalFees: 'The total fees collected by miner for including transactions in the block.',
      nonce: 'A value used in the mining process to vary the block hash.',
      weight: 'The weight assigned to the block within the blockchain network.',
      epochStart: 'The start time of the epoch in which the block was mined.',
      flags: 'Any special indicators or flags associated with the block.',
      chainwebVersion: 'The version of the Chainweb protocol used.',
      neighbors: 'Other blocks connected or adjacent to this block in the blockchain network.',
    },
    payload: {
      minerAccount: 'The account of the miner who mined the block.',
      minerPublicKeys: "The public keys associated with the miner's account.",
      minerPredicate: "Any specific conditions or predicates associated with the miner's account.",
      transactionsHash: 'A hash of all transactions included in the block.',
      outputsHash: 'A hash of all outputs produced by transactions in the block.',
      payloadHash: "A hash of the block's payload data.",
    },
    coinbase: {
      gas: 'The amount of gas consumed by the block.',
      result: "The result of executing the block's transactions.",
      requestKey: "The unique identifier for the block's request.",
      logs: "Any logs or messages generated by the block's execution.",
      metadata: 'Additional metadata associated with the block.',
      transactionId: "The identifier for the block's transaction.",
    },
    transactions: {
      blockHash: 'The hash of the block containing the transaction.',
      status:
        'The status of the transaction. Indicates whether the transaction is confirmed, pending, or failed.',
      requestKey:
        'The unique request key associated with the transaction. It is used to uniquely identify the transaction on the blockchain.',
      code: 'The code or type of transaction executed. It may include information about the type of transaction, such as fund transfer, smart contract execution, among others.',
    },
  },
  account: {
    address: 'The account identifier or address associated with the account.',
    balance: 'The current balance of the account.',
    assets: 'The total number of assets held in the account.',
    transactions: 'The total number of transactions associated with the account.',
    createdAt: 'The date and time when the account was created.',
    tabAssets: {
      asset: 'The name or identifier of the asset held in the account.',
      symbol: 'The symbol or abbreviation representing the asset.',
      quantity: 'The quantity or amount of the asset held.',
      price: 'The current price of the asset, if applicable.',
      value: 'The total value of the asset in the account, calculated based on quantity and price.',
    },
    tabTransactions: {
      status: 'The status of the transaction associated with the account.',
      requestKey: 'The unique identifier associated with the transaction.',
      chain: 'The blockchain network or chain where the transaction occurred.',
      blockHeight: 'The height of the block where the transaction was recorded.',
      from: 'The sender or origin of the transaction.',
      amount: 'The amount transacted in the transaction.',
      date: 'The date and time when the transaction occurred.',
    },
    tabAccountStatement: {
      date: 'The date and time of the transaction.',
      transactionDescription: 'A brief description or summary of the transaction.',
      amount: 'The amount involved in the transaction.',
      runningBalance: 'The updated balance of the account after the transaction.',
    },
  },
  trendingCollections: {
    volume: 'The total trading volume of the collection over the specified time period.',
    volumeChange: 'The percentage change in trading volume compared to the previous period.',
    floorPrice:
      'The lowest price at which an NFT from this collection is currently listed for sale.',
    owners: 'The total number of unique owners or holders of NFTs from this collection.',
    transfers: 'The total number of transfers or transactions involving NFTs from this collection.',
    totalAssets: 'The total number of NFTs or assets within this collection.',
  },
  nft: {
    transfers: {
      hash: 'The unique identifier for the transaction involving the NFT.',
      method: 'The method or action performed in the transaction, such as transfer or mint.',
      from: 'The address or entity from which the NFT was transferred or originated.',
      to: 'The address or entity to which the NFT was transferred.',
    },
    collection: {
      totalItems: 'The total number of NFTs present in the collection.',
      owners: 'The number of unique individuals or addresses holding NFTs from this collection.',
      forSale: 'The number of NFTs from this collection currently listed for sale.',
      floorPrice: 'The lowest listed price for any NFT within this collection.',
      averagePrice: 'The average price of all NFTs within this collection.',
      volume: 'The total trading volume of NFTs from this collection over a specified period.',
      tabActivity: {
        hash: 'A unique identifier for each transaction involving NFTs from this collection.',
        from: 'The address or entity initiating the transfer of NFTs.',
        to: 'The address or entity receiving the transferred NFTs.',
      },
    },
  },
  nftDetails: {
    id: 'The indexer NFT ID.',
    account: 'The account identifier or address associated with the account.',
    price: 'The current price of the NFT in the marketplace.',
    floorPrice: 'The minimum price set for the NFT in the marketplace.',
    owner: 'The current owner of the NFT.',
    creator: 'The creator or original issuer of the NFT.',
    timestamp: 'The date and time when the NFT was created or last modified.',
    marketplace: 'The platform or marketplace where the NFT is listed for sale or auction.',
    activity: {
      account: 'The account identifier or address associated with the account.',
      hash: 'A unique identifier for each transaction involving the NFT.',
      from: 'The address or entity initiating the transfer of the NFT.',
      to: 'The address or entity receiving the transferred NFT.',
    },
  },
  trendingTokens: {
    change:
      "The percentage change in the token's price over a specific period, typically the last 24 hours.",
    volume: 'The total trading volume of the token over the past 24 hours.',
    marketCap:
      'The total market capitalization of the token, calculated by multiplying the current price by the circulating supply.',
    circulatingSupply:
      'The total number of tokens currently in circulation and available for trading.',
  },
  tokenTransfers: {
    hash: 'A unique identifier for the token transfer transaction.',
    method: "Indicates the type or method of token transfer, such as 'transfer' or 'approve'.",
    from: 'The address from which the tokens were transferred.',
    to: 'The address to which the tokens were transferred.',
    amount: 'The quantity or amount of tokens transferred in the transaction.',
  },
  tokenDetails: {
    overview: {
      price: 'Current price of the token.',
      maxTotalSupply: 'Maximum total supply of the token.',
      holders: 'Total number of token holders.',
      totalTransfers: 'Total number of transfers involving the token.',
    },
    summary: {
      contract: 'Address of the token smart contract.',
      decimals: 'Number of decimal places used for the token.',
      website: 'Official website of the token project.',
    },
    transfers: {
      hash: 'Unique identifier for the token transfer transaction.',
      blockHeight: 'The block number in which the transaction occurred.',
      method: "Type or method of token transfer (e.g., 'transfer' or 'approve').",
      from: 'Address from which the tokens were transferred.',
      to: 'Address to which the tokens were transferred.',
    },
    holders: {
      quantity: 'Quantity of tokens held by the holder.',
      valueUSD: 'Value of the tokens held by the holder in USD.',
      percentage: 'Percentage of total tokens held by the holder.',
    },
    information: {
      marketCapitalization: 'Total market capitalization of the token.',
      volume24H: 'Total trading volume of the token in the last 24 hours.',
      circulatingSupply: 'Total circulating supply of the token.',
    },
  },
};
