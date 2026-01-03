"use client";

import { Button, Chip, Progress, Divider } from "@heroui/react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { type PowerPlant, getPlantTypeColor } from "@/app/data/placeholder";

interface PlantDrawerProps {
  plant: PowerPlant | null;
  onClose: () => void;
  isDarkMode?: boolean;
}

const plantTypeLabels: Record<PowerPlant["type"], string> = {
  coal: "Coal",
  gas: "Natural Gas",
  nuclear: "Nuclear",
  hydro: "Hydroelectric",
  wind: "Wind",
  solar: "Solar",
  oil: "Oil",
};

export default function PlantDrawer({
  plant,
  onClose,
  isDarkMode = true,
}: PlantDrawerProps) {
  if (!plant) return null;

  // Prepare hourly output data for chart
  const hourlyData = plant.hourlyOutput.map((output, index) => ({
    hour: `${index}:00`,
    output,
    capacity: plant.capacity,
  }));

  // Capacity utilization
  const utilization = (plant.output / plant.capacity) * 100;

  // Energy mix data (placeholder)
  const energyMixData = [
    { name: "Current Output", value: plant.output },
    { name: "Available Capacity", value: plant.capacity - plant.output },
  ];

  const statusColor = {
    operating: "success",
    maintenance: "warning",
    offline: "danger",
  } as const;

  const bgClass = isDarkMode ? "bg-gray-900/98" : "bg-white/98";
  const textClass = isDarkMode ? "text-gray-100" : "text-gray-800";
  const mutedClass = isDarkMode ? "text-gray-400" : "text-gray-500";
  const cardClass = isDarkMode
    ? "bg-gray-800/80 border-gray-700"
    : "bg-white border-gray-200";
  const dividerClass = isDarkMode ? "bg-gray-700" : "bg-gray-200";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`
          fixed left-4 top-4 bottom-4 w-[380px] z-50
          ${bgClass} backdrop-blur-md shadow-2xl
          transform transition-transform duration-300 ease-out
          rounded-2xl overflow-hidden flex flex-col
        `}
      >
        {/* Header */}
        <div className="p-5 text-white relative overflow-hidden bg-black/20">
          <div className="absolute top-3 right-3">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              className="text-white/80 hover:text-white hover:bg-white/20"
              onPress={onClose}
              aria-label="Close drawer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          </div>

          <div className="pr-8">
            <h2 className="font-heading text-lg leading-tight">{plant.name}</h2>
            <p className="font-body text-white/80 mt-1">{plant.country}</p>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Chip
              size="sm"
              variant="flat"
              color={statusColor[plant.status]}
              className="capitalize font-body"
            >
              {plant.status}
            </Chip>
            <Chip
              size="sm"
              variant="flat"
              className="bg-white/20 text-white font-body"
            >
              {plantTypeLabels[plant.type]}
            </Chip>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-5">
          {/* Key Stats */}
          <div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p
                  className={`font-body text-xs uppercase tracking-wide ${mutedClass}`}
                >
                  Current Output
                </p>
                <p className={`font-stats text-xl ${textClass}`}>
                  {plant.output.toLocaleString()}{" "}
                  <span className="font-body text-sm">MW</span>
                </p>
              </div>
              <div>
                <p
                  className={`font-body text-xs uppercase tracking-wide ${mutedClass}`}
                >
                  Capacity
                </p>
                <p className={`font-stats text-xl ${textClass}`}>
                  {plant.capacity.toLocaleString()}{" "}
                  <span className="font-body text-sm">MW</span>
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className={`font-body text-xs ${mutedClass}`}>
                  Capacity Utilization
                </span>
                <span className={`font-stats text-sm ${textClass}`}>
                  {utilization.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={utilization}
                color={
                  utilization > 80
                    ? "success"
                    : utilization > 50
                    ? "primary"
                    : "warning"
                }
                className="h-2"
              />
            </div>
          </div>

          <Divider className={dividerClass} />

          {/* 24h Output Chart */}
          <div>
            <h3 className={`font-heading text-sm mb-3 ${textClass}`}>
              24-Hour Output
            </h3>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={hourlyData}
                  margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="outputGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={getPlantTypeColor(plant.type)}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor={getPlantTypeColor(plant.type)}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDarkMode ? "#374151" : "#e5e7eb"}
                  />
                  <XAxis
                    dataKey="hour"
                    tick={{
                      fontSize: 10,
                      fill: isDarkMode ? "#9ca3af" : "#6b7280",
                    }}
                    tickLine={false}
                    interval={5}
                    axisLine={{ stroke: isDarkMode ? "#374151" : "#e5e7eb" }}
                  />
                  <YAxis
                    tick={{
                      fontSize: 10,
                      fill: isDarkMode ? "#9ca3af" : "#6b7280",
                    }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                      color: isDarkMode ? "#f3f4f6" : "#1f2937",
                    }}
                    formatter={(value) => [
                      `${Number(value).toLocaleString()} MW`,
                      "Output",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="output"
                    stroke={getPlantTypeColor(plant.type)}
                    strokeWidth={2}
                    fill="url(#outputGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <Divider className={dividerClass} />

          {/* Emissions */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`font-body text-xs uppercase tracking-wide ${mutedClass}`}
                >
                  Carbon Intensity
                </p>
                <p className={`font-stats text-xl ${textClass}`}>
                  {plant.emissions}{" "}
                  <span className="font-body text-sm">gCO2/kWh</span>
                </p>
              </div>
              <div
                className={`
                  px-3 py-1 rounded-full font-body text-xs
                  ${
                    plant.emissions <= 50
                      ? "bg-green-500/20 text-green-400"
                      : ""
                  }
                  ${
                    plant.emissions > 50 && plant.emissions <= 200
                      ? "bg-lime-500/20 text-lime-400"
                      : ""
                  }
                  ${
                    plant.emissions > 200 && plant.emissions <= 500
                      ? "bg-yellow-500/20 text-yellow-400"
                      : ""
                  }
                  ${
                    plant.emissions > 500
                      ? "bg-orange-500/20 text-orange-400"
                      : ""
                  }
                `}
              >
                {plant.emissions <= 50 && "Very Low"}
                {plant.emissions > 50 && plant.emissions <= 200 && "Low"}
                {plant.emissions > 200 && plant.emissions <= 500 && "Medium"}
                {plant.emissions > 500 && "High"}
              </div>
            </div>
          </div>

          <Divider className={dividerClass} />

          {/* Capacity Pie Chart */}
          <div>
            <h3 className={`font-heading text-sm mb-2 ${textClass}`}>
              Capacity Usage
            </h3>
            <div className="h-[120px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={energyMixData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={48}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    <Cell fill={getPlantTypeColor(plant.type)} />
                    <Cell fill={isDarkMode ? "#374151" : "#e5e7eb"} />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                      color: isDarkMode ? "#f3f4f6" : "#1f2937",
                    }}
                    formatter={(value) => [
                      `${Number(value).toLocaleString()} MW`,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <Divider className={dividerClass} />

          {/* Details */}
          <div>
            <h3 className={`font-heading text-sm mb-3 ${textClass}`}>
              Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={`font-body text-sm ${mutedClass}`}>Owner</span>
                <span className={`font-stats text-sm ${textClass}`}>
                  {plant.owner}
                </span>
              </div>
              <Divider className={dividerClass} />
              <div className="flex justify-between">
                <span className={`font-body text-sm ${mutedClass}`}>
                  Construction Year
                </span>
                <span className={`font-stats text-sm ${textClass}`}>
                  {plant.constructionYear}
                </span>
              </div>
              <Divider className={dividerClass} />
              <div className="flex justify-between">
                <span className={`font-body text-sm ${mutedClass}`}>
                  Location
                </span>
                <span className={`font-stats text-sm ${textClass}`}>
                  {plant.latitude.toFixed(4)}°, {plant.longitude.toFixed(4)}°
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
