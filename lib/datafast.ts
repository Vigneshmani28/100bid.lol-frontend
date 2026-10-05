import { initDataFast } from "datafast";

let datafast: Awaited<ReturnType<typeof initDataFast>> | null = null;

export async function getDataFast() {
  if (!datafast) {
    datafast = await initDataFast({
      websiteId: process.env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID!,
      autoCapturePageviews: true,
    });
  }

  return datafast;
}