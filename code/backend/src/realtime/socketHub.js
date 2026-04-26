const WebSocket = require("ws");
const { logger } = require("../config/logger");

class SocketHub {
  constructor() {
    this.server = null;
    this.clients = new Set();
  }

  attach(httpServer) {
    this.server = new WebSocket.Server({ server: httpServer, path: "/ws" });
    this.server.on("connection", (socket) => {
      this.clients.add(socket);
      socket.send(JSON.stringify({ type: "connected", message: "Debug realtime stream connected" }));

      socket.on("close", () => {
        this.clients.delete(socket);
      });
    });
    logger.info("WebSocket hub attached at /ws");
  }

  broadcast(event, payload) {
    if (!this.server) return;
    const message = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    this.clients.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    });
  }
}

const socketHub = new SocketHub();

module.exports = { socketHub };
