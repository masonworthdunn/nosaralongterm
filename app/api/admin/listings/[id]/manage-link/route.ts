import { NextResponse } from "next/server";
import { supabaseAdmin, isAdminAuthorized } from "@/lib/supabaseAdmin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: existing } = await supabaseAdmin
    .from("listing_edit_tokens")
    .select("token")
    .eq("listing_id", id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ token: existing.token });
  }

  const { data: created, error } = await supabaseAdmin
    .from("listing_edit_tokens")
    .insert({ listing_id: id })
    .select("token")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ token: created.token });
}
