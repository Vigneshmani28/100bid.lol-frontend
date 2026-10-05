"use client";

import { useEffect } from "react";
import { getDataFast } from "@/lib/datafast";

export function DataFastAnalytics() {
  useEffect(() => {
    getDataFast();
  }, []);

  return null;
}