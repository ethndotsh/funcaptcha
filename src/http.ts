async function request(url: string, options: RequestInit) {
  const res = await fetch(url, options);

  return {
    headers: res.headers,
    body: Buffer.from(await res.arrayBuffer()),
  };
}

export default request;
