"use client";

import React, { useMemo } from "react";
import { artworkSchemaConfig } from "@/components/pages/manager/config/artworkSchemaConfig";
import ManagerStructureLayout from "@/components/pages/manager/layouts/ManagerStructureLayout";

export default function ArtworkManagerPage() {
  const managerSchemaConfig = useMemo(() => {
    return {
      ...artworkSchemaConfig,
      dataConfig: {
        ...artworkSchemaConfig.dataConfig,
        defaultSort: { field: "order.artist_page_order", direction: "asc", orderKey: "artist_page_order" },
        // Shortcut to the dedicated drag-and-drop order page.
        orderPagePath: "/manager/artwork/order",
        groupConfig: {
          enabled: true,
          field: "artist",
          applyTo: ["grid", "list"],
          sortGroups: true,
          emptyLabel: "Ungrouped",
        },
      },
    };
  }, []);

  return <ManagerStructureLayout managerSchemaConfig={managerSchemaConfig} />;
}