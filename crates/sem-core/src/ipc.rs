use std::path::PathBuf;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::{broadcast, Mutex, RwLock};
use tracing::{debug, warn};

use crate::state::{LightState, StateSnapshot, StateMachine};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "cmd", rename_all = "lowercase")]
pub enum IpcRequest {
    Set {
        state: String,
        #[serde(default)]
        session: String,
        #[serde(default)]
        source: String,
        #[serde(default)]
        reason: String,
    },
    Status,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IpcResponse {
    pub state: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

pub fn socket_path() -> PathBuf {
    if let Ok(custom) = std::env::var("SEMAPHORE_SOCKET") {
        return PathBuf::from(custom);
    }

    #[cfg(unix)]
    {
        if let Ok(runtime) = std::env::var("XDG_RUNTIME_DIR") {
            return PathBuf::from(runtime).join("semaphore.sock");
        }
        let uid = unsafe { libc::getuid() };
        PathBuf::from(format!("/tmp/semaphore-{uid}.sock"))
    }

    #[cfg(windows)]
    {
        PathBuf::from(r"\\.\pipe\semaphore")
    }
}

pub struct IpcServerHandle {
    pub state_tx: broadcast::Sender<StateSnapshot>,
}

pub struct IpcServer {
    machine: Arc<RwLock<StateMachine>>,
    state_tx: broadcast::Sender<StateSnapshot>,
}

impl IpcServer {
    pub fn new(machine: Arc<RwLock<StateMachine>>) -> (Self, IpcServerHandle) {
        let (state_tx, _) = broadcast::channel(32);
        (
            Self {
                machine,
                state_tx: state_tx.clone(),
            },
            IpcServerHandle { state_tx },
        )
    }

    pub async fn run(self) -> std::io::Result<()> {
        let path = socket_path();

        #[cfg(unix)]
        {
            if path.exists() {
                let _ = std::fs::remove_file(&path);
            }
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            let listener = tokio::net::UnixListener::bind(&path)?;
            debug!(?path, "IPC server listening");
            loop {
                let (stream, _) = listener.accept().await?;
                let machine = Arc::clone(&self.machine);
                let state_tx = self.state_tx.clone();
                tokio::spawn(async move {
                    if let Err(err) = handle_client(stream, machine, state_tx).await {
                        warn!(?err, "ipc client error");
                    }
                });
            }
        }

        #[cfg(windows)]
        {
            use tokio::net::windows::named_pipe::{
                NamedPipeServer, ServerOptions,
            };

            let mut server = ServerOptions::new()
                .first_pipe_instance(true)
                .create(r"\\.\pipe\semaphore")?;

            loop {
                server.connect().await?;
                let connected = server;
                server = ServerOptions::new().create(r"\\.\pipe\semaphore")?;
                let machine = Arc::clone(&self.machine);
                let state_tx = self.state_tx.clone();
                tokio::spawn(async move {
                    if let Err(err) =
                        handle_client(connected, machine, state_tx).await
                    {
                        warn!(?err, "ipc client error");
                    }
                });
            }
        }
    }
}

async fn handle_client<S>(
    stream: S,
    machine: Arc<RwLock<StateMachine>>,
    state_tx: broadcast::Sender<StateSnapshot>,
) -> std::io::Result<()>
where
    S: tokio::io::AsyncRead + tokio::io::AsyncWrite + Unpin,
{
    let (reader, mut writer) = tokio::io::split(stream);
    let mut lines = BufReader::new(reader).lines();
    let response = if let Some(line) = lines.next_line().await? {
        process_line(&line, &machine, &state_tx).await
    } else {
        IpcResponse {
            state: "green".to_string(),
            error: Some("empty request".to_string()),
        }
    };
    let payload = serde_json::to_string(&response).unwrap_or_else(|_| {
        r#"{"state":"green","error":"serialization failed"}"#.to_string()
    });
    writer.write_all(payload.as_bytes()).await?;
    writer.write_all(b"\n").await?;
    writer.flush().await?;
    Ok(())
}

async fn process_line(
    line: &str,
    machine: &Arc<RwLock<StateMachine>>,
    state_tx: &broadcast::Sender<StateSnapshot>,
) -> IpcResponse {
    let request: IpcRequest = match serde_json::from_str(line) {
        Ok(req) => req,
        Err(err) => {
            return IpcResponse {
                state: current_state_string(machine).await,
                error: Some(format!("invalid json: {err}")),
            };
        }
    };

    match request {
        IpcRequest::Status => IpcResponse {
            state: current_state_string(machine).await,
            error: None,
        },
        IpcRequest::Set {
            state,
            session,
            source,
            reason,
        } => {
            let Some(parsed) = LightState::parse(&state) else {
                return IpcResponse {
                    state: current_state_string(machine).await,
                    error: Some(format!("unknown state: {state}")),
                };
            };
            let session_id = if session.is_empty() {
                "default".to_string()
            } else {
                session
            };
            let mut guard = machine.write().await;
            let snapshot = guard.set_session(&session_id, parsed, &source, &reason);
            drop(guard);
            let _ = state_tx.send(snapshot);
            IpcResponse {
                state: light_state_to_str(snapshot.state).to_string(),
                error: None,
            }
        }
    }
}

async fn current_state_string(machine: &Arc<RwLock<StateMachine>>) -> String {
    let guard = machine.read().await;
    light_state_to_str(guard.aggregated()).to_string()
}

fn light_state_to_str(state: LightState) -> &'static str {
    match state {
        LightState::Green => "green",
        LightState::Yellow => "yellow",
        LightState::Red => "red",
    }
}

pub async fn send_set(
    state: LightState,
    session: &str,
    source: &str,
    reason: &str,
) -> std::io::Result<IpcResponse> {
    let request = IpcRequest::Set {
        state: light_state_to_str(state).to_string(),
        session: session.to_string(),
        source: source.to_string(),
        reason: reason.to_string(),
    };
    send_request(&request).await
}

pub async fn send_status() -> std::io::Result<IpcResponse> {
    send_request(&IpcRequest::Status).await
}

async fn send_request(request: &IpcRequest) -> std::io::Result<IpcResponse> {
    let payload = serde_json::to_string(request).unwrap();
    let path = socket_path();

    #[cfg(unix)]
    {
        use tokio::net::UnixStream;
        let mut stream = UnixStream::connect(&path).await?;
        stream.write_all(payload.as_bytes()).await?;
        stream.write_all(b"\n").await?;
        let mut reader = BufReader::new(stream);
        let mut line = String::new();
        reader.read_line(&mut line).await?;
        parse_response(&line)
    }

    #[cfg(windows)]
    {
        use tokio::net::windows::named_pipe::ClientOptions;
        let mut client = ClientOptions::new().open(r"\\.\pipe\semaphore")?;
        client.write_all(payload.as_bytes()).await?;
        client.write_all(b"\n").await?;
        let mut reader = BufReader::new(client);
        let mut line = String::new();
        reader.read_line(&mut line).await?;
        parse_response(&line)
    }
}

fn parse_response(line: &str) -> std::io::Result<IpcResponse> {
    serde_json::from_str(line.trim()).map_err(|err| {
        std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            err.to_string(),
        )
    })
}

pub struct PruneTask {
    machine: Arc<RwLock<StateMachine>>,
    state_tx: broadcast::Sender<StateSnapshot>,
}

impl PruneTask {
    pub fn new(
        machine: Arc<RwLock<StateMachine>>,
        state_tx: broadcast::Sender<StateSnapshot>,
    ) -> Self {
        Self { machine, state_tx }
    }

    pub async fn run(self) {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
        loop {
            interval.tick().await;
            let mut guard = self.machine.write().await;
            let snapshot = guard.prune_stale();
            drop(guard);
            let _ = self.state_tx.send(snapshot);
        }
    }
}

// Re-export for optional locking helper used by Tauri
pub type SharedStateMachine = Arc<Mutex<StateMachine>>;
