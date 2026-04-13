import { auth } from "@/lib/auth/server";

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, ctx: RouteContext) {
  return auth.handler().GET(request, ctx);
}
export async function POST(request: Request, ctx: RouteContext) {
  return auth.handler().POST(request, ctx);
}
export async function PUT(request: Request, ctx: RouteContext) {
  return auth.handler().PUT(request, ctx);
}
export async function DELETE(request: Request, ctx: RouteContext) {
  return auth.handler().DELETE(request, ctx);
}
export async function PATCH(request: Request, ctx: RouteContext) {
  return auth.handler().PATCH(request, ctx);
}
