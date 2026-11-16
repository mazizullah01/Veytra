import { adminFailure, isAdminEmail, requireUser } from "@/lib/admin";

export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    if (!isAdminEmail(user.email)) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }
    return Response.json({ email: user.email, admin: true });
  } catch (error) {
    return adminFailure(error);
  }
}
