import { SQLiteDatabase } from "expo-sqlite"
import { useCallback, useEffect, useRef, useState } from "react"

import {
  addRegisteredDevice,
  getAllowedDeviceBackendKeys,
  deleteRegisteredDevice,
  getActiveDeviceBackendKey,
  getRegisteredDevices,
  renameRegisteredDevice,
  toggleAllowedDeviceBackendKey,
  setActiveDeviceBackendKey,
  type RegisteredDevice
} from "@/database/deviceRegistryRepository"
import { SyncService } from "@/services/syncService"

export function useDeviceRegistry(
  db: SQLiteDatabase | null,
  userId: number | null
) {
  const [devices, setDevices] =
    useState<RegisteredDevice[]>([])
  const [allowedDeviceKeys, setAllowedDeviceKeys] =
    useState<string[] | null>(null)
  const [activeDeviceKey, setActiveDeviceKeyState] =
    useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const loadTokenRef = useRef(0)

  const load = useCallback(async () => {
    if (!db || userId == null) {
      setDevices([])
      setActiveDeviceKeyState(null)
      setLoading(false)
      return
    }

    const loadToken = ++loadTokenRef.current
    setLoading(true)

    try {
      const nextDevices =
        await getRegisteredDevices(db, userId)
      const nextActive =
        await getActiveDeviceBackendKey(db, userId)
      const nextAllowed =
        await getAllowedDeviceBackendKeys(db, userId)

      if (loadToken !== loadTokenRef.current) {
        return
      }

      setDevices(nextDevices)
      setActiveDeviceKeyState(nextActive)
      setAllowedDeviceKeys(nextAllowed)
    } catch (error) {
      console.warn(
        "Failed to load device registry:",
        error
      )
      setDevices([])
      setActiveDeviceKeyState(null)
      if (loadToken !== loadTokenRef.current) {
        return
      }
    } finally {
      if (loadToken === loadTokenRef.current) {
        setLoading(false)
      }
    }
  }, [db, userId])

  useEffect(() => {
    void load()
  }, [load])

  const activeDevice =
    devices.find((device) =>
      device.backendKey === activeDeviceKey
    ) ?? null

  const visibleDeviceKeys =
    allowedDeviceKeys == null
      ? devices.map((device) => device.backendKey)
      : allowedDeviceKeys
  const visibleDevices = devices.filter((device) =>
    visibleDeviceKeys.includes(device.backendKey)
  )
  const isDeviceAllowed = useCallback(
    (backendKey: string) => {
      if (allowedDeviceKeys == null) {
        return devices.some(
          (device) => device.backendKey === backendKey
        )
      }

      return allowedDeviceKeys.includes(backendKey)
    },
    [allowedDeviceKeys, devices]
  )

  const addDevice = useCallback(
    async (displayName: string) => {
      if (!db) {
        throw new Error("Database is not ready yet.")
      }
      if (userId == null) {
        throw new Error("Select a user profile first.")
      }
      await addRegisteredDevice(db, userId, displayName)
      await load()
    },
    [db, load, userId]
  )

  const renameDevice = useCallback(
    async (backendKey: string, displayName: string) => {
      if (!db) {
        throw new Error("Database is not ready yet.")
      }
      if (userId == null) {
        throw new Error("Select a user profile first.")
      }
      await renameRegisteredDevice(
        db,
        userId,
        backendKey,
        displayName
      )
      await load()
    },
    [db, load, userId]
  )

  const deleteDevice = useCallback(
    async (backendKey: string) => {
      if (!db) {
        throw new Error("Database is not ready yet.")
      }
      if (userId == null) {
        throw new Error("Select a user profile first.")
      }
      const syncService = new SyncService(db, userId)

      try {
        await syncService.syncUser(userId, {
          showOverlay: false
        })
      } catch (error) {
        throw new Error(
          error instanceof Error
            ? `Sync failed before delete: ${error.message}`
            : "Sync failed before delete."
        )
      }
      await deleteRegisteredDevice(db, userId, backendKey)
      await load()
    },
    [db, load, userId]
  )

  const toggleDeviceAllowed = useCallback(
    async (backendKey: string) => {
      if (!db) {
        throw new Error("Database is not ready yet.")
      }
      if (userId == null) {
        throw new Error("Select a user profile first.")
      }
      await toggleAllowedDeviceBackendKey(
        db,
        userId,
        backendKey
      )
      await load()
    },
    [db, load, userId]
  )

  const setActiveDevice = useCallback(
    async (backendKey: string | null) => {
      if (!db) {
        throw new Error("Database is not ready yet.")
      }
      if (userId == null) {
        throw new Error("Select a user profile first.")
      }
      if (
        activeDeviceKey &&
        activeDeviceKey !== backendKey
      ) {
        try {
          await new SyncService(db, userId).syncUser(
            userId,
            { showOverlay: false }
          )
        } catch (error) {
          console.warn(
            "Device switch sync timed out or failed, continuing with switch:",
            error
          )
        }
      }

      await setActiveDeviceBackendKey(db, userId, backendKey)
      await load()
    },
    [activeDeviceKey, db, load, userId]
  )

  return {
    devices,
    visibleDevices,
    activeDevice,
    activeDeviceKey,
    allowedDeviceKeys,
    isDeviceAllowed,
    loading,
    addDevice,
    renameDevice,
    deleteDevice,
    toggleDeviceAllowed,
    setActiveDevice,
    reload: load
  }
}
