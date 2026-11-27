#!/usr/bin/env bash
set -euo pipefail

# Requiere MariaDB 10.6 de pruebas y permisos CREATE/DROP DATABASE.
# MARIADB_PWD=... bash db/migration/test/run_production.sh
# Si production_test existe, CREATE falla sin modificarla ni borrarla.
script_dir=$(cd -- "$(dirname -- "$0")" && pwd)
migration_dir="$script_dir/.."
database=production_test
database_created=0
v001_failed_assertion=0

fail() {
    printf 'PRODUCTION ERROR: %s\n' "$*" >&2
    exit 1
}

: "${MARIADB_PWD:?MARIADB_PWD es obligatoria y no puede estar vacia}"
command -v mariadb >/dev/null 2>&1 || fail 'No se encuentra el cliente mariadb.'
export MYSQL_PWD="$MARIADB_PWD"
client=(mariadb --no-defaults --protocol=TCP
    --host="${MARIADB_HOST:-127.0.0.1}"
    --port="${MARIADB_PORT:-3306}"
    --user="${MARIADB_USER:-root}"
    --connect-timeout=10 --default-character-set=utf8mb4
    --batch --skip-column-names --raw)
# --no-defaults evita heredar --force y continuar tras errores SQL.

cleanup() {
    local status=$?
    trap - EXIT
    if [[ "$database_created" == 1 ]]; then
        if ! "${client[@]}" --execute="DROP DATABASE \`$database\`;"; then
            printf 'PRODUCTION ERROR: no se pudo borrar %s.\n' "$database" >&2
            status=1
        fi
    fi
    if [[ "$status" == 0 ]]; then
        printf 'PRODUCTION OK\n'
    fi
    exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

sql() {
    "${client[@]}" --database="$database" "$@"
}

assert_equal() {
    local actual=$1 expected=$2 context=$3
    if [[ "$actual" != "$expected" ]]; then
        printf 'PRODUCTION ERROR: %s\nEsperado:\n%s\nObtenido:\n%s\n' \
            "$context" "$expected" "$actual" >&2
        exit 1
    fi
}

assert_sql() {
    local context=$1 expected=$2 query=$3 actual
    actual=$(sql --execute="$query") || fail "$context: fallo la consulta."
    assert_equal "$actual" "$expected" "$context"
}

expect_error() {
    local code=$1 context=$2 output
    shift 2
    if output=$("$@" 2>&1); then
        fail "$context: el comando termino bien; se esperaba ERROR $code."
    fi
    # Exigir exactamente un error y el codigo solicitado.
    if [[ $(printf '%s\n' "$output" | grep -c '^ERROR ' || true) != 1 ]] ||
       ! printf '%s\n' "$output" | grep -Eq "^ERROR $code \\("; then
        printf '%s\n' "$output" >&2
        fail "$context: fallo por una causa distinta a ERROR $code."
    fi
}

schema_snapshot() {
    local tables table
    tables=$(sql --execute="SELECT TABLE_NAME FROM information_schema.tables
        WHERE TABLE_SCHEMA = '$database' AND TABLE_NAME <> 'schema_migration'
        ORDER BY TABLE_NAME;") || return 1
    while IFS= read -r table; do
        sql --execute="SHOW CREATE TABLE \`$table\`;" || return 1
    done <<< "$tables" |
        # El contador cambia al insertar incluso si el INSERT se rechaza.
        sed -E 's/ AUTO_INCREMENT=[0-9]+//g'
}

unique_snapshot() {
    sql --execute="SELECT TABLE_NAME, INDEX_NAME,
        GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)
        FROM information_schema.statistics
        WHERE TABLE_SCHEMA = '$database' AND NON_UNIQUE = 0
          AND INDEX_NAME <> 'PRIMARY' AND TABLE_NAME <> 'schema_migration'
        GROUP BY TABLE_NAME, INDEX_NAME ORDER BY TABLE_NAME, INDEX_NAME;"
}

migration_versions() {
    local exists
    exists=$(sql --execute="SELECT COUNT(*) FROM information_schema.tables
        WHERE TABLE_SCHEMA = '$database' AND TABLE_NAME = 'schema_migration';") || return 1
    if [[ "$exists" == 1 ]]; then
        sql --execute='SELECT version FROM schema_migration ORDER BY version;'
    fi
}

# (a) Cargar el snapshot intacto y comprobar el fallo de V001.
"${client[@]}" --execute="CREATE DATABASE \`$database\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
database_created=1
sql < "$script_dir/production_schema.sql"
initial_schema=$(schema_snapshot)
initial_unique=$(unique_snapshot)
expect_error 1060 '(a) V001 sobre produccion' sql < "$migration_dir/V001__align_schema_with_code.sql"
after_v001=$(schema_snapshot)
assert_equal "$after_v001" "$initial_schema" '(a) V001 no cambia definiciones existentes'
v001_versions=$(migration_versions)
if printf '%s\n' "$v001_versions" | grep -Fxq 'V001'; then
    printf 'PRODUCTION ERROR: (a) V001 dejo una marca; se esperaban 0.\n' >&2
    v001_failed_assertion=1
    # Aislar (b)-(e) sin ocultar la regresion: el script terminara con error.
    # Solo se elimina la marca en nuestra BD recien creada, nunca en otra BD.
    sql --execute="DELETE FROM schema_migration WHERE version = 'V001';"
fi
versions=$(migration_versions)
assert_equal "$versions" '' '(a) control ausente o vacio para las pruebas independientes de V002'

# (b) Informe vacio y V002 sin V001: exactamente cuatro claves nuevas.
duplicate_report=$(sql < "$migration_dir/V002__find_duplicates.sql")
assert_equal "$duplicate_report" '' '(b) no hay duplicados'
after_report=$(schema_snapshot)
assert_equal "$after_report" "$initial_schema" '(b) informe sin cambios de definiciones'
versions=$(migration_versions)
assert_equal "$versions" '' '(b) el informe no registra migraciones'
sql < "$migration_dir/V002__unique_keys.sql"
new_keys=$'account\taccount_email_un\temail\nfantasy_election\tfantasy_election_account_race_un\taccount_id,race_id\nresult\tresult_race_driver_un\trace_id,driver_id\nsprint\tsprint_race_driver_un\trace_id,driver_id'
expected_unique=$(printf '%s\n%s\n' "$initial_unique" "$new_keys" | LC_ALL=C sort)
actual_unique=$(unique_snapshot)
assert_equal "$actual_unique" "$expected_unique" '(b) solo las cuatro claves unicas previstas'
assert_sql '(b) solo V002 registrada' 'V002' \
    'SELECT version FROM schema_migration ORDER BY version;'

# (c) Semillas minimas: las relaciones opcionales se dejan a NULL.
sql --execute="
    INSERT INTO driver (id, name, number) VALUES (1, 'Test driver', 1);
    INSERT INTO race (id, name, date_start, flag_image, circuit_image, finished)
        VALUES (1, 'Test race', '2026-01-01 12:00:00', '', '', 0);
    INSERT INTO account (id, username, password, admin, email)
        VALUES (1, 'test_owner', 'fixture-password', 0, 'owner@example.test');
    INSERT INTO result (race_id, driver_id, fastlap, pole) VALUES (1, 1, 0, 0);
    INSERT INTO sprint (race_id, driver_id) VALUES (1, 1);
    INSERT INTO fantasy_election (account_id, race_id) VALUES (1, 1);"
expect_error 1062 '(c) result duplicado' sql \
    --execute='INSERT INTO result (race_id, driver_id, fastlap, pole) VALUES (1, 1, 1, 1);'
expect_error 1062 '(c) sprint duplicado' sql \
    --execute='INSERT INTO sprint (race_id, driver_id) VALUES (1, 1);'
expect_error 1062 '(c) fantasy_election duplicada' sql \
    --execute='INSERT INTO fantasy_election (account_id, race_id) VALUES (1, 1);'
# Username diferente e id generado: solo email puede causar el duplicado.
expect_error 1062 '(c) email duplicado ignorando mayusculas' sql \
    --execute="INSERT INTO account (username, password, admin, email)
        VALUES ('test_duplicate', 'fixture-password', 0, 'OWNER@example.test');"
counts_query='SELECT (SELECT COUNT(*) FROM result), (SELECT COUNT(*) FROM sprint),
    (SELECT COUNT(*) FROM fantasy_election), (SELECT COUNT(*) FROM account);'
assert_sql '(c) ninguna fila duplicada insertada' $'1\t1\t1\t1' "$counts_query"

# (d) V003 sobre V002 y el esquema con FK: preflight, cinco claves y rollback.
sql --execute="
    INSERT INTO season (id, name, number, year) VALUES (1, 'Test season', 1, '2026');
    INSERT INTO team (id, name, season_id) VALUES (1, 'Test team', 1);
    UPDATE driver SET season_id = 1, team_id = 1 WHERE id = 1;
    UPDATE race SET season_id = 1 WHERE id = 1;
    INSERT INTO fantasy_points_driver (id, race_id, driver_id, points) VALUES (1, 1, 1, 10);
    INSERT INTO fantasy_points_team (id, race_id, team_id, points) VALUES (1, 1, 1, 10);
    INSERT INTO fantasy_price_driver (id, race_id, driver_id, price) VALUES (1, 1, 1, 1000000);
    INSERT INTO fantasy_price_team (id, race_id, team_id, price) VALUES (1, 1, 1, 1000000);"
v002_schema=$(schema_snapshot)
v002_unique=$(unique_snapshot)
duplicate_report=$(sql < "$migration_dir/V003__find_duplicates.sql")
assert_equal "$duplicate_report" '' '(d) informe V003 vacio'
after_report=$(schema_snapshot)
assert_equal "$after_report" "$v002_schema" '(d) informe V003 sin cambios de definiciones'
assert_sql '(d) informe V003 no registra migraciones' 'V002' \
    'SELECT version FROM schema_migration ORDER BY version;'

duplicate_tables=(fantasy_points_driver fantasy_points_team fantasy_price_driver fantasy_price_team race)
duplicate_queries=(
    'INSERT INTO fantasy_points_driver (id, race_id, driver_id, points) VALUES (2, 1, 1, 20);'
    'INSERT INTO fantasy_points_team (id, race_id, team_id, points) VALUES (2, 1, 1, 20);'
    'INSERT INTO fantasy_price_driver (id, race_id, driver_id, price) VALUES (2, 1, 1, 2000000);'
    'INSERT INTO fantasy_price_team (id, race_id, team_id, price) VALUES (2, 1, 1, 2000000);'
    "INSERT INTO race (id, season_id, name, date_start, flag_image, circuit_image, finished)
        VALUES (2, 1, 'Test race', '2026-01-08 12:00:00', '', '', 0);"
)
for i in "${!duplicate_tables[@]}"; do
    table=${duplicate_tables[$i]}
    sql --execute="${duplicate_queries[$i]}"
    duplicate_report=$(sql < "$migration_dir/V003__find_duplicates.sql")
    [[ -n "$duplicate_report" ]] || fail "(d) informe V003 no detecta duplicado en $table."
    expect_error 1062 "(d) V003 rechaza duplicados en $table antes del DDL" sql \
        < "$migration_dir/V003__unique_keys.sql"
    after_rejected=$(schema_snapshot)
    assert_equal "$after_rejected" "$v002_schema" "(d) duplicado en $table no deja DDL parcial"
    assert_sql '(d) duplicados no dejan marca V003' 'V002' \
        'SELECT version FROM schema_migration ORDER BY version;'
    assert_sql "(d) V003 no borra duplicados en $table" '2' "SELECT COUNT(*) FROM \`$table\`;"
    sql --execute="DELETE FROM \`$table\` WHERE id = 2;"
done

sql < "$migration_dir/V003__unique_keys.sql"
v003_keys=$'fantasy_points_driver\tfantasy_points_driver_race_driver_un\trace_id,driver_id\nfantasy_points_team\tfantasy_points_team_race_team_un\trace_id,team_id\nfantasy_price_driver\tfantasy_price_driver_race_driver_un\trace_id,driver_id\nfantasy_price_team\tfantasy_price_team_race_team_un\trace_id,team_id\nrace\trace_season_name_un\tseason_id,name'
expected_unique=$(printf '%s\n%s\n' "$v002_unique" "$v003_keys" | LC_ALL=C sort)
actual_unique=$(unique_snapshot)
assert_equal "$actual_unique" "$expected_unique" '(d) exactamente las cinco claves V003 adicionales'
assert_sql '(d) V002 y V003 registradas' $'V002\nV003' \
    'SELECT version FROM schema_migration ORDER BY version;'
for i in "${!duplicate_tables[@]}"; do
    expect_error 1062 "(d) clave V003 rechaza duplicado en ${duplicate_tables[$i]}" sql \
        --execute="${duplicate_queries[$i]}"
done
v003_counts_query='SELECT (SELECT COUNT(*) FROM fantasy_points_driver),
    (SELECT COUNT(*) FROM fantasy_points_team), (SELECT COUNT(*) FROM fantasy_price_driver),
    (SELECT COUNT(*) FROM fantasy_price_team), (SELECT COUNT(*) FROM race);'
assert_sql '(d) ninguna fila V003 duplicada insertada' $'1\t1\t1\t1\t1' "$v003_counts_query"
v003_schema=$(schema_snapshot)
expect_error 1062 '(d) reejecutar V003 falla' sql < "$migration_dir/V003__unique_keys.sql"
after_rerun=$(schema_snapshot)
assert_equal "$after_rerun" "$v003_schema" '(d) reejecutar V003 no cambia definiciones'
assert_sql '(d) reejecutar V003 no cambia versiones' $'V002\nV003' \
    'SELECT version FROM schema_migration ORDER BY version;'

sql < "$migration_dir/V003__rollback.sql"
after_v003_rollback=$(schema_snapshot)
assert_equal "$after_v003_rollback" "$v002_schema" '(d) rollback V003 restaura tablas, indices y FK con V002'
assert_sql '(d) rollback V003 conserva V002' 'V002' \
    'SELECT version FROM schema_migration ORDER BY version;'
assert_sql '(d) rollback V003 conserva las semillas' $'1\t1\t1\t1\t1' "$v003_counts_query"
# Las mismas inserciones ahora deben funcionar: el rollback ha retirado las claves.
for i in "${!duplicate_tables[@]}"; do
    sql --execute="${duplicate_queries[$i]}"
    sql --execute="DELETE FROM \`${duplicate_tables[$i]}\` WHERE id = 2;"
done

# (e) Comparar TODAS las tablas originales, incluidos indices y claves foraneas.
sql < "$migration_dir/V002__rollback.sql"
after_rollback=$(schema_snapshot)
assert_equal "$after_rollback" "$initial_schema" '(e) rollback restaura las definiciones originales'
assert_sql '(e) control vacio tras rollback' '' \
    'SELECT version FROM schema_migration ORDER BY version;'
assert_sql '(e) rollback conserva las semillas' $'1\t1\t1\t1' "$counts_query"
printf 'PRODUCTION: comprobaciones (b)-(e), incluidas V002 y V003, OK\n'
[[ "$v001_failed_assertion" == 0 ]] || fail '(a) V001 deja una marca falsa; ver fallo anterior.'
# trap EXIT elimina exclusivamente production_test antes de anunciar exito.
