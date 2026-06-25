export async function readJsonRequest(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
