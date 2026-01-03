"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Map, {
  Source,
  Layer,
  Marker,
  NavigationControl,
  ScaleControl,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import useSupercluster from "use-supercluster";
import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Progress,
  Chip,
} from "@heroui/react";
import {
  powerPlants,
  countryEmissions,
  getEmissionsColor,
  getPlantTypeColor,
  type PowerPlant,
} from "@/app/data/placeholder";
import PlantDrawer from "./PlantDrawer";
import FilterPanel, {
  type FilterState,
  getDefaultFilters,
} from "./FilterPanel";

const plantTypeLabels: Record<PowerPlant["type"], string> = {
  coal: "Coal",
  gas: "Natural Gas",
  nuclear: "Nuclear",
  hydro: "Hydroelectric",
  wind: "Wind",
  solar: "Solar",
  oil: "Oil",
};

interface PlantTooltipContentProps {
  plant: PowerPlant;
  isDarkMode: boolean;
  onViewDetails: () => void;
}

function PlantTooltipContent({
  plant,
  isDarkMode,
  onViewDetails,
}: PlantTooltipContentProps) {
  const utilization = (plant.output / plant.capacity) * 100;
  const bgClass = isDarkMode ? "bg-gray-900" : "bg-white";
  const textClass = isDarkMode ? "text-gray-100" : "text-gray-800";
  const mutedClass = isDarkMode ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`${bgClass} rounded-xl p-3 min-w-[220px] max-w-[260px]`}>
      {/* Header */}
      <div className="mb-2">
        <h3
          className={`font-heading text-sm font-medium leading-tight ${textClass}`}
        >
          {plant.name}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <Chip
            size="sm"
            variant="flat"
            className="font-body text-xs capitalize"
            style={{
              backgroundColor: `${getPlantTypeColor(plant.type)}25`,
              color: getPlantTypeColor(plant.type),
            }}
          >
            {plantTypeLabels[plant.type]}
          </Chip>
        </div>
      </div>

      {/* Output Stats */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <p
            className={`font-body text-[10px] uppercase tracking-wide ${mutedClass}`}
          >
            Output
          </p>
          <p className={`font-stats text-sm ${textClass}`}>
            {plant.output.toLocaleString()} MW
          </p>
        </div>
        <div>
          <p
            className={`font-body text-[10px] uppercase tracking-wide ${mutedClass}`}
          >
            Capacity
          </p>
          <p className={`font-stats text-sm ${textClass}`}>
            {plant.capacity.toLocaleString()} MW
          </p>
        </div>
      </div>

      {/* Capacity Factor */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span
            className={`font-body text-[10px] uppercase tracking-wide ${mutedClass}`}
          >
            Capacity Factor
          </span>
          <span className={`font-stats text-xs ${textClass}`}>
            {utilization.toFixed(1)}%
          </span>
        </div>
        <Progress
          value={utilization}
          size="sm"
          color={
            utilization > 80
              ? "success"
              : utilization > 50
              ? "primary"
              : "warning"
          }
          className="h-1.5"
        />
      </div>

      {/* View Details Button */}
      <Button
        size="sm"
        color="primary"
        className="w-full font-body"
        onPress={onViewDetails}
      >
        View Details
      </Button>
    </div>
  );
}

const LIGHT_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const DARK_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export default function MapView() {
  const mapRef = useRef<MapRef>(null);
  const [selectedPlant, setSelectedPlant] = useState<PowerPlant | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [countriesGeoJson, setCountriesGeoJson] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode
  const [filters, setFilters] = useState<FilterState>(getDefaultFilters);
  const [viewState, setViewState] = useState({
    longitude: 10,
    latitude: 45,
    zoom: 3,
  });
  const [bounds, setBounds] = useState<
    [number, number, number, number] | undefined
  >(undefined);
  const [tooltipPlantId, setTooltipPlantId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isOverPopoverRef = useRef(false);

  const handlePinMouseEnter = useCallback((plantId: string) => {
    // Clear any pending close
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setTooltipPlantId(plantId);
    }, 1000);
  }, []);

  const handlePinMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Add a small delay before closing to allow mouse to reach popover
    closeTimeoutRef.current = setTimeout(() => {
      if (!isOverPopoverRef.current) {
        setTooltipPlantId(null);
      }
    }, 150);
  }, []);

  const handlePopoverMouseEnter = useCallback(() => {
    isOverPopoverRef.current = true;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const handlePopoverMouseLeave = useCallback(() => {
    isOverPopoverRef.current = false;
    setTooltipPlantId(null);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Filter power plants based on current filters
  const filteredPlants = useMemo(() => {
    return powerPlants.filter((plant) => {
      // Filter by plant type
      if (!filters.plantTypes.includes(plant.type)) return false;

      // Filter by status
      if (!filters.statuses.includes(plant.status)) return false;

      // Filter by capacity range
      if (
        plant.capacity < filters.capacityRange[0] ||
        plant.capacity > filters.capacityRange[1]
      )
        return false;

      // Filter by emissions range
      if (
        plant.emissions < filters.emissionsRange[0] ||
        plant.emissions > filters.emissionsRange[1]
      )
        return false;

      // Filter by construction year range
      if (
        plant.constructionYear < filters.yearRange[0] ||
        plant.constructionYear > filters.yearRange[1]
      )
        return false;

      // Filter by country (if any countries are selected)
      if (
        filters.countries.length > 0 &&
        !filters.countries.includes(plant.country)
      )
        return false;

      return true;
    });
  }, [filters]);

  // Prepare points for clustering (using filtered plants)
  const points = useMemo(() => {
    return filteredPlants.map((plant) => ({
      type: "Feature" as const,
      properties: {
        cluster: false,
        plantId: plant.id,
        plant: plant,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [plant.longitude, plant.latitude],
      },
    }));
  }, [filteredPlants]);

  // Use supercluster for clustering
  const { clusters, supercluster } = useSupercluster({
    points,
    bounds,
    zoom: viewState.zoom,
    options: { radius: 60, maxZoom: 14 },
  });

  // Update bounds when map loads or moves
  const updateBounds = useCallback(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      const mapBounds = map.getBounds();
      setBounds(mapBounds.toArray().flat() as [number, number, number, number]);
    }
  }, []);

  // Fetch countries GeoJSON
  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
    )
      .then((res) => res.json())
      .then((data: GeoJSON.FeatureCollection) => {
        // Pastel colors for emissions scale (vibrant variants)
        const pastelColors = [
          "#9ce6b8", // Light pastel green (very low) - more vibrant
          "#ade6a0", // Pastel green (low) - more vibrant
          "#c8e68a", // Yellow-green - more vibrant
          "#e6e670", // Pastel yellow - more vibrant
          "#ffe888", // Light yellow - more vibrant
          "#ffd070", // Pastel orange-yellow - more vibrant
          "#ffb880", // Light orange - more vibrant
          "#e89858", // Light brown - more vibrant
          "#d08850", // Medium brown - more vibrant
          "#c07048", // Brown - more vibrant
        ];

        // Simple hash function to get consistent random index per country
        const hashString = (str: string): number => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
          }
          return Math.abs(hash);
        };

        // Add emissions data to each country feature
        const featuresWithEmissions = data.features.map((feature) => {
          // GeoJSON uses "ISO3166-1-Alpha-3" for country code
          const countryCode = feature.properties?.["ISO3166-1-Alpha-3"];
          const countryName = feature.properties?.name || "";
          const emissionsData = countryEmissions.find(
            (c) => c.countryCode === countryCode
          );

          // If we have real emissions data, use it; otherwise assign random pastel color
          let emissionsColor: string;
          let emissions: number;

          if (emissionsData) {
            emissions = emissionsData.emissions;
            emissionsColor = getEmissionsColor(emissions);
          } else {
            // Use hash of country name to pick a consistent random color
            const colorIndex = hashString(countryName) % pastelColors.length;
            emissionsColor = pastelColors[colorIndex];
            emissions = 100 + colorIndex * 80; // Approximate emissions for legend purposes
          }

          return {
            ...feature,
            properties: {
              ...feature.properties,
              countryCode: countryCode,
              emissions: emissions,
              emissionsColor: emissionsColor,
              renewablePercent: emissionsData?.renewablePercent ?? 30,
              totalCapacity: emissionsData?.totalCapacity ?? 0,
            },
          };
        });
        setCountriesGeoJson({
          type: "FeatureCollection",
          features: featuresWithEmissions,
        });
      });
  }, []);

  const handleMarkerClick = useCallback((plant: PowerPlant) => {
    setSelectedPlant(plant);
    mapRef.current?.flyTo({
      center: [plant.longitude, plant.latitude],
      zoom: 6,
      duration: 1000,
    });
  }, []);

  const handleClusterClick = useCallback(
    (clusterId: number, longitude: number, latitude: number) => {
      if (!supercluster) return;
      const expansionZoom = Math.min(
        supercluster.getClusterExpansionZoom(clusterId),
        14
      );
      mapRef.current?.flyTo({
        center: [longitude, latitude],
        zoom: expansionZoom,
        duration: 500,
      });
    },
    [supercluster]
  );

  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    const features = e.features;
    if (features && features.length > 0) {
      const country = features[0];
      console.log("Clicked country:", country.properties?.ADMIN);
    }
  }, []);

  const handleMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const features = e.features;
    if (features && features.length > 0) {
      setHoveredCountry(
        features[0].properties?.countryCode ||
          features[0].properties?.["ISO3166-1-Alpha-3"]
      );
    } else {
      setHoveredCountry(null);
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  return (
    <div className={`relative w-full h-screen ${isDarkMode ? "dark" : ""}`}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => {
          setViewState(evt.viewState);
          updateBounds();
        }}
        onLoad={updateBounds}
        style={{ width: "100%", height: "100%" }}
        mapStyle={isDarkMode ? DARK_STYLE : LIGHT_STYLE}
        interactiveLayerIds={["countries-fill"]}
        onClick={handleMapClick}
        onMouseMove={handleMouseMove}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />

        {/* Countries layer with emissions coloring */}
        {countriesGeoJson && (
          <Source id="countries" type="geojson" data={countriesGeoJson}>
            <Layer
              id="countries-fill"
              type="fill"
              paint={{
                "fill-color": ["get", "emissionsColor"],
                "fill-opacity": [
                  "case",
                  ["==", ["get", "countryCode"], hoveredCountry],
                  0.85,
                  isDarkMode ? 0.55 : 0.65,
                ],
              }}
            />
            <Layer
              id="countries-outline"
              type="line"
              paint={{
                "line-color": isDarkMode ? "#374151" : "#ffffff",
                "line-width": [
                  "case",
                  ["==", ["get", "countryCode"], hoveredCountry],
                  2,
                  0.5,
                ],
              }}
            />
          </Source>
        )}

        {/* Clustered markers */}
        {clusters.map((cluster) => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          const properties = cluster.properties as {
            cluster?: boolean;
            point_count?: number;
            plant?: PowerPlant;
          };
          const isCluster = properties.cluster;
          const pointCount = properties.point_count;

          if (isCluster && pointCount) {
            // Cluster marker
            const size = Math.min(24 + (pointCount / points.length) * 40, 48);
            return (
              <Marker
                key={`cluster-${cluster.id}`}
                longitude={longitude}
                latitude={latitude}
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  handleClusterClick(cluster.id as number, longitude, latitude);
                }}
              >
                <div
                  className="cursor-pointer flex items-center justify-center rounded-full
                    text-white font-medium shadow-lg hover:scale-110 transition-transform"
                  style={{
                    width: size,
                    height: size,
                    fontSize: size * 0.4,
                    backgroundColor: "#0077ff",
                  }}
                >
                  {pointCount}
                </div>
              </Marker>
            );
          }

          // Individual plant marker (minimal design)
          const plant = properties.plant;
          if (!plant) return null;
          return (
            <Marker
              key={plant.id}
              longitude={longitude}
              latitude={latitude}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleMarkerClick(plant);
              }}
            >
              <Popover
                placement="top"
                showArrow
                isOpen={tooltipPlantId === plant.id}
                onOpenChange={(open) => {
                  if (!open) {
                    setTooltipPlantId(null);
                  }
                }}
                classNames={{
                  content: "p-0 border-0 shadow-xl",
                }}
              >
                <PopoverTrigger>
                  <div
                    className={`
                      cursor-pointer transition-all duration-200 hover:scale-150
                      rounded-full shadow-md
                      ${
                        selectedPlant?.id === plant.id
                          ? "scale-150 ring-2 ring-white ring-offset-1"
                          : ""
                      }
                    `}
                    style={{
                      backgroundColor: getPlantTypeColor(plant.type),
                      width: 8,
                      height: 8,
                      border: "1px solid rgba(255,255,255,0.8)",
                    }}
                    onMouseEnter={() => handlePinMouseEnter(plant.id)}
                    onMouseLeave={handlePinMouseLeave}
                  />
                </PopoverTrigger>
                <PopoverContent
                  onMouseEnter={handlePopoverMouseEnter}
                  onMouseLeave={handlePopoverMouseLeave}
                >
                  <PlantTooltipContent
                    plant={plant}
                    isDarkMode={isDarkMode}
                    onViewDetails={() => {
                      setTooltipPlantId(null);
                      handleMarkerClick(plant);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </Marker>
          );
        })}
      </Map>

      {/* Dark mode toggle - top left */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <Button
          isIconOnly
          size="sm"
          variant="flat"
          className={`rounded-xl shadow-lg backdrop-blur-sm ${
            isDarkMode
              ? "bg-gray-800/90 text-yellow-400 hover:bg-gray-700"
              : "bg-white/90 text-gray-700 hover:bg-gray-100"
          }`}
          onPress={toggleDarkMode}
          aria-label={
            isDarkMode ? "Switch to light mode" : "Switch to dark mode"
          }
        >
          {isDarkMode ? (
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
                d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
              />
            </svg>
          ) : (
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
                d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
              />
            </svg>
          )}
        </Button>
        {/* Plant count indicator */}
        <div
          className={`rounded-xl px-3 py-1.5 shadow-lg backdrop-blur-sm text-xs font-stats ${
            isDarkMode
              ? "bg-gray-800/90 text-gray-200"
              : "bg-white/90 text-gray-700"
          }`}
        >
          {filteredPlants.length} / {powerPlants.length} plants
        </div>
      </div>

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        isDarkMode={isDarkMode}
      />

      {/* Legend */}
      <div
        className={`absolute bottom-8 left-4 rounded-2xl p-4 shadow-lg backdrop-blur-sm ${
          isDarkMode
            ? "bg-gray-900/95 text-gray-100"
            : "bg-white/95 text-gray-700"
        }`}
      >
        <h4 className="font-heading text-sm font-medium mb-3">
          Carbon Intensity (gCO2/kWh)
        </h4>
        <div className="flex items-center gap-1">
          <span
            className={`font-body text-xs ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            0
          </span>
          <div className="flex h-3 rounded-full overflow-hidden">
            {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map(
              (val) => (
                <div
                  key={val}
                  className="w-5 h-full"
                  style={{ backgroundColor: getEmissionsColor(val) }}
                />
              )
            )}
          </div>
          <span
            className={`font-body text-xs ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            1000+
          </span>
        </div>

        <h4 className="font-heading text-sm font-medium mt-4 mb-2">
          Power Plants
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {(["nuclear", "hydro", "wind", "solar", "gas", "coal"] as const).map(
            (type) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full border border-white/50 shadow-sm"
                  style={{ backgroundColor: getPlantTypeColor(type) }}
                />
                <span
                  className={`font-body text-xs capitalize ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {type}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Plant details drawer */}
      <PlantDrawer
        plant={selectedPlant}
        onClose={() => setSelectedPlant(null)}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
