"use client";

import { useEffect, useRef } from "react";

import { clearCartAction } from "@/lib/actions/cart";

// empties the bag after the (sample) checkout
export function ClearCartOnMount() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    clearCartAction().catch((error: unknown) => console.error(error));
  }, []);
  return null;
}
