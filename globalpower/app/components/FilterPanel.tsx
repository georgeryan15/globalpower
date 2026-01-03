"use client";

import { useState, useMemo } from "react";
import {
  Button,
  Checkbox,
  CheckboxGroup,
  Slider,
  Select,
  SelectItem,
  Divider,
} from "@heroui/react";
import { type PowerPlant, powerPlants } from "@/app/data/placeholder";

export interface FilterState {
  plantTypes: PowerPlant["type"][];
  statuses: PowerPlant["status"][];
  capacityRange: [number, number];
  emissionsRange: [number, number];
  yearRange: [number, number];
  countries: string[];
}

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  isDarkMode: boolean;
}

const plantTypes: {
  value: PowerPlant["type"];
  label: string;
  color: string;
}[] = [
  { value: "nuclear", label: "Nuclear", color: "#8b5cf6" },
  { value: "hydro", label: "Hydro", color: "#3b82f6" },
  { value: "wind", label: "Wind", color: "#10b981" },
  { value: "solar", label: "Solar", color: "#fbbf24" },
  { value: "gas", label: "Gas", color: "#f59e0b" },
  { value: "coal", label: "Coal", color: "#4a4a4a" },
  { value: "oil", label: "Oil", color: "#1f2937" },
];

const statuses: {
  value: PowerPlant["status"];
  label: string;
  color: string;
}[] = [
  { value: "operating", label: "Operating", color: "#22c55e" },
  { value: "maintenance", label: "Maintenance", color: "#eab308" },
  { value: "offline", label: "Offline", color: "#ef4444" },
];

// Get unique countries from power plants
const getUniqueCountries = (): string[] => {
  const countries = new Set(powerPlants.map((p) => p.country));
  return Array.from(countries).sort();
};

// Get capacity/emissions/year ranges from data
const getDataRanges = () => {
  const capacities = powerPlants.map((p) => p.capacity);
  const emissions = powerPlants.map((p) => p.emissions);
  const years = powerPlants.map((p) => p.constructionYear);
  return {
    capacity: { min: Math.min(...capacities), max: Math.max(...capacities) },
    emissions: { min: Math.min(...emissions), max: Math.max(...emissions) },
    year: { min: Math.min(...years), max: Math.max(...years) },
  };
};

export const getDefaultFilters = (): FilterState => {
  const ranges = getDataRanges();
  return {
    plantTypes: plantTypes.map((t) => t.value),
    statuses: statuses.map((s) => s.value),
    capacityRange: [ranges.capacity.min, ranges.capacity.max],
    emissionsRange: [ranges.emissions.min, ranges.emissions.max],
    yearRange: [ranges.year.min, ranges.year.max],
    countries: [],
  };
};

export default function FilterPanel({
  filters,
  onFiltersChange,
  isDarkMode,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const ranges = useMemo(() => getDataRanges(), []);
  const countries = useMemo(() => getUniqueCountries(), []);

  const bgClass = isDarkMode
    ? "bg-gray-900/95 text-gray-100"
    : "bg-white/95 text-gray-700";
  const mutedClass = isDarkMode ? "text-gray-400" : "text-gray-500";
  const dividerClass = isDarkMode ? "bg-gray-700" : "bg-gray-200";

  const handleTypeChange = (values: string[]) => {
    onFiltersChange({
      ...filters,
      plantTypes: values as PowerPlant["type"][],
    });
  };

  const handleStatusChange = (values: string[]) => {
    onFiltersChange({
      ...filters,
      statuses: values as PowerPlant["status"][],
    });
  };

  const handleCapacityChange = (value: number | number[]) => {
    if (Array.isArray(value)) {
      onFiltersChange({
        ...filters,
        capacityRange: [value[0], value[1]],
      });
    }
  };

  const handleEmissionsChange = (value: number | number[]) => {
    if (Array.isArray(value)) {
      onFiltersChange({
        ...filters,
        emissionsRange: [value[0], value[1]],
      });
    }
  };

  const handleYearChange = (value: number | number[]) => {
    if (Array.isArray(value)) {
      onFiltersChange({
        ...filters,
        yearRange: [value[0], value[1]],
      });
    }
  };

  const handleCountryChange = (keys: Set<string> | "all") => {
    if (keys === "all") {
      onFiltersChange({
        ...filters,
        countries: countries,
      });
    } else {
      onFiltersChange({
        ...filters,
        countries: Array.from(keys),
      });
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.plantTypes.length < 7) count++;
    if (filters.statuses.length < 3) count++;
    if (
      filters.capacityRange[0] > ranges.capacity.min ||
      filters.capacityRange[1] < ranges.capacity.max
    )
      count++;
    if (
      filters.emissionsRange[0] > ranges.emissions.min ||
      filters.emissionsRange[1] < ranges.emissions.max
    )
      count++;
    if (
      filters.yearRange[0] > ranges.year.min ||
      filters.yearRange[1] < ranges.year.max
    )
      count++;
    if (filters.countries.length > 0) count++;
    return count;
  }, [filters, ranges]);

  const resetFilters = () => {
    onFiltersChange(getDefaultFilters());
  };

  return (
    <div
      className={`absolute top-16 left-4 rounded-2xl p-4 shadow-lg backdrop-blur-sm z-10 ${bgClass}`}
      style={{ width: isExpanded ? 280 : 220 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
            />
          </svg>
          <h4 className="font-heading text-sm font-medium">Filters</h4>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 bg-blue-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button
            size="sm"
            variant="light"
            className={`h-6 min-w-0 px-2 text-xs ${mutedClass}`}
            onPress={resetFilters}
          >
            Reset
          </Button>
        )}
      </div>

      <Divider className={`my-3 ${dividerClass}`} />

      {/* Basic Filters: Plant Types */}
      <div className="mb-4">
        <p
          className={`font-body text-[10px] uppercase tracking-wide mb-2 ${mutedClass}`}
        >
          Plant Type
        </p>
        <CheckboxGroup
          value={filters.plantTypes}
          onValueChange={handleTypeChange}
          size="sm"
          classNames={{
            wrapper: "gap-1.5",
          }}
        >
          {plantTypes.map((type) => (
            <Checkbox
              key={type.value}
              value={type.value}
              classNames={{
                label: `font-body text-xs ${
                  isDarkMode ? "text-gray-200" : "text-gray-700"
                }`,
                wrapper: `before:border-gray-500 ${
                  isDarkMode
                    ? "group-data-[selected=true]:before:bg-blue-500"
                    : ""
                }`,
              }}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full border border-white/30"
                  style={{ backgroundColor: type.color }}
                />
                <span>{type.label}</span>
              </div>
            </Checkbox>
          ))}
        </CheckboxGroup>
      </div>

      <Divider className={`my-3 ${dividerClass}`} />

      {/* Basic Filters: Status */}
      <div className="mb-4">
        <p
          className={`font-body text-[10px] uppercase tracking-wide mb-2 ${mutedClass}`}
        >
          Status
        </p>
        <CheckboxGroup
          value={filters.statuses}
          onValueChange={handleStatusChange}
          size="sm"
          classNames={{
            wrapper: "gap-1.5",
          }}
        >
          {statuses.map((status) => (
            <Checkbox
              key={status.value}
              value={status.value}
              classNames={{
                label: `font-body text-xs capitalize ${
                  isDarkMode ? "text-gray-200" : "text-gray-700"
                }`,
                wrapper: "before:border-gray-500",
              }}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <span>{status.label}</span>
              </div>
            </Checkbox>
          ))}
        </CheckboxGroup>
      </div>

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl transition-colors ${
          isDarkMode
            ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
            : "bg-gray-100 hover:bg-gray-200 text-gray-600"
        }`}
      >
        <span className="text-xs font-body">
          {isExpanded ? "Hide Advanced" : "Show Advanced"}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`w-3 h-3 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="mt-4 space-y-5">
          <Divider className={dividerClass} />

          {/* Capacity Range */}
          <div>
            <p
              className={`font-body text-[10px] uppercase tracking-wide mb-3 ${mutedClass}`}
            >
              Capacity (MW)
            </p>
            <Slider
              step={100}
              minValue={ranges.capacity.min}
              maxValue={ranges.capacity.max}
              value={filters.capacityRange}
              onChange={handleCapacityChange}
              size="sm"
              classNames={{
                base: "max-w-full",
                filler: "bg-blue-500",
                thumb: "bg-blue-500",
                track: isDarkMode ? "bg-gray-700" : "bg-gray-200",
              }}
              aria-label="Capacity range"
            />
            <div className="flex justify-between mt-1">
              <span className={`text-[10px] font-stats ${mutedClass}`}>
                {filters.capacityRange[0].toLocaleString()}
              </span>
              <span className={`text-[10px] font-stats ${mutedClass}`}>
                {filters.capacityRange[1].toLocaleString()}
              </span>
            </div>
          </div>

          {/* Emissions Range */}
          <div>
            <p
              className={`font-body text-[10px] uppercase tracking-wide mb-3 ${mutedClass}`}
            >
              Emissions (gCO2/kWh)
            </p>
            <Slider
              step={10}
              minValue={ranges.emissions.min}
              maxValue={ranges.emissions.max}
              value={filters.emissionsRange}
              onChange={handleEmissionsChange}
              size="sm"
              classNames={{
                base: "max-w-full",
                filler: "bg-green-500",
                thumb: "bg-green-500",
                track: isDarkMode ? "bg-gray-700" : "bg-gray-200",
              }}
              aria-label="Emissions range"
            />
            <div className="flex justify-between mt-1">
              <span className={`text-[10px] font-stats ${mutedClass}`}>
                {filters.emissionsRange[0]}
              </span>
              <span className={`text-[10px] font-stats ${mutedClass}`}>
                {filters.emissionsRange[1]}
              </span>
            </div>
          </div>

          {/* Construction Year Range */}
          <div>
            <p
              className={`font-body text-[10px] uppercase tracking-wide mb-3 ${mutedClass}`}
            >
              Construction Year
            </p>
            <Slider
              step={1}
              minValue={ranges.year.min}
              maxValue={ranges.year.max}
              value={filters.yearRange}
              onChange={handleYearChange}
              size="sm"
              classNames={{
                base: "max-w-full",
                filler: "bg-purple-500",
                thumb: "bg-purple-500",
                track: isDarkMode ? "bg-gray-700" : "bg-gray-200",
              }}
              aria-label="Construction year range"
            />
            <div className="flex justify-between mt-1">
              <span className={`text-[10px] font-stats ${mutedClass}`}>
                {filters.yearRange[0]}
              </span>
              <span className={`text-[10px] font-stats ${mutedClass}`}>
                {filters.yearRange[1]}
              </span>
            </div>
          </div>

          {/* Country Filter */}
          <div>
            <p
              className={`font-body text-[10px] uppercase tracking-wide mb-2 ${mutedClass}`}
            >
              Country
            </p>
            <Select
              placeholder="All countries"
              selectionMode="multiple"
              selectedKeys={new Set(filters.countries)}
              onSelectionChange={(keys) =>
                handleCountryChange(keys as Set<string> | "all")
              }
              size="sm"
              classNames={{
                trigger: `${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700"
                    : "bg-gray-50 border-gray-200"
                } min-h-8`,
                value: `text-xs ${
                  isDarkMode ? "text-gray-200" : "text-gray-700"
                }`,
                popoverContent: isDarkMode ? "bg-gray-800 border-gray-700" : "",
              }}
              aria-label="Filter by country"
            >
              {countries.map((country) => (
                <SelectItem key={country} textValue={country}>
                  <span className="text-xs">{country}</span>
                </SelectItem>
              ))}
            </Select>
            {filters.countries.length > 0 && (
              <p className={`text-[10px] mt-1 ${mutedClass}`}>
                {filters.countries.length} selected
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
