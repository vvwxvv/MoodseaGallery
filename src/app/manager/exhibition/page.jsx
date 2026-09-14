"use client";

import React, { useMemo } from "react";
import { exhibitionSchemaConfig } from "@/components/pages/manager/config/exhibitionSchemaConfig";
import ManagerStructureLayout from "@/components/pages/manager/layouts/ManagerStructureLayout";

export default function ExhibitionManagerPage() {
  const managerSchemaConfig = useMemo(() => {
    return {
      ...exhibitionSchemaConfig,
      dataConfig: {
        ...exhibitionSchemaConfig.dataConfig,
        // Order every exhibition by YEAR, current → past (newest first).
        defaultSort: { field: "year", direction: "desc" },
        groupConfig: {
          enabled: true,
          field: "year",
          applyTo: ["grid", "list"],
          // Year boxes run newest → oldest (current → past); Ungrouped last.
          sortGroups: "desc",
          emptyLabel: "Ungrouped",
        },
      },
    };
  }, []);

  return <ManagerStructureLayout managerSchemaConfig={managerSchemaConfig} />;
}
