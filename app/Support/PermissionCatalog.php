<?php

namespace App\Support;

use App\Enums\PlatformModule;

/**
 * Product permission catalog and default role → permission matrix.
 * Namespaced strings are the Spatie permission names.
 */
final class PermissionCatalog
{
    public const CRM_RESOURCES = ['contacts', 'accounts', 'leads', 'deals', 'tasks'];

    public const VIEW_SCOPES = ['own', 'team', 'all'];

    /**
     * Permission group → platform module (null = always available for tenant admins).
     *
     * @return array<string, string|null>
     */
    public static function groupModules(): array
    {
        return [
            'Contacts' => PlatformModule::Crm->value,
            'Accounts' => PlatformModule::Crm->value,
            'Leads' => PlatformModule::Crm->value,
            'Deals' => PlatformModule::Crm->value,
            'Tasks' => PlatformModule::Crm->value,
            'Marketing' => PlatformModule::Crm->value,
            'Reports' => PlatformModule::Crm->value,
            'Settings' => null,
            'Admin' => null,
            'Finance' => PlatformModule::Finance->value,
            'Inventory' => PlatformModule::Inventory->value,
            'HR' => PlatformModule::Hr->value,
            'Projects' => PlatformModule::Projects->value,
            'Contracts' => PlatformModule::Crm->value,
            'Expenses' => PlatformModule::Finance->value,
            'Areas' => PlatformModule::Crm->value,
        ];
    }

    /**
     * @return list<string>
     */
    public static function all(): array
    {
        $perms = [];

        foreach (self::CRM_RESOURCES as $resource) {
            foreach (self::VIEW_SCOPES as $scope) {
                $perms[] = "{$resource}.view.{$scope}";
            }
            $perms[] = "{$resource}.create";
            $perms[] = "{$resource}.update";
            $perms[] = "{$resource}.delete";
        }

        $perms[] = 'leads.convert';
        $perms[] = 'deals.move_stage';

        $perms = array_merge($perms, [
            'marketing.view',
            'marketing.create',
            'marketing.manage',
            'reports.view',
            'analytics.view',
            'import.run',
            'settings.view',
            'settings.manage',
            'users.view',
            'users.manage',
            'roles.manage',
            'api_keys.manage',
            'finance.view',
            'finance.create',
            'inventory.view',
            'inventory.create',
            'inventory.update',
            'inventory.delete',
            'hr.view',
            'hr.create',
            'hr.update',
            'hr.delete',
            'hr.leave.approve',
            'projects.view',
            'projects.create',
            'projects.update',
            'projects.delete',
            'contracts.view',
            'contracts.create',
            'contracts.update',
            'contracts.delete',
            'expenses.view',
            'expenses.create',
            'expenses.update',
            'expenses.delete',
            'expenses.approve',
            'areas.view',
            'areas.create',
            'areas.update',
        ]);

        return $perms;
    }

    /**
     * Grouped labels for the Roles matrix UI.
     *
     * @return array<string, list<string>>
     */
    public static function groups(): array
    {
        $groups = [];

        foreach (self::CRM_RESOURCES as $resource) {
            $items = [];
            foreach (self::VIEW_SCOPES as $scope) {
                $items[] = "{$resource}.view.{$scope}";
            }
            $items[] = "{$resource}.create";
            $items[] = "{$resource}.update";
            $items[] = "{$resource}.delete";
            if ($resource === 'leads') {
                $items[] = 'leads.convert';
            }
            if ($resource === 'deals') {
                $items[] = 'deals.move_stage';
            }
            $groups[ucfirst($resource)] = $items;
        }

        $groups['Marketing'] = ['marketing.view', 'marketing.create', 'marketing.manage'];
        $groups['Reports'] = ['reports.view', 'analytics.view', 'import.run'];
        $groups['Settings'] = ['settings.view', 'settings.manage'];
        $groups['Admin'] = ['users.view', 'users.manage', 'roles.manage', 'api_keys.manage'];
        $groups['Finance'] = ['finance.view', 'finance.create'];
        $groups['Inventory'] = ['inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete'];
        $groups['HR'] = ['hr.view', 'hr.create', 'hr.update', 'hr.delete', 'hr.leave.approve'];
        $groups['Projects'] = ['projects.view', 'projects.create', 'projects.update', 'projects.delete'];
        $groups['Contracts'] = ['contracts.view', 'contracts.create', 'contracts.update', 'contracts.delete'];
        $groups['Expenses'] = ['expenses.view', 'expenses.create', 'expenses.update', 'expenses.delete', 'expenses.approve'];
        $groups['Areas'] = ['areas.view', 'areas.create', 'areas.update'];

        return $groups;
    }

    /**
     * Permission groups visible for a tenant given its enabled modules.
     *
     * @param  list<string>  $enabledModules
     * @return array<string, list<string>>
     */
    public static function groupsForModules(array $enabledModules): array
    {
        $enabled = array_values(array_unique($enabledModules));
        $filtered = [];

        foreach (self::groups() as $group => $perms) {
            $module = self::groupModules()[$group] ?? null;
            if ($module === null || in_array($module, $enabled, true)) {
                $filtered[$group] = $perms;
            }
        }

        return $filtered;
    }

    /**
     * Flat permission list allowed for a tenant's enabled modules.
     *
     * @param  list<string>  $enabledModules
     * @return list<string>
     */
    public static function permissionsForModules(array $enabledModules): array
    {
        $groups = self::groupsForModules($enabledModules);
        if ($groups === []) {
            return [];
        }

        return array_values(array_unique(array_merge(...array_values($groups))));
    }

    /**
     * Default permissions per role name (mirrors previous coarse RBAC).
     *
     * @return array<string, list<string>>
     */
    public static function roleDefaults(): array
    {
        $all = self::all();

        $crmViewAll = [];
        $crmViewOwn = [];
        $crmMutate = [];
        foreach (self::CRM_RESOURCES as $resource) {
            $crmViewAll[] = "{$resource}.view.all";
            $crmViewOwn[] = "{$resource}.view.own";
            $crmMutate[] = "{$resource}.create";
            $crmMutate[] = "{$resource}.update";
            $crmMutate[] = "{$resource}.delete";
        }

        $erpView = [
            'finance.view', 'inventory.view', 'hr.view', 'projects.view',
            'contracts.view', 'expenses.view', 'areas.view',
        ];

        $erpMutate = [
            'finance.create',
            'inventory.create', 'inventory.update', 'inventory.delete',
            'hr.create', 'hr.update', 'hr.delete', 'hr.leave.approve',
            'projects.create', 'projects.update', 'projects.delete',
            'contracts.create', 'contracts.update', 'contracts.delete',
            'expenses.create', 'expenses.update', 'expenses.delete', 'expenses.approve',
            'areas.create', 'areas.update',
        ];

        return [
            'admin' => $all,

            'manager' => array_values(array_unique(array_merge(
                $crmViewAll,
                $crmMutate,
                ['leads.convert', 'deals.move_stage'],
                ['marketing.view', 'marketing.create', 'marketing.manage'],
                ['reports.view', 'analytics.view', 'import.run'],
                ['settings.view'],
                $erpView,
                $erpMutate,
            ))),

            'rep' => array_values(array_unique(array_merge(
                $crmViewOwn,
                $crmMutate,
                ['leads.convert', 'deals.move_stage'],
                ['marketing.view', 'marketing.create'],
                ['reports.view', 'import.run'],
                ['settings.view'],
                ['expenses.view', 'expenses.create', 'expenses.update'],
                ['areas.view'],
                ['contracts.view'],
                ['projects.view'],
                ['hr.view'],
                ['finance.view'],
                ['inventory.view'],
            ))),

            'support' => array_values(array_unique(array_merge(
                $crmViewOwn,
                ['contacts.create', 'contacts.update', 'accounts.create', 'accounts.update',
                    'tasks.create', 'tasks.update', 'tasks.delete'],
                ['marketing.view', 'marketing.create'],
                ['settings.view'],
                ['areas.view'],
            ))),

            'readonly' => array_values(array_unique(array_merge(
                $crmViewOwn,
                ['marketing.view', 'reports.view', 'analytics.view', 'settings.view'],
                $erpView,
            ))),
        ];
    }
}
