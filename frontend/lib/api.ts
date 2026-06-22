const API = process.env.NEXT_PUBLIC_API;

let csrfToken: string | null = null;

async function refreshCsrf(): Promise<string> {
  const res = await fetch(API + "csrf-token", { credentials: "include" });
  const data = await res.json();
  csrfToken = data.token as string;
  return csrfToken!;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  if (!csrfToken) {
    await refreshCsrf();
  }

  const res = await fetch(API + path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken!,
      ...options.headers,
    },
  });

  if (res.status === 403) {
    await refreshCsrf();
    return fetch(API + path, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken!,
        ...options.headers,
      },
    });
  }

  return res;
}

export async function apiGet(path: string) {
  const res = await fetch(API + path, { credentials: "include" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Error");
  return res.json();
}

export async function apiPost(path: string, body?: unknown) {
  const res = await apiFetch(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Error");
  return res.json();
}

export async function apiPatch(path: string, body?: unknown) {
  const res = await apiFetch(path, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Error");
  return res.json();
}

export async function apiDelete(path: string) {
  const res = await apiFetch(path, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Error");
  return res.json();
}
