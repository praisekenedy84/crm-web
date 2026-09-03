<?php

namespace App\Services;

use App\Models\User;
use App\Support\PermissionCatalog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class PermissionService
{
    public function can(User $user, string $ability): bool
    {
        return $user->can($ability);
    }

    /**
     * Highest view scope for a CRM resource, or null if none.
     *
     * @return 'own'|'team'|'all'|null
     */
    public function viewScope(User $user, string $resource): ?string
    {
        if ($user->can("{$resource}.view.all")) {
            return 'all';
        }
        if ($user->can("{$resource}.view.team")) {
            return 'team';
        }
        if ($user->can("{$resource}.view.own")) {
            return 'own';
        }

        return null;
    }

    /**
     * Whether the user can see the module menu (any view scope or a bare .view permission).
     */
    public function canViewResource(User $user, string $resource): bool
    {
        if ($this->viewScope($user, $resource) !== null) {
            return true;
        }

        return $user->can("{$resource}.view");
    }

    /**
     * Self + users who share at least one territory. Falls back to [self] when no territories.
     *
     * @return list<int>
     */
    public function teamUserIds(User $user): array
    {
        $territoryIds = DB::table('territory_user')
            ->where('user_id', $user->id)
            ->pluck('territory_id');

        if ($territoryIds->isEmpty()) {
            return [(int) $user->id];
        }

        $ids = DB::table('territory_user')
            ->whereIn('territory_id', $territoryIds)
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        if (! in_array((int) $user->id, $ids, true)) {
            $ids[] = (int) $user->id;
        }

        return $ids;
    }

    /**
     * Restrict a query by the user's view scope for a resource.
     */
    public function applyOwnerScope(Builder $query, User $user, string $resource, string $ownerColumn = 'owner_id'): Builder
    {
        $scope = $this->viewScope($user, $resource);

        if ($scope === null) {
            return $query->whereRaw('1 = 0');
        }

        if ($scope === 'all') {
            return $query;
        }

        if ($scope === 'team') {
            return $query->whereIn($ownerColumn, $this->teamUserIds($user));
        }

        return $query->where($ownerColumn, $user->id);
    }

    /**
     * Whether the user may act on a specific owned record given ability + view scope.
     */
    public function canAccessOwned(User $user, string $resource, string $ability, ?int $ownerId): bool
    {
        if ($ability === 'view') {
            if ($this->viewScope($user, $resource) === null) {
                return false;
            }
        } elseif (! $user->can("{$resource}.{$ability}")) {
            return false;
        }

        $scope = $this->viewScope($user, $resource);
        if ($scope === null) {
            return false;
        }
        if ($scope === 'all') {
            return true;
        }

        $ownerId = $ownerId !== null ? (int) $ownerId : null;

        if ($scope === 'own') {
            return $ownerId === (int) $user->id;
        }

        return $ownerId !== null && in_array($ownerId, $this->teamUserIds($user), true);
    }

    /**
     * Flat permission names for the current user (role + direct).
     *
     * @return list<string>
     */
    public function abilitiesFor(User $user): array
    {
        return $user->getAllPermissions()->pluck('name')->values()->all();
    }

    /**
     * View scopes keyed by CRM resource.
     *
     * @return array<string, 'own'|'team'|'all'>
     */
    public function scopesFor(User $user): array
    {
        $scopes = [];
        foreach (PermissionCatalog::CRM_RESOURCES as $resource) {
            $scope = $this->viewScope($user, $resource);
            if ($scope !== null) {
                $scopes[$resource] = $scope;
            }
        }

        return $scopes;
    }

    /**
     * Direct (override) permission names on the user, excluding those only from roles.
     *
     * @return list<string>
     */
    public function directAbilitiesFor(User $user): array
    {
        return $user->getDirectPermissions()->pluck('name')->values()->all();
    }
}
