// unused import removed
use tokio_postgres::NoTls;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn test_connection(connection_string: String) -> Result<String, String> {
    let (client, connection) = tokio_postgres::connect(&connection_string, NoTls)
        .await
        .map_err(|e| e.to_string())?;

    // The connection object performs the actual communication with the database,
    // so spawn it off to run on its own.
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    let rows = client
        .query("SELECT version()", &[])
        .await
        .map_err(|e| e.to_string())?;

    let version: String = rows[0].get(0);
    Ok(format!("Connected to: {}", version))
}

#[tauri::command]
async fn execute_sql(connection_string: String, sql: String) -> Result<String, String> {
    let (client, connection) = tokio_postgres::connect(&connection_string, NoTls)
        .await
        .map_err(|e| e.to_string())?;

    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    client
        .batch_execute(&sql)
        .await
        .map_err(|e| e.to_string())?;

    Ok("Execution successful".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, test_connection, execute_sql])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
