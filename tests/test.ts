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

async function loadBlocks(channel: Channel, fromHeight: number, toHeight: number) {
  let n = 0
  return new Promise<number>((resolve, reject) => {
    const blocksApi = w.api.waves.events.grpc.mkBlockchainUpdatesApi(channel)
    blocksApi
      .subscribe({
        fromHeight: fromHeight,
        toHeight: toHeight,
      })
      .on("data", (item: w.api.waves.events.grpc.SubscribeEvent) => {
        n += 1
      })
      .on("error", (e: Error) => reject(e))
      .on("end", () => resolve(n))
  })
}

describe('Waves gRPC API', function () {
  this.timeout(5000)

  let grpcChannel = w.grpc.mkDefaultChannel('grpc.wavesnodes.com:6870')
  let updatesChannel = w.grpc.mkDefaultChannel('grpc.wavesnodes.com:6881')

  // One request
  it('#AccountsApi.resolveAlias - resolves an alias', async () => {
    let address = await resolveAlias(grpcChannel, 'likli')
    assert.equal(address, '3PNaua1fMrQm4TArqeTuakmY1u985CgMRk6')
  })

  // Stream
  it('#TransactionApi.getTransaction - finds a transaction', async () => {
    let txnHeight = await getTransactionHeight(grpcChannel, '287XcMXPDY7pnw2tECbV86TZetPi2x9JBg9BVUsGaSJx')
    assert.equal(txnHeight, 3131305)
  })

  it('#BlockchainUpdatesApi.subscribe - load blocks', async () => {
    const fromHeight = 3371000
    const toHeight = 3371001
    const n = await loadBlocks(updatesChannel, fromHeight, toHeight)
    assert.equal(n, 2)
  })

  after(() => {
    updatesChannel.close()
    grpcChannel.close()
  })
})
