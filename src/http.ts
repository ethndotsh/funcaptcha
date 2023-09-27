async function request(url: string, options: RequestInit) {
  const res = await fetch(url, options);
  const body = await res.json();
  return {
    headers: res.headers,
    body,
  };
}

export default request;
