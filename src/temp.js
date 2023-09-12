


    const handler = async (event) => {
        // Get the request from the client
        const req = event.request;
      
        // Get the host header from the request
        const host = req.headers.get("Host");
      
        // If the host header is set, and does not start with 'www.'...
        if (host && !host.startsWith("www.")) {
          // Construct a synthetic response (permanent redirect)
          let resp = new Response(null, {
            headers: new Headers({
              'Location': 'www.' + host,
              'Cache-Control': 'max-age=86400'
            }),
            status: 301,
            url: req.url
          });
      
          // Send the constructed response, and return
          return resp;
        }
    }      