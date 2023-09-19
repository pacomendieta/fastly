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
  if ([ "PUT", "PATCH", "DELETE"].includes(request.method)) {
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


  //301  - redireccion a /version
  if (url.pathname == "/301") {
    const {protocol, host, pathname } = url
    console.log("Protocol:", protocol," host:", host )
    //const host = request.headers.get("Host");
    var resp = new Response (null, 
               { headers: new Headers({ "Location" : protocol+ "//" + host + "/version"  , "Cache-Control": "no-cache"}), 
                 status:301,
                })
    return resp;
  }
  //cambio de url
  if (url.pathname == "/cambio") {
    //url.pathname = "/version"
    //const {protocol, host, pathname } = url
    //console.log("Protocol:", protocol," host:", host )
    var newurl = new URL ( "http://httpbin.org/get")
    var newrequest = new Request(newurl,request)
    console.log("Request:", JSON.stringify(request,null,3) )
    console.log("new Request:", JSON.stringify(newrequest,null,3) )
    var resp = await fetch ( newrequest, { backend: "httpbin" })

    return resp;  
  }

  //cookies
  if (url.pathname == "/cookies") {

      // ver cookies
      const cookies = req.cookies
      cookies.delete("efimera")
      const cookieHeader = req.headers.get('cookie')
      console.log(`Original Cookie header is "${cookieHeader}"`);
      console.log(`Objeto req.cookies "${cookies}"`)
      console.log("Cookies:", JSON.stringify(cookies,null,3) )
      console.log("Cookies.headers:", JSON.stringify(cookies.headers,null,3) )

      const resp = new Response("Cookies: " + JSON.stringify(cookieHeader,null,3), {
        status: 200,
        headers: new Headers({ "Content-Type":  "application/json" }),
      });
      //res.cookie ('myCookie', 'foo en cookies', { path: "/cookies", maxAge: 3600 });
      //res.cookie ('myCookiePadre', 'foo en cookies', { path: "/", maxAge: 3600 });
      //res.cookie ('myCookiePadre', 'mi cookie', { path: "/cookies", maxAge: 3600 });
      //res.cookie ('segundaCookie', 'segunda foo', { path: "/cookies", maxAge: 3600 });
      res.cookie ('efimera', 'corta vida', { path: "/", maxAge: 20 });
      res.cookie('myCookie','mi cookie', { path: "/cookies"})
      res.cookie('myCookiePadre','mi cookie raiz', { path: "/"})
      res.headers.set('Cache-Control', 'no-store, private');
      res.clearCookie('myCookie',  { path: "/"})
    res.send( "Cookies: " + JSON.stringify(cookieHeader,null,3) ) ;
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
  let ip =  event.client.address
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
      const newRequest = new Request("https://www.google.com")
     
      var resp = await fetch(newRequest, {
        backend: "google"
      });
      return resp
    }

    //Se manipula solamente la url destino (usando el backen httpbin)
    //httpbin
    if (url.pathname == "/httpbin") {
      //const newRequest = new Request("http://httpbin.org/get")
      const newRequest = new Request("http://httpbin.org/get",request)
      
      console.log("newRequest:", JSON.stringify(newRequest,null,3) )

      var resp = await fetch(newRequest, {
        backend: "httpbin"
      });
      return resp
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

  // post   
  // Cambiar metodo POST a GET para habilitar el cache
  if ( url.pathname == "/post") {
    // cambiar request para apuntar a /  para evitar embucle
    var newurl = new URL ( url.protocol + "//" + url.host )

    var resp
    if (request.method == "POST") {
        console.log("POST REQUEST:", JSON.stringify(request,null,3) )
        resp = fetch ( newurl , { method: "GET" })
       // resp = new Response("La peticion es POST")
    } else {
        console.log("GEST REQUEST:", JSON.stringify(request,null,3) )      
        resp = fetch ( newurl )
    }
    return resp
  }



  
  // req   
  // Cambiar solo la request
  if ( url.pathname == "/req") {
      let upstreamHeaders = new Headers({ "some-header": "someValue" });

      // Create a GET request to our origin using the custom headers
      let upstreamRequest = new Request("https://sharply-charming-dodo.edgecompute.app/", event.request);
      return fetch( upstreamRequest, { backend: "origin_0"});
  }
  

  

  //ttl  --> cambiar ttl
  if (url.pathname == "/ttl") {
    const backendName = "rtve"
    const newRequest = new Request("https://www.rtve.es")
    console.log ("\n****newRequest:\n", newRequest, "\n*******")

    let cacheOverride = new CacheOverride("override", { ttl: 60 });
    //var backendResponse = new Response(" Response ")
    var resp = await fetch(newRequest,  { 
        backend: backendName,
        cacheOverride
    })
    console.log ("\n****resp:\n", resp, "\n******")
    
    return resp

  }


  
    //version
    if (url.pathname == "/version") {
      return new Response('{"request": ' + JSON.stringify(request,null,3)  
      + ', "Version:" "' + env('FASTLY_SERVICE_VERSION') + '" }' ,
      {
        status: 200,
        headers: new Headers({"Content-Type": "application/json", }),
      })
    }


  
  // Catch all other requests and return a 404.
  return new Response("The page you requested could not be found ", {
    status: 404,
  });
}//handleRequest()


//----- VERSION EXPRESSLY ----------------------
import { Router } from "@fastly/expressly";
const router = new Router();
let backendResponse;

// Configure middleware that automatically proxies request
// asynchronously to your backend and sets the global variable
// for use in all your base request handlers.
router.use(async (req,res)=> {

  backendResponse = await handleRequest(req.event,req,res)
 


  // Si add en la query, añade contenido al body
  if ( req.urlObj && req.urlObj.searchParams.get('add') ) {
    // Obtiene el cuerpo de la respuesta como texto
    const responseBodyText = await backendResponse.text();

    // Concatena el string "<h2>Contenido adicional</h2>" al cuerpo de la respuesta
    const modifiedBody = responseBodyText + "<h2>Contenido adicional</h2>" + req.urlObj.searchParams.get('add');
  
    // Crea una nueva respuesta con el cuerpo modificado
    const modifiedResponse = new Response(modifiedBody, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: backendResponse.headers,
    });
    modifiedResponse.headers.append( "Content-Type", "text/html; charset=utf-8" )

    backendResponse = modifiedResponse

  }


} );


// If the URL begins with /json
router.get("/json", async (req, res) => {
  var writableBody = {}
  var newResp = {}
  console.log("\n****backendResponse:", backendResponse)


    // Obtiene el cuerpo de la respuesta como texto
    const responseBodyText = await backendResponse.text();

    // Concatena el string "<h2>Contenido adicional</h2>" al cuerpo de la respuesta
    const modifiedBody = responseBodyText + "<h2>Contenido adicional</h2>";
  
    // Crea una nueva respuesta con el cuerpo modificado
    const modifiedResponse = new Response(modifiedBody, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: backendResponse.headers,
    });
    modifiedResponse.headers.append( "Content-Type", "text/html; charset=utf-8" )

    backendResponse = modifiedResponse
  /*
  backendResponse.body.pipe( writableBody)
  writableBody.on ('finish', ()=>{
    newResp = newResponse( writableBody + "<br> Pasa por /json.")
    res.send(newResp)
  })
*/
});

router.all("(.*)", async (req, res) => {
  res.send(backendResponse);
});

router.listen();  // Usar expressly.router
//addEventListener("fetch", (event) => event.respondWith(handleRequest(event,event,{} )));  //Usar evento fetch