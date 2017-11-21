# Vuejs 2.0 + vue-router Prerender SPA Example

Demonstrates usage of Vuejs 2.0 with Vue Router and Webpack 2. Build will generate 3 static routes at the following paths:

- `/`
- `/about`
- `/contact`

## Build

```
cd prerender-spa-plugin/examples/vue2-webpack-router
npm install
npm run build
```

Now check the new `dist` directory for your prerendered static files!

## Test Static Files

Run a simple `python` HTTP server to test your static files generated in `/dist/`.

#### macOS / Linux

```
cd dist
python -c $'import SimpleHTTPServer;\nmap = SimpleHTTPServer.SimpleHTTPRequestHandler.extensions_map;\nmap[""] = "text/plain";\nfor key, value in map.items():\n\tmap[key] = value + ";charset=UTF-8";\nSimpleHTTPServer.test();' "8000"
```

#### Windows

```powershell
cd dist
python -m SimpleHTTPServer 8000
```

Now try the following routes in your browser (note the trailing slash):

- [http://localhost:8000](http://localhost:8000/)
- [http://localhost:8000/about/](http://localhost:8000/about/)
- [http://localhost:8000/contact/](http://localhost:8000/contact/)

## Development

```bash
cd prerender-spa-plugin/examples/vue2-webpack-router
npm install
npm run dev
```





