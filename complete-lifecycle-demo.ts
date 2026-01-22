#!/usr/bin/env bun

// Complete Bun Server Lifecycle Demo
// Shows all lifecycle methods with proper demonstrations

const server = Bun.serve({
  port: 0,
  development: true,
  async fetch(req, server) {
    const url = new URL(req.url);
    
    // Log all requests for demonstration
    console.log(`📡 ${req.method} ${url.pathname} from ${server.requestIP(req)?.address}`);
    
    switch (url.pathname) {

      case '/': {
        return new Response(`
🚀 Bun Server Lifecycle Demo
===========================

Available endpoints:
• /ip          - Show client IP information
• /slow        - Test per-request timeout (2s limit, 3s sleep)
• /reload      - Hot-swap handlers without restart
• /stop        - Graceful shutdown
• /stop?force  - Force shutdown immediately
• /metrics     - Show server metrics

Current server: ${server.id}
Process ref/unref status: Active
        `.trim());
      }

      case '/ip': {
        const ip = server.requestIP(req);
        return Response.json({
          clientIP: ip || { error: 'no ip' },
          serverID: server.id,
          timestamp: new Date().toISOString()
        });
      }

      case '/slow': {
        console.log('⏱️ Starting slow request with 2s timeout...');
        server.timeout(req, 2);          // 2 s idle timeout
        
        // This should timeout before completing
        await Bun.sleep(3_000);          // longer than timeout
        return new Response('This should not be seen due to timeout');
      }

      case '/reload': {
        console.log('🔄 Hot reloading server handlers...');
        server.reload({
          async fetch(req, server) {
            const url = new URL(req.url);
            
            if (url.pathname === '/stop') {
              const force = url.searchParams.has('force');
              console.log(`🛑 Stopping server (force: ${force})`);
              await server.stop(force);
              return Response.json({ stopped: true, force });
            }
            
            return new Response(`🔄 Handler swapped via reload() at ${new Date().toISOString()}\n`);
          }
        });
        return new Response('🔄 Reload scheduled - try /stop now\n');
      }

      case '/metrics': {
        return Response.json({
          serverID: server.id,
          pendingRequests: server.pendingRequests,
          pendingWebSockets: server.pendingWebSockets,
          url: server.url,
          uptime: process.uptime(),
          memory: process.memoryUsage()
        });
      }

      default:
        return new Response('Not found - try / for endpoints\n', { status: 404 });
    }
  }
});

console.log(`🚀 Server ${server.id} started at ${server.url}`);
console.log('');
console.log('📋 Available endpoints:');
console.log(`  curl ${server.url}           # Show this menu`);
console.log(`  curl ${server.url}ip         # Client IP detection`);
console.log(`  curl ${server.url}slow       # Timeout demonstration`);
console.log(`  curl ${server.url}reload     # Hot reload handlers`);
console.log(`  curl ${server.url}metrics    # Server metrics`);
console.log(`  curl ${server.url}stop       # Graceful shutdown`);
console.log(`  curl ${server.url}stop?force # Force shutdown`);
console.log('');

/* Demo ref/unref behavior */
console.log('🔧 Demo ref/unref behavior:');
console.log('   • server.unref() called - process can exit if server is only thing running');
console.log('   • server.ref() will be restored after 5 seconds');

server.unref();               // allow exit if nothing else running
setTimeout(() => {
  console.log('🔧 server.ref() restored - process will now stay alive for server');
  server.ref();
}, 5_000);

// Graceful shutdown after 60 seconds for demo
setTimeout(() => {
  console.log('⏰ Demo timeout reached - shutting down gracefully...');
  server.stop(false);
}, 60_000);

console.log('');
console.log('⏰ Server will auto-shutdown after 60 seconds');
console.log('🛡️ All lifecycle methods are ready for testing!');
