import net from "net";
import path from "path";

/** Resolves the semaphore IPC socket/pipe path, mirroring sem-core/src/ipc.rs */
function socketPath(): string {
  const env = process.env["SEMAPHORE_SOCKET"];
  if (env) return env;

  if (process.platform === "win32") {
    return "\\\\.\\pipe\\semaphore";
  }

  const uid = typeof process.getuid === "function" ? process.getuid() : 0;
  const xdg = process.env["XDG_RUNTIME_DIR"];
  return xdg ? path.join(xdg, "semaphore.sock") : `/tmp/semaphore-${uid}.sock`;
}

export type LightState = "green" | "yellow" | "red" | "unknown";

/** Sends a single status query to the semaphore IPC and returns the state string. */
export function queryState(): Promise<LightState> {
  return new Promise<LightState>((resolve) => {
    let settled = false;

    const done = (state: LightState) => {
      if (!settled) {
        settled = true;
        resolve(state);
      }
    };

    const socket = net.createConnection(socketPath());
    let buf = "";

    socket.setTimeout(1000);

    socket.once("connect", () => {
      socket.write('{"cmd":"status"}\n');
    });

    socket.on("data", (chunk: Buffer) => {
      buf += chunk.toString("utf8");
    });

    socket.once("end", () => {
      try {
        const resp = JSON.parse(buf.trim()) as { state?: string };
        const s = resp.state;
        done(s === "green" || s === "yellow" || s === "red" ? s : "unknown");
      } catch {
        done("unknown");
      }
    });

    socket.once("error", () => done("unknown"));
    socket.once("timeout", () => {
      socket.destroy();
      done("unknown");
    });
  });
}
