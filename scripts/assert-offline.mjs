import net from "node:net";
// Use an IP address to prove outbound sockets are blocked independently of DNS.
const socket = net.createConnection({ host: "1.1.1.1", port: 443 });
const timeout = setTimeout(() => {
  socket.destroy();
  throw new Error("Offline probe timed out without an explicit denial.");
}, 3000);
socket.once("connect", () => {
  clearTimeout(timeout);
  socket.destroy();
  throw new Error("Offline probe connected: network is available.");
});
socket.once("error", (error) => {
  clearTimeout(timeout);
  if (!["EPERM", "EACCES"].includes(error.code)) throw error;
  console.log(`Outbound TCP blocked by OS policy (${error.code}).`);
});
