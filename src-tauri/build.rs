use std::path::PathBuf;

fn main() {
    let profile = std::env::var("PROFILE").unwrap();
    let target = std::env::var("TARGET").unwrap();
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let workspace_root = manifest_dir.parent().expect("workspace root");

    let semctl_name = if cfg!(windows) {
        "semctl.exe"
    } else {
        "semctl"
    };
    let target_dir = workspace_root.join("target");
    let built = [target_dir.join(&target).join(&profile), target_dir.join(&profile)]
        .into_iter()
        .map(|dir| dir.join(semctl_name))
        .find(|path| path.exists())
        .unwrap_or_else(|| target_dir.join(&target).join(&profile).join(semctl_name));

    if !built.exists() {
        panic!(
            "semctl binary not found (looked under target/{target}/{profile} and target/{profile}). \
             Run `npm run dev:prepare` or `cargo build -p semctl --bin semctl` first."
        );
    }

    let staged_name = if cfg!(windows) {
        format!("semctl-{target}.exe")
    } else {
        format!("semctl-{target}")
    };
    let bundle_bin = manifest_dir.join("bin").join(&staged_name);
    if let Some(parent) = bundle_bin.parent() {
        std::fs::create_dir_all(parent).expect("create src-tauri/bin");
    }
    std::fs::copy(&built, &bundle_bin).expect("copy semctl for bundle");

    println!("cargo:rerun-if-changed=../crates/semctl");
    println!("cargo:rerun-if-changed=bin/{staged_name}");
    tauri_build::build();
}
