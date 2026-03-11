// hooks/useController.ts

import { useRef } from "react"

/*
---------------------------------------------------
Generic Controller Hook
---------------------------------------------------

Creates controller only once
and persists across component renders

Usage:

const controller = useController(() =>
  new PracticeController(...)
)

---------------------------------------------------
*/

export function useController<T>(

  createController: () => T

): T {

  const ref = useRef<T | null>(null)

  if (!ref.current) {

    ref.current = createController()

  }

  return ref.current

}