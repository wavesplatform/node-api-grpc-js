# About

[![npm version](https://img.shields.io/npm/v/@waves/node-api-grpc.svg?style=flat)](https://www.npmjs.com/package/@waves/node-api-grpc)

A client for Waves Node gRPC and Blockchain Updates.

# How to use

Npm package: `@waves/node-api-grpc`.

We use:
* `@grpc/proto-loader` to load proto-files and the embedded app `proto-loader-gen-types` to generate definitions;
* `@grpc/grpc-js` to request the data from Waves Node gRPC API;
* `long` to represent 64-bit integers: `int64`, `uint64`, etc.

## Examples

1. `npm install --save @waves/node-api-grpc bs58`

   `bs58` here for encoding and decoding addresses and ids.

2. Create a channel:
    ```typescript
    import * as w from '@waves/node-api-grpc'
    const grpcChannel = w.grpc.mkDefaultChannel('grpc.wavesnodes.com:6870', {
      // Additional options if required. For example:
      // "grpc.max_receive_message_length": 10 * 1024 * 1024
    })
    ```
    See a full list of options in [@grpc/grpc-js](https://www.npmjs.com/package/@grpc/grpc-js#user-content-supported-channel-options).

3. A typical usage with TypeScript looks like:
    ```typescript
    import * as w from '@waves/node-api-grpc'
    import b58 from 'bs58'
    
    const grpcChannel = w.grpc.mkDefaultChannel('grpc.wavesnodes.com:6870')
    
    // Node gRPC API - a streaming example
    const transactionsApi = w.api.waves.node.grpc.mkTransactionsApi(grpcChannel)
    const txnId = '287XcMXPDY7pnw2tECbV86TZetPi2x9JBg9BVUsGaSJx';
    transactionsApi
        .getTransactions({transactionIds: [b58.decode(txnId)]}) // see TransactionsRequest
        .on("data", (item: w.api.waves.node.grpc.TransactionResponse) => console.log(`[getTransactions] The transaction '${txnId}' was on height of ${item.height}`))
        .on("end", () => console.log("[getTransactions] Stream ended"))
        .on("error", (e: Error) => console.error("[getTransactions] Failed", e))
    
    // Node gRPC API - an one-shot example
    const accountsApi = w.api.waves.node.grpc.mkAccountsApi(grpcChannel)
    const alias = 'likli'
    accountsApi.resolveAlias(
        {value: alias}, // Accepts google.protobuf.StringValue, that has "value" field
        (error, response) => {
            if (error === null) {
                const addressBytes = response?.value || new Buffer(0);
                console.log(`[resolveAlias] The address of '${alias}' is ${b58.encode(addressBytes)}`)
            } else console.error(`[resolveAlias] Can't determine address of '${alias}'`, error)
        }
    )
   
    // Blokchain updates gRPC API example
    // Note, we have to do another connection
    const blockchainUpdatesChannel = w.grpc.mkDefaultChannel('grpc.wavesnodes.com:6881') // 6881 instead of 6870
      
    const blockchainUpdatesApi = w.api.waves.events.grpc.mkBlockchainUpdatesApi(blockchainUpdatesChannel)
    blockchainUpdatesApi.getBlockUpdate(
        {height: 1},
        (error, response) => {
            if (error === null) {
                const txnIds = (response?.update?.append?.transactionIds || []).map(x => b58.encode(x));
                console.log(`[getBlockUpdate] Transactions of block 1: ${txnIds.join(", ")}`)
            } else console.error(`[getBlockUpdate] Can't get transactions of block 1`, error)
        }
    )
    ```
    
    With JavaScript looks similar:
    ```javascript
    const w = require('@waves/node-api-grpc');
    const b58 = require('bs58');
    
    const channel = w.grpc.mkDefaultChannel('grpc.wavesnodes.com:6870')
    
    const transactionsApi = w.api.waves.node.grpc.mkTransactionsApi(channel)
    const txnId = '287XcMXPDY7pnw2tECbV86TZetPi2x9JBg9BVUsGaSJx';
    transactionsApi
        .getTransactions({transactionIds: [b58.decode(txnId)]})
        .on("data", (item) => console.log(`[getTransactions] The transaction '${txnId}' was on height of ${item.height}`))
        .on("end", () => console.log("[getTransactions] Stream ended"))
        .on("error", (e) => console.error("[getTransactions] Failed", e))
    ```

Types and API clients correlates with a structure of proto-files. For example:
* `waves/node/grpc/transactions_api.proto` relates to `waves.node.grpc`:
    ```protobuf
    package waves.node.grpc;
    ```
* It has the `TransactionResponse` message:
    ```protobuf
    // waves/node/grpc/transactions_api.proto
    message TransactionResponse {
    ```
* So we have `waves.node.grpc.TransactionResponse`;
* We used `w.api.waves.node.grpc.TransactionResponse` in the example.

If you want to create a client of API that isn't listed in the example, you need:
1. Find it among proto-files
2. Write `w.api.{here.is.a.namespace.of.your.api}mk{Api name}`
3. Then look at a method you are interested in:
   a. If you see `stream` in the response like:
   ```
   rpc GetTransactions (TransactionsRequest) returns (stream TransactionResponse)
   ```
   Then you need to register an event handler for "data" event (see the "Streaming" example)
   b. Otherwise, you need to provide only a callback (see the "One-shot" example)

# How to build and test locally

```shell
$ npm run build && npm test
```

# Publishing

See https://docs.npmjs.com/updating-your-published-package-version-number
