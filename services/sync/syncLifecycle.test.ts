import assert from "node:assert/strict"

import { SyncLifecycle } from "./syncLifecycle"

async function main() {
  const calls: Array<{ userIds: number[]; source: string }> = []

  const syncService = {
    setUserId() {},
    syncUsers: async (userIds: number[]) => {
      calls.push({
        userIds,
        source: "syncUsers"
      })

      await new Promise((resolve) =>
        setTimeout(resolve, 30)
      )
    }
  }

  const lifecycle = new SyncLifecycle(
    syncService as never,
    () => [1],
    0,
    0
  )

  lifecycle.requestSync("timer")
  lifecycle.requestSync("timer")

  await new Promise((resolve) => setTimeout(resolve, 120))

  assert.equal(
    calls.length,
    2,
    "queued sync requests should not be dropped"
  )
  assert.deepEqual(calls[0].userIds, [1])
  assert.deepEqual(calls[1].userIds, [1])

  console.log("syncLifecycle queued-sync regression passed")
}

void main()
