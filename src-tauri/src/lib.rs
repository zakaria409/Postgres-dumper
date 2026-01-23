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

#[tauri::command]
async fn get_tables(connection_string: String) -> Result<Vec<String>, String> {
    // Log connection attempt (hide password for security)
    let masked_conn_str = if connection_string.contains("://") {
        let parts: Vec<&str> = connection_string.split("://").collect();
        if parts.len() == 2 {
            let after_protocol = parts[1];
            if let Some(at_pos) = after_protocol.find('@') {
                let host_part = &after_protocol[at_pos..];
                format!("{}://***:***{}", parts[0], host_part)
            } else {
                connection_string.clone()
            }
        } else {
            "***".to_string()
        }
    } else {
        "***".to_string()
    };
    println!(
        "[Rust get_tables] Attempting connection to: {}",
        masked_conn_str
    );

    let (client, connection) = tokio_postgres::connect(&connection_string, NoTls)
        .await
        .map_err(|e| {
            eprintln!("[Rust get_tables] Connection failed: {}", e);
            e.to_string()
        })?;

    println!("[Rust get_tables] Connection established successfully");

    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("[Rust get_tables] Connection error: {}", e);
        }
    });

    // First, let's see what's actually in the database
    println!("[Rust get_tables] Running diagnostic query to see all tables...");
    let diagnostic_rows = client
        .query(
            "SELECT table_schema, table_name, table_type 
             FROM information_schema.tables 
             ORDER BY table_schema, table_name;",
            &[],
        )
        .await
        .map_err(|e| {
            eprintln!("[Rust get_tables] Diagnostic query failed: {}", e);
            e.to_string()
        })?;

    println!(
        "[Rust get_tables] Diagnostic: Found {} total tables/views:",
        diagnostic_rows.len()
    );
    for row in diagnostic_rows.iter() {
        let schema: String = row.get("table_schema");
        let name: String = row.get("table_name");
        let ttype: String = row.get("table_type");
        println!("[Rust get_tables]   - {}.{} ({})", schema, name, ttype);
    }

    println!("[Rust get_tables] Executing main query to fetch user tables...");
    let rows = client
        .query(
            "SELECT table_name FROM information_schema.tables 
             WHERE table_schema = 'public'
             AND table_type = 'BASE TABLE'
             ORDER BY table_name;",
            &[],
        )
        .await
        .map_err(|e| {
            eprintln!("[Rust get_tables] Query failed: {}", e);
            e.to_string()
        })?;

    println!(
        "[Rust get_tables] Query executed, found {} rows",
        rows.len()
    );

    let tables: Vec<String> = rows.iter().map(|row| row.get("table_name")).collect();

    println!(
        "[Rust get_tables] Mapped to {} tables: {:?}",
        tables.len(),
        tables
    );

    Ok(tables)
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct ColumnInfo {
    name: String,
    data_type: String,
    is_nullable: bool,
    column_default: Option<String>,
    is_auto_generated: bool,
    is_generated: bool, // New: GENERATED ALWAYS AS ... STORED
    is_identity: bool,  // New: GENERATED ALWAYS AS IDENTITY
    is_primary_key: bool,
    is_foreign_key: bool,
    foreign_key_table: Option<String>,
    foreign_key_column: Option<String>,
}

#[tauri::command]
async fn get_columns(
    connection_string: String,
    table_name: String,
) -> Result<Vec<ColumnInfo>, String> {
    println!(
        "[Rust get_columns] Fetching columns for table: {}",
        table_name
    );

    let (client, connection) = tokio_postgres::connect(&connection_string, NoTls)
        .await
        .map_err(|e| {
            eprintln!("[Rust get_columns] Connection failed: {}", e);
            e.to_string()
        })?;

    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("[Rust get_columns] Connection error: {}", e);
        }
    });

    // Query to get comprehensive column information including foreign keys
    let query = r#"
        SELECT 
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.column_default,
            CASE 
                WHEN c.column_default LIKE 'nextval%' THEN true
                WHEN c.column_default LIKE '%auto_increment%' THEN true
                ELSE false
            END as is_auto_generated,
            CASE
                WHEN c.is_generated = 'ALWAYS' THEN true
                ELSE false
            END as is_generated,
            CASE
                WHEN c.is_identity = 'YES' THEN true
                ELSE false
            END as is_identity,
            CASE 
                WHEN pk.column_name IS NOT NULL THEN true
                ELSE false
            END as is_primary_key,
            CASE 
                WHEN fk.column_name IS NOT NULL THEN true
                ELSE false
            END as is_foreign_key,
            fk.foreign_table_name,
            fk.foreign_column_name
        FROM information_schema.columns c
        LEFT JOIN (
            SELECT ku.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku
                ON tc.constraint_name = ku.constraint_name
                AND tc.table_schema = ku.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_name = $1
                AND tc.table_schema = 'public'
        ) pk ON c.column_name = pk.column_name
        LEFT JOIN (
            SELECT
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = $1
                AND tc.table_schema = 'public'
        ) fk ON c.column_name = fk.column_name
        WHERE c.table_name = $1
            AND c.table_schema = 'public'
        ORDER BY c.ordinal_position;
    "#;

    let rows = client.query(query, &[&table_name]).await.map_err(|e| {
        eprintln!("[Rust get_columns] Query failed: {}", e);
        e.to_string()
    })?;

    let columns: Vec<ColumnInfo> = rows
        .iter()
        .map(|row| ColumnInfo {
            name: row.get("column_name"),
            data_type: row.get("data_type"),
            is_nullable: row.get::<_, String>("is_nullable") == "YES",
            column_default: row.get("column_default"),
            is_auto_generated: row.get("is_auto_generated"),
            is_generated: row.get("is_generated"),
            is_identity: row.get("is_identity"),
            is_primary_key: row.get("is_primary_key"),
            is_foreign_key: row.get("is_foreign_key"),
            foreign_key_table: row.get("foreign_table_name"),
            foreign_key_column: row.get("foreign_column_name"),
        })
        .collect();

    println!(
        "[Rust get_columns] Found {} columns for table '{}'",
        columns.len(),
        table_name
    );

    Ok(columns)
}

#[tauri::command]
async fn execute_query(
    connection_string: String,
    query: String,
) -> Result<Vec<serde_json::Value>, String> {
    println!("[Rust execute_query] Executing query");

    let (client, connection) = tokio_postgres::connect(&connection_string, NoTls)
        .await
        .map_err(|e| {
            eprintln!("[Rust execute_query] Connection failed: {}", e);
            e.to_string()
        })?;

    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("[Rust execute_query] Connection error: {}", e);
        }
    });

    let rows = client.query(&query, &[]).await.map_err(|e| {
        eprintln!("[Rust execute_query] Query failed: {}", e);
        e.to_string()
    })?;

    // Convert rows to JSON
    let mut results = Vec::new();
    for row in rows.iter() {
        let mut obj = serde_json::Map::new();
        for (idx, column) in row.columns().iter().enumerate() {
            let name = column.name();
            let value: serde_json::Value = match column.type_().name() {
                "int4" | "int8" | "int2" => row
                    .try_get::<_, i64>(idx)
                    .map(|v| serde_json::Value::Number(v.into()))
                    .unwrap_or(serde_json::Value::Null),
                "text" | "varchar" | "bpchar" => row
                    .try_get::<_, String>(idx)
                    .map(serde_json::Value::String)
                    .unwrap_or(serde_json::Value::Null),
                "bool" => row
                    .try_get::<_, bool>(idx)
                    .map(serde_json::Value::Bool)
                    .unwrap_or(serde_json::Value::Null),
                _ => {
                    // Try to get as string for other types
                    row.try_get::<_, String>(idx)
                        .map(serde_json::Value::String)
                        .unwrap_or(serde_json::Value::Null)
                }
            };
            obj.insert(name.to_string(), value);
        }
        results.push(serde_json::Value::Object(obj));
    }

    println!("[Rust execute_query] Returned {} rows", results.len());
    Ok(results)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            test_connection,
            execute_sql,
            get_tables,
            get_columns,
            execute_query
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
