const handler = async (event) => {

    let preflightResp = await fetch(
      "https://httpbin.org/response-headers?Flags=group-A,new-header,search-enabled",
      { backend: "origin_0" }
    );
  
    // Avoid making changes to the original Request object.
    // It's usually better to clone and create a new object.
    const originalReq = event.request;
    const newReq = new Request(originalReq);
    newReq.headers.set('flags', preflightResp.headers.get('flags'));
  
    const clientResponse = await fetch(newReq, { backend: "origin_1" });
    return clientResponse;
  };
  
  addEventListener('fetch', event => event.respondWith(handler(event)));