async function request(url: string, options: RequestInit) {
  const res = await fetch(url, options);

  return {
    headers: Object.fromEntries(res.headers.entries()),
    body: Buffer.from(await res.arrayBuffer()),
  };
}

export default request;
