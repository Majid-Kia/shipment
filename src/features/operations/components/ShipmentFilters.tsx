import { useEffect, useState } from "react";

import {
  EXCEPTION_TYPES,
  PORT_CODES,
  SHIPMENT_PRIORITIES,
  SHIPMENT_STATUSES,
} from "@/domain/shipment";
import type { OperationsSearchState } from "@/features/operations/operations-search-params";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ShipmentFiltersProps {
  filters: OperationsSearchState;
  onClear: () => void;
  onFilterChange: (
    changes: Partial<OperationsSearchState>,
    options?: { replace?: boolean },
  ) => void;
}

function label(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function ShipmentFilters({
  filters,
  onClear,
  onFilterChange,
}: ShipmentFiltersProps) {
  const [searchDraft, setSearchDraft] = useState(filters.search ?? "");

  useEffect(() => {
    // Browser navigation is external state, so it must update the local draft.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchDraft(filters.search ?? "");
  }, [filters.search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const search = searchDraft.trim() || undefined;
      if (search !== filters.search) {
        onFilterChange({ search }, { replace: true });
      }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [filters.search, onFilterChange, searchDraft]);

  const selectClassName =
    "h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <section aria-label="Shipment filters" className="rounded-lg border p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        <label className="grid gap-1 text-xs font-medium">
          Search
          <Input
            aria-label="Search shipments"
            value={searchDraft}
            placeholder="Shipment or port"
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                const search = searchDraft.trim() || undefined;
                onFilterChange({ search }, { replace: true });
              }
            }}
          />
        </label>
        <FilterSelect
          label="Exception type"
          value={filters.exceptionType ?? ""}
          options={EXCEPTION_TYPES}
          className={selectClassName}
          onChange={(value) =>
            onFilterChange({
              exceptionType:
                (value as OperationsSearchState["exceptionType"]) || undefined,
            })
          }
        />
        <FilterSelect
          label="Priority"
          value={filters.priority ?? ""}
          options={SHIPMENT_PRIORITIES}
          className={selectClassName}
          onChange={(value) =>
            onFilterChange({
              priority:
                (value as OperationsSearchState["priority"]) || undefined,
            })
          }
        />
        <FilterSelect
          label="Status"
          value={filters.status ?? ""}
          options={SHIPMENT_STATUSES}
          className={selectClassName}
          defaultLabel="Active"
          onChange={(value) =>
            onFilterChange({
              status: (value as OperationsSearchState["status"]) || undefined,
            })
          }
        />
        <FilterSelect
          label="Origin port"
          value={filters.origin ?? ""}
          options={PORT_CODES}
          className={selectClassName}
          onChange={(value) => onFilterChange({ origin: value || undefined })}
        />
        <label className="grid gap-1 text-xs font-medium">
          Assignment
          <select
            aria-label="Assignment"
            className={selectClassName}
            value={
              filters.assigned === undefined ? "" : String(filters.assigned)
            }
            onChange={(event) =>
              onFilterChange({
                assigned:
                  event.target.value === ""
                    ? undefined
                    : event.target.value === "true",
              })
            }
          >
            <option value="">All</option>
            <option value="true">Assigned</option>
            <option value="false">Unassigned</option>
          </select>
        </label>
        <div className="flex items-end">
          <Button className="w-full" variant="outline" onClick={onClear}>
            Clear filters
          </Button>
        </div>
      </div>
    </section>
  );
}

interface FilterSelectProps {
  className: string;
  defaultLabel?: string;
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}

function FilterSelect({
  className,
  defaultLabel = "All",
  label: selectLabel,
  onChange,
  options,
  value,
}: FilterSelectProps) {
  return (
    <label className="grid gap-1 text-xs font-medium">
      {selectLabel}
      <select
        aria-label={selectLabel}
        className={className}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{defaultLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {label(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
