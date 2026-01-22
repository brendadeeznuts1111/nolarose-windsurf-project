#!/usr/bin/env bun

// Bun Server Lifecycle Methods Demo
// Demonstrates all server lifecycle methods in one comprehensive example

const server = Bun.serve({
  port: 0,
  development: true,
  async fetch(req, server) {
    const url = new URL(req.url);
    switch (url.pathname) {

      case '/ip': {
        const ip = server.requestIP(req);
        return Response.json(ip || { error: 'no ip' });
      }

      case '/slow': {
        server.timeout(req, 2);          // 2 s idle timeout
        await Bun.sleep(3_000);          // longer than timeout
        return new Response('you should not see this');
      }

      case '/reload': {
        server.reload({
          fetch(req, server) {
            return new Response('handler swapped via reload()\n');
          }
        });
        return new Response('reload scheduled\n');
      }

      case '/stop': {
        const force = url.searchParams.has('force');
        await server.stop(force);        // graceful or force
        return Response.json({ stopped: true, force });
      }

      default:
        return new Response('OK\n');
    }
  }
});

console.log(`Server ${server.id} at ${server.url}`);
console.log('Try:');
console.log('  curl ' + server.url + 'ip');
console.log('  curl ' + server.url + 'slow        # will timeout');
console.log('  curl ' + server.url + 'reload');
console.log('  curl ' + server.url + 'stop?force  # kills server');

/* demo ref/unref */
server.unref();               // allow exit if nothing else running
setTimeout(() => server.ref(), 5_000); // restore keep-alive after 5 s

// Keep server alive for testing
setTimeout(() => {
  console.log('Server demo completed - shutting down...');
  server.stop(true);
}, 30000);
