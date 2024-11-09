import * as assert from 'assert'
import * as w from '../dist'
import b58 from 'bs58'
import { Channel } from '@grpc/grpc-js';

async function resolveAlias(channel: Channel, alias: string) {
  return new Promise<string>((resolve, reject) => {
    const accountsApi = w.api.waves.node.grpc.mkAccountsApi(channel)
    accountsApi.resolveAlias(
      { value: alias },
      (error, response) => {
        if (error === null) {
          const addressBytes = response?.value || new Buffer(0);
          resolve(b58.encode(addressBytes))
        } else reject(error)
      }
    )
  })
}

async function getTransactionHeight(channel: Channel, txnId: string) {
  return new Promise<number>((resolve, reject) => {
    const transactionsApi = w.api.waves.node.grpc.mkTransactionsApi(channel)
    transactionsApi
      .getTransactions({ transactionIds: [b58.decode(txnId)] })
      .on("data", (item: w.api.waves.node.grpc.TransactionResponse) => resolve((item.height as number) || 0))
      .on("error", (e: Error) => reject(e))
  })
}

async function getBigestBlock(channel: Channel, height: number) {
  return new Promise<number>((resolve, reject) => {
    const blocksApi = w.api.waves.node.grpc.mkBlocksApi(channel)
    blocksApi
      .getBlock({
        height: height,
        includeTransactions: true
      },
        (error, response) => {
          if (error) return reject(error);
          if (!response) return reject("Block not found");

          resolve(response.height);
        }
      )
  })
}

describe('Waves gRPC API', () => {
  let channel = w.grpc.mkDefaultChannel('grpc.wavesnodes.com:6870')

  // One request
  it('#AccountsApi.resolveAlias - resolves an alias', async () => {
    let address = await resolveAlias(channel, 'likli')
    assert.equal(address, '3PNaua1fMrQm4TArqeTuakmY1u985CgMRk6')
  })

  // Stream
  it('#TransactionApi.getTransaction - finds a transaction', async () => {
    let txnHeight = await getTransactionHeight(channel, '287XcMXPDY7pnw2tECbV86TZetPi2x9JBg9BVUsGaSJx')
    assert.equal(txnHeight, 3131305)
  })

  it('#BlocksApi.getBlock - reads the biggest block', async () => {
    const height = 1
    const r = await getBigestBlock(channel, height)
    assert.equal(r, height)
  })

  after(() => {
    channel.close()
  })
})
