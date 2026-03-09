import { Stack } from "expo-router";
import { useEffect } from "react";
import { initDB } from "../database/initDB";
import { seedData } from "../database/seedData";

export default function RootLayout() {

  useEffect(() => {
    async function setup() {
      await initDB();
      await seedData();
    }
    setup();
  }, []);

  return <Stack />;
}