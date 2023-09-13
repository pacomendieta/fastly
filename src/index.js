//! Default Compute@Edge template program.

/// <reference types="@fastly/js-compute" />
// import { CacheOverride } from "fastly:cache-override";
// import { Logger } from "fastly:logger";
import { env } from "fastly:env";
import { includeBytes } from "fastly:experimental";


import { allowDynamicBackends } from "fastly:experimental";
allowDynamicBackends(true);
import { getGeolocationForIpAddress } from "fastly:geolocation"


// In the global scope be sure to import the Logger interface
import { Logger } from "fastly:logger";

import * as ipaddr from "ipaddr.js"

// Load a static file as a Uint8Array at compile time.
// File path is relative to root of project, not to this file
const welcomePage = includeBytes("./src/welcome-to-compute@edge.html");

// The entry point for your application.
//
// Use this fetch event listener to define your main request handling logic. It could be
// used to route based on the request properties (such as method or path), send
// the request to a backend, make completely new requests, and/or generate
// synthetic responses.

//----------------------------------------------------------------------------------




async function handleRequest( event, req, res ) {
  // Log service version
  console.log("FASTLY_SERVICE_VERSION:", env('FASTLY_SERVICE_VERSION') || 'local', ' '+ req.url);
  var request = req;
  // Get the client request.
  //let req = event.request;

  // Filter requests that have unexpected methods.
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    return new Response("This method is not allowed", {
      status: 405,
    });
  }

  let url = new URL(request.url);
 

  // If request is to the `/` path...
  if (url.pathname == "/") {
    // Below are some common patterns for Compute@Edge services using JavaScript.
    // Head to https://developer.fastly.com/learning/compute/javascript/ to discover more.

    // Create a new request.
    // let bereq = new Request("http://example.com");

    // Add request headers.
    //req.headers.set("X-Custom-Header", "Welcome to Compute@Edge!");
    // req.headers.set(
    //   "X-Another-Custom-Header",
    //   "Recommended reading: https://developer.fastly.com/learning/compute"
    // );

    // Create a cache override.
    // To use this, uncomment the import statement at the top of this file for CacheOverride.
    // let cacheOverride = new CacheOverride("override", { ttl: 60 });

    // Forward the request to a backend.
    // let beresp = await fetch(req, {
    //   backend: "backend_name",
    //   cacheOverride,
    // });

    // Remove response headers.
    // beresp.headers.delete("X-Another-Custom-Header");

    // Log to a Fastly endpoint.
    // To use this, uncomment the import statement at the top of this file for Logger.
    // const logger = new Logger("my_endpoint");
    // logger.log("Hello from the edge!");

    // Send a default synthetic response.
    return new Response(welcomePage, {
      status: 200,
      headers: new Headers({ "Content-Type": "text/html; charset=utf-8" }),
    });
  }


  //301  - redireccion a la home
  if (url.pathname == "/301") {
    const host = request.headers.get("Host");
    var resp = new Response (null, 
               { headers: new Headers({ "Location" : "https://"+host , "Cache-Control": "no-cache"}), 
                 status:301,
                url:"https://"+host })
    return resp;
  }


  //backend  --> cambiar ttl
  if (url.pathname == "/backend") {
    const backendName = "rtve"
    const newRequest = new Request("https://www.rtve.es")
    newRequest.headers.set("Cache-Control", "no-cache")
//console.log("\n\nReq Inicial:", request)
//console.log("\n\nNueva Req  :", newRequest)

   // let cacheOverride = new CacheOverride("override", { ttl: 60 });
    //var backendResponse = new Response(" Response ")
    var resp = await fetch(newRequest,  { 
        backend: backendName,
     //   cacheOverride
    })
    console.log ("\n****resp:", resp)
    
    return resp

  }




  //GEOLOCATION en Response y Headers
  if (url.pathname == "/geo") {
        try {
          let ip = new URL(request.url).searchParams.get('ip') || request.event.client.address || event.remoteAddress
          let geo = getGeolocationForIpAddress(ip);
          let clientGeo = request.event.client.geo
          geo.ip = ip
          console.log("objeto geo:", geo)
          return new Response(JSON.stringify(geo,null,3), {
            headers: {
              "Content-Type": "application/json",
              "client-geo-continent": clientGeo.continent,
              "client-geo-country"  : clientGeo.country_code,
              "client-geo-latitude" : clientGeo.latitude,
              "client-geo-longitude": clientGeo.longitude
            },
          });
        } catch (error) {
          console.error(error);
          return new Response("Internal Server Error en /geo", {
            status: 500
          });
        }
  }


// Ver tipo de IP  
if (url.pathname == "/ipaddr")  {
  // ver request
  //console.log("***request:", request)
  //console.log("***event:", event)

  // Parse the client IP address.
  let ip = request.remoteAddress || event.client.address
  let address = ipaddr.parse( ip )
  console.log("IP:", ip)

  // If if IP address is v6...
  if (address.kind() === "ipv6") {
    console.log("Received a request via IPv6")

    // Calculate a SHA-1 hash of the client IP address.
    const encoder = new TextEncoder()
    const data = encoder.encode(address)
    const hash = await crypto.subtle.digest("SHA-1", data)
    const hashArray = Array.from(new Uint8Array(hash))
    

    // Construct an IPv4 address from the first 4 bytes of the hash.
    address = ipaddr.fromByteArray([0xf0 | hashArray[0], hashArray[1], hashArray[2], hashArray[3]])

    console.log("Constructed IPv4 address " + address.toString())
  } else {
    console.log("Received a request via IPv4")
  }

  // Add the IP address as a header.
  req.headers.set("x-ipv4", address.toString())

  // Forward the request to the origin.
  return new Response("La IP es " + ip)
}

    //version
    if (url.pathname == "/version") {
      return new Response('{"request": ' + JSON.stringify(request,null,3)  + ', "Version:" "' + env('FASTLY_SERVICE_VERSION') + '" }',
      {
        status: 200,
        headers: new Headers({"Content-Type": "application/json", }),
      })
    }


    // env
    if (url.pathname == "/env") {
      const host = env("FASTLY_HOSTNAME");
      const entorno  = env("ENV")
      const trace    = env("FASTLY_TRACE_ID")
      console.log("FASTLY_HOSTNAME=",host);
      console.log("ENV=", entorno)
      return new Response("<h3>Variables de Entorno</h3><p> FASTLY_HOSTNAME: " + host + "</p><p>ENV:" + entorno + "</p>"+"<p>FASTLY_TRACE_ID:"+trace+"</p>", 
      {
        status: 200,
        headers: new Headers({ "Content-Type": "text/html; charset=utf-8" }),
      });

    }



    //google
    if (url.pathname == "/google") {
          var newReq = new Request("https://google.es", request);
          // Set the host header for backend access
          newReq.headers.set("Host", "google.es");
      
          // Send the retry request to backend
          return fetch(newReq, {
            backend: "google",
          });

          return new Response(resp, {
            status: 200,
            headers: new Headers({ "Content-Type": "text/html; charset=utf-8" }),
          })
      
    }

  //log
  if (url.pathname == "/log") {
    const logger = new Logger("my_endpoint_name");

    //logger.log("Escribiendo en log");
    return new Response("Escribiendo en Log", 
    {
      status: 200,
      headers: new Headers({ "Content-Type": "text/html; charset=utf-8" }),
    });

  }



  // req   
  // Cambiar solo la request
  if ( url.pathname == "/req") {
      let upstreamHeaders = new Headers({ "some-header": "someValue" });

      // Create a GET request to our origin using the custom headers
      let upstreamRequest = new Request("https://sharply-charming-dodo.edgecompute.app/", event.request);
      return fetch( upstreamRequest, { backend: "origin_0"});
  }
  
  
  // Catch all other requests and return a 404.
  return new Response("The page you requested could not be found ", {
    status: 404,
  });
}//handleRequest()


//----- VERSION EXPRESSLY ----------------------
import { Router } from "@fastly/expressly";
const PRODUCTS_BACKEND = "origin_0";
const router = new Router();
let backendResponse;

// Configure middleware that automatically proxies request
// asynchronously to your backend and sets the global variable
// for use in all your base request handlers.
router.use(async (req,res)=> {
  const resp = await handleRequest(req.event,req,res)
  res.send(resp)
} );


// If the URL begins with /json
router.get("/json", async (req, res) => {
  // Parse the JSON response from the backend.
  const data = await backendResponse.json();

  // Add a new field to the parsed data.
  data["new_field"] = "data injected at the edge";

  // Construct a new response using the new data but original status.
  res.withStatus(backendResponse.status).json(data);
});

router.all("(.*)", async (req, res) => {
  res.send(backendResponse);
});

router.listen();  // Usar expressly.router
//addEventListener("fetch", (event) => event.respondWith(handleRequest(event,event,{} )));  //Usar evento fetch