"use client";

import { useState } from "react";
import { Settings2, Users, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfigGeneral } from "./config-general";
import { ConfigTeam } from "./config-team";
import { ConfigParams } from "./config-params";

export function ConfiguracionClient({ 
  project, 
  projectId,
  members,
  orgMembers,
  venta
}: { 
  project: any; 
  projectId: string;
  members: any[];
  orgMembers: any[];
  venta: any;
}) {
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "General", icon: Settings2 },
    { id: "equipo", label: "Equipo", icon: Users },
    { id: "parametros", label: "Parámetros", icon: Sliders },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-slate-200 bg-white px-8">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
        {activeTab === "general" && <ConfigGeneral project={project} projectId={projectId} />}
        {activeTab === "equipo" && (
          <ConfigTeam 
            projectId={projectId} 
            members={members} 
            orgMembers={orgMembers} 
          />
        )}
        {activeTab === "parametros" && (
          <ConfigParams 
            projectId={projectId} 
            project={project}
            venta={venta}
          />
        )}
      </div>
    </div>
  );
}
