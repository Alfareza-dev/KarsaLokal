import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = searchParams.get("origin_village_code");
  const destination = searchParams.get("destination_village_code");
  const weight = searchParams.get("weight");

  if (!origin || !destination || !weight) {
    return NextResponse.json(
      { error: "origin_village_code, destination_village_code, and weight are required" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://use.api.co.id/expedition/shipping-cost?origin_village_code=${origin}&destination_village_code=${destination}&weight=${weight}`,
      {
        headers: {
          "x-api-co-id": process.env.API_CO_ID_KEY || "",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    let options: any[] = [];
    if (data.is_success && data.data && Array.isArray(data.data.couriers)) {
      options = data.data.couriers.filter((item: any) => item.price && item.price > 0);
    } else if (Array.isArray(data)) {
      options = data.filter((item: any) => item.cost && item.cost > 0 || item.price && item.price > 0);
    } else if (data.results && Array.isArray(data.results)) {
      options = data.results.filter((item: any) => item.cost && item.cost > 0 || item.price && item.price > 0);
    }

    return NextResponse.json(options);
  } catch (error: any) {
    console.error("Shipping cost API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
