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
import { Button } from "@heroui/react";
import {
  powerPlants,
  countryEmissions,
  getEmissionsColor,
  getPlantTypeColor,
  type PowerPlant,
} from "@/app/data/placeholder";
import PlantDrawer from "./PlantDrawer";

const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export default function MapView() {
  const mapRef = useRef<MapRef>(null);
  const [selectedPlant, setSelectedPlant] = useState<PowerPlant | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [countriesGeoJson, setCountriesGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode
  const [viewState, setViewState] = useState({
    longitude: 10,
    latitude: 45,
    zoom: 3,
  });
  const [bounds, setBounds] = useState<[number, number, number, number] | undefined>(undefined);

  // Prepare points for clustering
  const points = useMemo(() => {
    return powerPlants.map((plant) => ({
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
  }, []);

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
    fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson")
      .then((res) => res.json())
      .then((data: GeoJSON.FeatureCollection) => {
        // Pastel colors for emissions scale
        const pastelColors = [
          "#b8e6c0", // Light pastel green (very low)
          "#c8e6b0", // Pastel green (low)
          "#d8e6a0", // Yellow-green
          "#e8e690", // Pastel yellow
          "#f5e6a8", // Light yellow
          "#f0d890", // Pastel orange-yellow
          "#e8c8a0", // Light orange
          "#dca870", // Light brown
          "#c49870", // Medium brown
          "#b08060", // Brown
        ];

        // Simple hash function to get consistent random index per country
        const hashString = (str: string): number => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          return Math.abs(hash);
        };

        // Add emissions data to each country feature
        const featuresWithEmissions = data.features.map((feature) => {
          // GeoJSON uses "ISO3166-1-Alpha-3" for country code
          const countryCode = feature.properties?.["ISO3166-1-Alpha-3"];
          const countryName = feature.properties?.name || "";
          const emissionsData = countryEmissions.find((c) => c.countryCode === countryCode);

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
      const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(clusterId), 14);
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
      setHoveredCountry(features[0].properties?.countryCode || features[0].properties?.["ISO3166-1-Alpha-3"]);
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
          const properties = cluster.properties as { cluster?: boolean; point_count?: number; plant?: PowerPlant };
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
                    bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium
                    shadow-lg border-2 border-white/30 hover:scale-110 transition-transform"
                  style={{ width: size, height: size, fontSize: size * 0.4 }}
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
              <div
                className={`
                  cursor-pointer transition-all duration-200 hover:scale-150
                  rounded-full shadow-md
                  ${selectedPlant?.id === plant.id ? "scale-150 ring-2 ring-white ring-offset-1" : ""}
                `}
                style={{
                  backgroundColor: getPlantTypeColor(plant.type),
                  width: 10,
                  height: 10,
                  border: "2px solid rgba(255,255,255,0.8)",
                }}
                title={plant.name}
              />
            </Marker>
          );
        })}
      </Map>

      {/* Dark mode toggle - top left */}
      <div className="absolute top-4 left-4 z-10">
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
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          )}
        </Button>
      </div>

      {/* Legend */}
      <div className={`absolute bottom-8 left-4 rounded-2xl p-4 shadow-lg backdrop-blur-sm ${
        isDarkMode ? "bg-gray-900/95 text-gray-100" : "bg-white/95 text-gray-700"
      }`}>
        <h4 className="font-heading text-sm font-medium mb-3">
          Carbon Intensity (gCO2/kWh)
        </h4>
        <div className="flex items-center gap-1">
          <span className={`font-body text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>0</span>
          <div className="flex h-3 rounded-full overflow-hidden">
            {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((val) => (
              <div
                key={val}
                className="w-5 h-full"
                style={{ backgroundColor: getEmissionsColor(val) }}
              />
            ))}
          </div>
          <span className={`font-body text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>1000+</span>
        </div>

        <h4 className="font-heading text-sm font-medium mt-4 mb-2">Power Plants</h4>
        <div className="grid grid-cols-2 gap-2">
          {(["nuclear", "hydro", "wind", "solar", "gas", "coal"] as const).map((type) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full border border-white/50 shadow-sm"
                style={{ backgroundColor: getPlantTypeColor(type) }}
              />
              <span className={`font-body text-xs capitalize ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                {type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Plant details drawer */}
      <PlantDrawer plant={selectedPlant} onClose={() => setSelectedPlant(null)} isDarkMode={isDarkMode} />
    </div>
  );
}
