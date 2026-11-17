#!/usr/bin/env bash
set -euo pipefail

# Requiere un MariaDB 10.6 de pruebas y permisos CREATE/DROP DATABASE.
# Se ejecuta con: MARIADB_PWD=... bash db/migration/test/run_v002.sh
# Si v002_test ya existe, falla sin borrarla ni modificarla.
script_dir=$(cd -- "$(dirname -- "$0")" && pwd)
migration_dir="$script_dir/.."
database=v002_test
database_created=0

fail() {
    printf 'V002 ERROR: %s\n' "$*" >&2
    exit 1
}

: "${MARIADB_PWD:?MARIADB_PWD es obligatoria y no puede estar vacia}"
command -v mariadb >/dev/null 2>&1 || fail 'No se encuentra el cliente mariadb.'
# El cliente lee MYSQL_PWD; la clave no aparece en argumentos ni en la salida.
export MYSQL_PWD="$MARIADB_PWD"
client=(mariadb --no-defaults --protocol=TCP
    --host="${MARIADB_HOST:-127.0.0.1}"
    --port="${MARIADB_PORT:-3306}"
    --user="${MARIADB_USER:-root}"
    --connect-timeout=10 --default-character-set=utf8mb4
    --batch --skip-column-names --raw)
# --no-defaults impide heredar --force de un fichero de opciones.

cleanup() {
    local status=$?
    trap - EXIT
    if [[ "$database_created" == 1 ]]; then
        if ! "${client[@]}" --execute="DROP DATABASE \`$database\`;"; then
            printf 'V002 ERROR: no se pudo borrar la BD temporal %s.\n' "$database" >&2
            status=1
        fi
    fi
    # Solo anunciar exito una vez borrada la base temporal.
    if [[ "$status" == 0 ]]; then
        printf 'V002 OK\n'
    fi
    exit "$status"
}
trap cleanup EXIT

sql() {
    "${client[@]}" --database="$database" "$@"
}

assert_equal() {
    local actual=$1 expected=$2 context=$3
    if [[ "$actual" != "$expected" ]]; then
        printf 'V002 ERROR: %s\nEsperado:\n%s\nObtenido:\n%s\n' \
            "$context" "$expected" "$actual" >&2
        exit 1
    fi
}

assert_sql() {
    local context=$1 expected=$2 query=$3 actual
    actual=$(sql --execute="$query") || fail "$context: fallo la consulta de comprobacion."
    assert_equal "$actual" "$expected" "$context"
}

expect_duplicate_error() {
    local context=$1 output
    shift
    if output=$("$@" 2>&1); then
        fail "$context: el comando termino bien; se esperaba ERROR 1062."
    fi
    # No aceptar errores de conexion, sintaxis, permisos u otros como prueba.
    if [[ "$output" != *'ERROR 1062 ('* ]]; then
        printf '%s\n' "$output" >&2
        fail "$context: fallo por una causa distinta a una clave duplicada (1062)."
    fi
}

data_snapshot() {
    sql --execute="
        SELECT 'account', id, username, password, admin, email FROM account ORDER BY id;
        SELECT 'result', id, race_id, driver_id, position_id, fastlap, pole FROM result ORDER BY id;
        SELECT 'sprint', id, race_id, driver_id, position_id FROM sprint ORDER BY id;
        SELECT 'fantasy_election', id, account_id, race_id FROM fantasy_election ORDER BY id;"
}

other_data_snapshot() {
    sql --execute="
        SELECT 'account', id, username, password, admin, email FROM account ORDER BY id;
        SELECT 'sprint', id, race_id, driver_id, position_id FROM sprint ORDER BY id;
        SELECT 'fantasy_election', id, account_id, race_id FROM fantasy_election ORDER BY id;"
}

schema_snapshot() {
    sql --execute="
        SHOW CREATE TABLE account;
        SHOW CREATE TABLE result;
        SHOW CREATE TABLE sprint;
        SHOW CREATE TABLE fantasy_election;
        SHOW CREATE TABLE schema_migration;
        SELECT version, applied_at FROM schema_migration ORDER BY version;"
}

key_query="SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE,
                   GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)
           FROM information_schema.statistics
           WHERE TABLE_SCHEMA = '$database'
             AND INDEX_NAME IN ('result_race_driver_un', 'sprint_race_driver_un',
                                'fantasy_election_account_race_un', 'account_email_un')
           GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
           ORDER BY TABLE_NAME, INDEX_NAME;"
expected_keys=$'account\taccount_email_un\t0\temail\nfantasy_election\tfantasy_election_account_race_un\t0\taccount_id,race_id\nresult\tresult_race_driver_un\t0\trace_id,driver_id\nsprint\tsprint_race_driver_un\t0\trace_id,driver_id'
result_query='SELECT id, race_id, driver_id, position_id, fastlap, pole FROM result ORDER BY id;'
expected_initial=$'101\t1\t11\tNULL\t0\t0\n102\t1\t11\tNULL\t0\t0\n201\t2\t22\t1\t0\t1\n202\t2\t22\t4\t0\t1\n301\t1\t22\t2\t1\t0\n302\t2\t11\tNULL\t0\t0'
expected_deduped=$'101\t1\t11\tNULL\t0\t0\n201\t2\t22\t1\t0\t1\n202\t2\t22\t4\t0\t1\n301\t1\t22\t2\t1\t0\n302\t2\t11\tNULL\t0\t0'
expected_resolved=$'101\t1\t11\tNULL\t0\t0\n201\t2\t22\t1\t0\t1\n301\t1\t22\t2\t1\t0\n302\t2\t11\tNULL\t0\t0'

# (a) Crear exclusivamente nuestra BD temporal y cargar el estado previo.
"${client[@]}" --execute="CREATE DATABASE \`$database\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
database_created=1
sql < "$script_dir/v002_before.sql"
assert_sql '(a) contenido inicial de result' "$expected_initial" "$result_query"
assert_sql '(a) claves V002 ausentes' '' "$key_query"
assert_sql '(a) solo V001 registrada' 'V001' 'SELECT version FROM schema_migration ORDER BY version;'
initial_data=$(data_snapshot)
other_data=$(other_data_snapshot)
initial_schema=$(schema_snapshot)

# (b) El informe completo debe contener solo los dos grupos de result.
# Normalizar el orden: los SELECT del informe no incluyen ORDER BY de grupos.
duplicate_report=$(sql < "$migration_dir/V002__find_duplicates.sql")
duplicate_report=$(printf '%s\n' "$duplicate_report" | LC_ALL=C sort)
assert_equal "$duplicate_report" $'1\t11\t2\t101,102\n2\t22\t2\t201,202' \
    '(b) exactamente dos grupos en result y ninguno en las otras tablas'
after_report=$(data_snapshot)
assert_equal "$after_report" "$initial_data" '(b) el informe no modifica datos'
after_report_schema=$(schema_snapshot)
assert_equal "$after_report_schema" "$initial_schema" '(b) el informe no modifica esquema ni control'

# (c) Sin --force: el primer ALTER falla y no se crea ninguna de las cuatro claves.
expect_duplicate_error '(c) V002 con duplicados' sql < "$migration_dir/V002__unique_keys.sql"
assert_sql '(c) ninguna clave creada tras el fallo' '' "$key_query"
assert_sql '(c) V002 queda registrada antes del ALTER fallido' '1' \
    "SELECT COUNT(*) FROM schema_migration WHERE version = 'V002';"
after_failure=$(data_snapshot)
assert_equal "$after_failure" "$initial_data" '(c) el intento fallido conserva los datos'

# (d) Recuperacion indicada en la cabecera; la limpieza solo puede borrar 102.
sql --execute="DELETE FROM schema_migration WHERE version = 'V002';"
sql < "$migration_dir/V002__dedupe_results.sql" > /dev/null
assert_sql '(d) conserva 101, 201 y 202; solo elimina 102' "$expected_deduped" "$result_query"
after_dedupe_others=$(other_data_snapshot)
assert_equal "$after_dedupe_others" "$other_data" '(d) limpieza sin cambios en las otras tablas'
assert_sql '(d) la limpieza no registra V002' 'V001' \
    'SELECT version FROM schema_migration ORDER BY version;'
assert_sql '(d) la limpieza no crea claves' '' "$key_query"

# (e) Decision humana simulada: conservar la posicion 1 (id 201).
sql --execute='DELETE FROM result WHERE id = 202;'
assert_sql '(e) conflicto resuelto conservando 201' "$expected_resolved" "$result_query"
resolved_data=$(data_snapshot)

# (f) Migracion completa: comprobar nombres, tablas, columnas, orden y unicidad.
sql < "$migration_dir/V002__unique_keys.sql"
assert_sql '(f) las cuatro claves unicas correctas' "$expected_keys" "$key_query"
assert_sql '(f) V001 y V002 registradas' $'V001\nV002' \
    'SELECT version FROM schema_migration ORDER BY version;'
after_migration=$(data_snapshot)
assert_equal "$after_migration" "$resolved_data" '(f) la migracion conserva los datos'

# (g) Rechazar duplicados reales, incluido email con distinto uso de mayusculas.
# Username e id nuevos evitan que la prueba falle por otra clave de account.
expect_duplicate_error '(g) result duplicado' sql \
    --execute='INSERT INTO result (race_id, driver_id, position_id, fastlap, pole) VALUES (1, 11, 3, 1, 1);'
expect_duplicate_error '(g) email duplicado ignorando mayusculas' sql \
    --execute="INSERT INTO account (username, password, admin, email) VALUES ('alice_duplicate', 'fixture-password', 0, 'aLICE@EXAMPLE.TEST');"
after_rejected_inserts=$(data_snapshot)
assert_equal "$after_rejected_inserts" "$resolved_data" '(g) los INSERT rechazados no anaden filas'

# (h) Repeticion rechazada por schema_migration antes de ejecutar ningun ALTER.
before_repeat_schema=$(schema_snapshot)
expect_duplicate_error '(h) V002 ya registrada' sql < "$migration_dir/V002__unique_keys.sql"
after_repeat_schema=$(schema_snapshot)
assert_equal "$after_repeat_schema" "$before_repeat_schema" '(h) esquema, claves y control intactos'
after_repeat_data=$(data_snapshot)
assert_equal "$after_repeat_data" "$resolved_data" '(h) datos intactos'

# (i) Rollback: retirar solo las claves y la marca V002, conservando los datos.
sql < "$migration_dir/V002__rollback.sql"
assert_sql '(i) ninguna clave V002 tras rollback' '' "$key_query"
assert_sql '(i) desaparece V002 y se conserva V001' 'V001' \
    'SELECT version FROM schema_migration ORDER BY version;'
after_rollback=$(data_snapshot)
assert_equal "$after_rollback" "$resolved_data" '(i) rollback sin cambios en los datos'
# trap EXIT borra v002_test y, si todo ha terminado bien, imprime V002 OK.
