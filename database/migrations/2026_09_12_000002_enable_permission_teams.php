<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $teamKey = $columnNames['team_foreign_key'] ?? 'team_id';
        $pivotRole = $columnNames['role_pivot_key'] ?? 'role_id';
        $pivotPermission = $columnNames['permission_pivot_key'] ?? 'permission_id';
        $morphKey = $columnNames['model_morph_key'] ?? 'model_id';

        // Fresh installs with permission.teams=true already create team columns in
        // create_permission_tables. If that migration was marked ran without tables
        // (or schema was wiped), rebuild the base Spatie tables first.
        if (! Schema::hasTable($tableNames['roles'])
            || ! Schema::hasTable($tableNames['permissions'])
            || ! Schema::hasTable($tableNames['model_has_roles'])
            || ! Schema::hasTable($tableNames['model_has_permissions'])
            || ! Schema::hasTable($tableNames['role_has_permissions'])) {
            $this->createPermissionTablesWithTeams($tableNames, $teamKey, $pivotRole, $pivotPermission, $morphKey);
            $this->migrateRoleRowsToTenants($teamKey, $pivotRole, $morphKey);

            return;
        }

        if (! Schema::hasColumn($tableNames['roles'], $teamKey)) {
            Schema::table($tableNames['roles'], function (Blueprint $table) use ($teamKey) {
                $table->unsignedBigInteger($teamKey)->nullable();
                $table->index($teamKey, 'roles_team_foreign_key_index');
            });
        }

        $this->dropIndexQuietly($tableNames['roles'], $tableNames['roles'].'_name_guard_name_unique');

        try {
            Schema::table($tableNames['roles'], function (Blueprint $table) use ($teamKey) {
                $table->unique([$teamKey, 'name', 'guard_name']);
            });
        } catch (Throwable) {
            // Unique already exists.
        }

        if (! Schema::hasColumn($tableNames['model_has_roles'], $teamKey)) {
            Schema::table($tableNames['model_has_roles'], function (Blueprint $table) use ($teamKey) {
                $table->unsignedBigInteger($teamKey)->default(0);
                $table->index($teamKey, 'model_has_roles_team_foreign_key_index');
            });
        }

        $this->recreatePrimary(
            $tableNames['model_has_roles'],
            'model_has_roles_role_model_type_primary',
            [$teamKey, $pivotRole, $morphKey, 'model_type']
        );

        if (! Schema::hasColumn($tableNames['model_has_permissions'], $teamKey)) {
            Schema::table($tableNames['model_has_permissions'], function (Blueprint $table) use ($teamKey) {
                $table->unsignedBigInteger($teamKey)->default(0);
                $table->index($teamKey, 'model_has_permissions_team_foreign_key_index');
            });
        }

        $this->recreatePrimary(
            $tableNames['model_has_permissions'],
            'model_has_permissions_permission_model_type_primary',
            [$teamKey, $pivotPermission, $morphKey, 'model_type']
        );

        $this->migrateRoleRowsToTenants($teamKey, $pivotRole, $morphKey);
    }

    public function down(): void
    {
        // Data reshape is not safely reversible.
    }

    /**
     * @param  array<string, string>  $tableNames
     */
    private function createPermissionTablesWithTeams(
        array $tableNames,
        string $teamKey,
        string $pivotRole,
        string $pivotPermission,
        string $morphKey,
    ): void {
        foreach ([
            $tableNames['role_has_permissions'],
            $tableNames['model_has_roles'],
            $tableNames['model_has_permissions'],
            $tableNames['roles'],
            $tableNames['permissions'],
        ] as $table) {
            Schema::dropIfExists($table);
        }

        Schema::create($tableNames['permissions'], static function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name');
            $table->string('guard_name');
            $table->timestamps();
            $table->unique(['name', 'guard_name']);
        });

        Schema::create($tableNames['roles'], static function (Blueprint $table) use ($teamKey) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger($teamKey)->nullable();
            $table->index($teamKey, 'roles_team_foreign_key_index');
            $table->string('name');
            $table->string('guard_name');
            $table->timestamps();
            $table->unique([$teamKey, 'name', 'guard_name']);
        });

        Schema::create($tableNames['model_has_permissions'], static function (Blueprint $table) use ($tableNames, $pivotPermission, $teamKey, $morphKey) {
            $table->unsignedBigInteger($pivotPermission);
            $table->string('model_type');
            $table->unsignedBigInteger($morphKey);
            $table->index([$morphKey, 'model_type'], 'model_has_permissions_model_id_model_type_index');
            $table->foreign($pivotPermission)
                ->references('id')
                ->on($tableNames['permissions'])
                ->onDelete('cascade');
            $table->unsignedBigInteger($teamKey);
            $table->index($teamKey, 'model_has_permissions_team_foreign_key_index');
            $table->primary(
                [$teamKey, $pivotPermission, $morphKey, 'model_type'],
                'model_has_permissions_permission_model_type_primary'
            );
        });

        Schema::create($tableNames['model_has_roles'], static function (Blueprint $table) use ($tableNames, $pivotRole, $teamKey, $morphKey) {
            $table->unsignedBigInteger($pivotRole);
            $table->string('model_type');
            $table->unsignedBigInteger($morphKey);
            $table->index([$morphKey, 'model_type'], 'model_has_roles_model_id_model_type_index');
            $table->foreign($pivotRole)
                ->references('id')
                ->on($tableNames['roles'])
                ->onDelete('cascade');
            $table->unsignedBigInteger($teamKey);
            $table->index($teamKey, 'model_has_roles_team_foreign_key_index');
            $table->primary(
                [$teamKey, $pivotRole, $morphKey, 'model_type'],
                'model_has_roles_role_model_type_primary'
            );
        });

        Schema::create($tableNames['role_has_permissions'], static function (Blueprint $table) use ($tableNames, $pivotRole, $pivotPermission) {
            $table->unsignedBigInteger($pivotPermission);
            $table->unsignedBigInteger($pivotRole);
            $table->foreign($pivotPermission)
                ->references('id')
                ->on($tableNames['permissions'])
                ->onDelete('cascade');
            $table->foreign($pivotRole)
                ->references('id')
                ->on($tableNames['roles'])
                ->onDelete('cascade');
            $table->primary([$pivotPermission, $pivotRole], 'role_has_permissions_permission_id_role_id_primary');
        });
    }

    private function migrateRoleRowsToTenants(string $teamKey, string $pivotRole, string $morphKey): void
    {
        $tenants = DB::table('tenants')->pluck('id');
        if ($tenants->isEmpty()) {
            return;
        }

        $globalRoles = DB::table('roles')->whereNull($teamKey)->get();
        if ($globalRoles->isEmpty()) {
            $this->backfillPivotTeamIds($teamKey, $morphKey);

            return;
        }

        $rolePermissionRows = DB::table('role_has_permissions')->get()->groupBy('role_id');
        $oldToNewByTenant = [];

        foreach ($tenants as $tenantId) {
            foreach ($globalRoles as $role) {
                $existing = DB::table('roles')
                    ->where($teamKey, $tenantId)
                    ->where('name', $role->name)
                    ->where('guard_name', $role->guard_name)
                    ->value('id');

                $newId = $existing ?: DB::table('roles')->insertGetId([
                    $teamKey => $tenantId,
                    'name' => $role->name,
                    'guard_name' => $role->guard_name,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $oldToNewByTenant[$tenantId][$role->id] = $newId;

                foreach ($rolePermissionRows->get($role->id, collect()) as $rp) {
                    DB::table('role_has_permissions')->insertOrIgnore([
                        'permission_id' => $rp->permission_id,
                        'role_id' => $newId,
                    ]);
                }
            }
        }

        $users = DB::table('users')->whereNotNull('tenant_id')->get(['id', 'tenant_id']);
        foreach ($users as $user) {
            $map = $oldToNewByTenant[$user->tenant_id] ?? [];
            if ($map === []) {
                continue;
            }

            $assignments = DB::table('model_has_roles')
                ->where('model_type', 'App\\Models\\User')
                ->where($morphKey, $user->id)
                ->get();

            foreach ($assignments as $assignment) {
                $newRoleId = $map[$assignment->{$pivotRole}] ?? null;
                if (! $newRoleId) {
                    continue;
                }

                DB::table('model_has_roles')
                    ->where('model_type', 'App\\Models\\User')
                    ->where($morphKey, $user->id)
                    ->where($pivotRole, $assignment->{$pivotRole})
                    ->delete();

                DB::table('model_has_roles')->insertOrIgnore([
                    $teamKey => $user->tenant_id,
                    $pivotRole => $newRoleId,
                    'model_type' => 'App\\Models\\User',
                    $morphKey => $user->id,
                ]);
            }

            DB::table('model_has_permissions')
                ->where('model_type', 'App\\Models\\User')
                ->where($morphKey, $user->id)
                ->update([$teamKey => $user->tenant_id]);
        }

        $globalRoleIds = $globalRoles->pluck('id')->all();
        DB::table('role_has_permissions')->whereIn('role_id', $globalRoleIds)->delete();
        DB::table('roles')->whereIn('id', $globalRoleIds)->delete();
    }

    private function backfillPivotTeamIds(string $teamKey, string $morphKey): void
    {
        $users = DB::table('users')->whereNotNull('tenant_id')->get(['id', 'tenant_id']);
        foreach ($users as $user) {
            DB::table('model_has_roles')
                ->where('model_type', 'App\\Models\\User')
                ->where($morphKey, $user->id)
                ->update([$teamKey => $user->tenant_id]);

            DB::table('model_has_permissions')
                ->where('model_type', 'App\\Models\\User')
                ->where($morphKey, $user->id)
                ->update([$teamKey => $user->tenant_id]);
        }
    }

    private function dropIndexQuietly(string $table, string $index): void
    {
        try {
            Schema::table($table, function (Blueprint $blueprint) use ($index) {
                $blueprint->dropUnique($index);
            });
        } catch (Throwable) {
            // Index may not exist yet.
        }
    }

    /**
     * @param  list<string>  $columns
     */
    private function recreatePrimary(string $table, string $indexName, array $columns): void
    {
        try {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropPrimary();
            });
        } catch (Throwable) {
            // Primary may already match.
        }

        try {
            Schema::table($table, function (Blueprint $blueprint) use ($columns, $indexName) {
                $blueprint->primary($columns, $indexName);
            });
        } catch (Throwable) {
            // Primary already exists with this shape.
        }
    }
};
