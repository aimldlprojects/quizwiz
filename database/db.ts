import { Platform } from "react-native"
import { db as nativeDb } from "./db.native"
import { db as webDb } from "./db.web"

export const db = Platform.OS === "web" ? webDb : nativeDb